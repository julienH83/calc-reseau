"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/shared/CopyButton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ShareButton } from "@/components/shared/ShareButton";
import { isValidDottedIPv4, isValidCIDR } from "@/lib/ip/validate";
import { parseDottedIPv4, parseCIDR } from "@/lib/ip/parse";
import {
  rangeToCidrs,
  ipDistance,
  longestCommonPrefixLength,
  commonNetwork,
  isInNetwork,
  rangeText,
  totalAddresses,
} from "@/lib/ip/extras";
import { toDotted } from "@/lib/ip/format";
import { useHashParam } from "@/hooks/useUrlState";
import { sanitizeIPInput } from "@/hooks/useAutoFormatIP";
import { cn } from "@/lib/utils";

export function ToolsTab() {
  return (
    <div className="space-y-4">
      <RangeToCidrCard />
      <IpInNetworkCard />
      <DistanceCard />
      <CommonPrefixCard />
    </div>
  );
}

function RangeToCidrCard() {
  const [startParam, setStartParam] = useHashParam("rs");
  const [endParam, setEndParam] = useHashParam("re");
  const [startIp, setStartIp] = React.useState(startParam || "192.168.1.10");
  const [endIp, setEndIp] = React.useState(endParam || "192.168.1.50");

  React.useEffect(() => {
    if (startParam && startParam !== startIp) setStartIp(startParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startParam]);
  React.useEffect(() => {
    if (endParam && endParam !== endIp) setEndIp(endParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endParam]);

  const result = React.useMemo(() => {
    const a = startIp.trim();
    const b = endIp.trim();
    if (!a || !b) return null;
    if (!isValidDottedIPv4(a) || !isValidDottedIPv4(b)) {
      return { ok: false as const, error: "Saisis deux IPv4 valides (ex: 192.168.1.10)." };
    }
    const sa = parseDottedIPv4(a);
    const sb = parseDottedIPv4(b);
    if ((sa >>> 0) > (sb >>> 0)) {
      return { ok: false as const, error: "L'IP de début doit être ≤ à l'IP de fin." };
    }
    try {
      return {
        ok: true as const,
        cidrs: rangeToCidrs(sa, sb),
        total: ((sb >>> 0) - (sa >>> 0) + 1),
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erreur" };
    }
  }, [startIp, endIp]);

  React.useEffect(() => {
    if (!result?.ok) return;
    const handle = setTimeout(() => {
      setStartParam(startIp.trim());
      setEndParam(endIp.trim());
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startIp, endIp, result?.ok]);

  const cidrLines = result?.ok
    ? result.cidrs.map((b) => `${toDotted(b.network)}/${b.prefix}`).join("\n")
    : "";

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>Plage d'IP → liste CIDR</CardTitle>
          <CardDescription>
            Découpe minimale d'une plage en blocs CIDR alignés. Pratique pour les ACL et les
            règles firewall.
          </CardDescription>
        </div>
        {result?.ok && (
          <ShareButton tab="tools" params={{ rs: startIp.trim(), re: endIp.trim() }} />
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="range-start">IP de début</Label>
            <Input
              id="range-start"
              value={startIp}
              onChange={(e) => setStartIp(sanitizeIPInput(e.target.value))}
              placeholder="192.168.1.10"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="range-end">IP de fin</Label>
            <Input
              id="range-end"
              value={endIp}
              onChange={(e) => setEndIp(sanitizeIPInput(e.target.value))}
              placeholder="192.168.1.50"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
        </div>
        {result && !result.ok && <ErrorMessage message={result.error} />}
        {result?.ok && (
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              {result.cidrs.length} bloc{result.cidrs.length > 1 ? "s" : ""} CIDR couvre
              {result.cidrs.length > 1 ? "nt" : ""} exactement{" "}
              <span className="font-mono-tabular text-foreground">
                {result.total.toLocaleString("fr-FR")}
              </span>{" "}
              adresses.
            </div>
            <div className="space-y-1.5 rounded-md border bg-muted/30 p-3">
              {result.cidrs.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 font-mono-tabular text-sm"
                >
                  <span className="grow">
                    {toDotted(b.network)}/{b.prefix}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {totalAddresses(b.prefix).toLocaleString("fr-FR")} adresses
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <CopyButton value={cidrLines} label="la liste CIDR" size="sm" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IpInNetworkCard() {
  const [ipInput, setIpInput] = React.useState("192.168.1.42");
  const [cidrInput, setCidrInput] = React.useState("192.168.1.0/24");

  const result = React.useMemo(() => {
    const ipT = ipInput.trim();
    const cT = cidrInput.trim();
    if (!ipT || !cT) return null;
    if (!isValidDottedIPv4(ipT)) {
      return { ok: false as const, error: "IP invalide." };
    }
    if (!isValidCIDR(cT)) {
      return { ok: false as const, error: "Notation CIDR attendue (ex: 192.168.1.0/24)." };
    }
    const ip = parseDottedIPv4(ipT);
    const { ip: net, prefix } = parseCIDR(cT);
    return {
      ok: true as const,
      inside: isInNetwork(ip, net, prefix),
      net,
      prefix,
    };
  }, [ipInput, cidrInput]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Une IP est-elle dans un réseau ?</CardTitle>
        <CardDescription>Vérification simple, utile en debug.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="iin-ip">IP à tester</Label>
            <Input
              id="iin-ip"
              value={ipInput}
              onChange={(e) => setIpInput(sanitizeIPInput(e.target.value))}
              placeholder="192.168.1.42"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iin-cidr">Réseau</Label>
            <Input
              id="iin-cidr"
              value={cidrInput}
              onChange={(e) => setCidrInput(e.target.value)}
              placeholder="192.168.1.0/24"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
        </div>
        {result && !result.ok && <ErrorMessage message={result.error} />}
        {result?.ok && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-md border p-4 font-medium",
              result.inside
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-rose-500/40 bg-rose-500/10 text-rose-200",
            )}
          >
            <span className="text-2xl">{result.inside ? "✓" : "✗"}</span>
            <div className="text-sm">
              {result.inside ? (
                <>
                  <span className="font-mono-tabular">{ipInput.trim()}</span> appartient à{" "}
                  <span className="font-mono-tabular">{cidrInput.trim()}</span>
                  <div className="mt-0.5 text-xs opacity-80">
                    Plage : {rangeText(result.net, result.prefix)}
                  </div>
                </>
              ) : (
                <>
                  <span className="font-mono-tabular">{ipInput.trim()}</span> n'appartient pas à{" "}
                  <span className="font-mono-tabular">{cidrInput.trim()}</span>
                  <div className="mt-0.5 text-xs opacity-80">
                    Plage testée : {rangeText(result.net, result.prefix)}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DistanceCard() {
  const [a, setA] = React.useState("192.168.1.10");
  const [b, setB] = React.useState("192.168.5.20");

  const result = React.useMemo(() => {
    const at = a.trim();
    const bt = b.trim();
    if (!at || !bt) return null;
    if (!isValidDottedIPv4(at) || !isValidDottedIPv4(bt)) {
      return { ok: false as const, error: "Saisis deux IPv4 valides." };
    }
    return {
      ok: true as const,
      distance: ipDistance(parseDottedIPv4(at), parseDottedIPv4(bt)),
    };
  }, [a, b]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distance entre deux IP</CardTitle>
        <CardDescription>Nombre d'adresses entre A et B (valeur absolue).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dist-a">IP A</Label>
            <Input
              id="dist-a"
              value={a}
              onChange={(e) => setA(sanitizeIPInput(e.target.value))}
              placeholder="192.168.1.10"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dist-b">IP B</Label>
            <Input
              id="dist-b"
              value={b}
              onChange={(e) => setB(sanitizeIPInput(e.target.value))}
              placeholder="192.168.5.20"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
        </div>
        {result && !result.ok && <ErrorMessage message={result.error} />}
        {result?.ok && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-sm text-muted-foreground">Distance</div>
            <div className="font-mono-tabular text-2xl">
              {result.distance.toLocaleString("fr-FR")}
            </div>
            <div className="text-xs text-muted-foreground">adresses</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CommonPrefixCard() {
  const [a, setA] = React.useState("192.168.1.0");
  const [b, setB] = React.useState("192.168.1.128");

  const result = React.useMemo(() => {
    const at = a.trim();
    const bt = b.trim();
    if (!at || !bt) return null;
    if (!isValidDottedIPv4(at) || !isValidDottedIPv4(bt)) {
      return { ok: false as const, error: "Saisis deux IPv4 valides." };
    }
    const ipa = parseDottedIPv4(at);
    const ipb = parseDottedIPv4(bt);
    return {
      ok: true as const,
      prefix: longestCommonPrefixLength(ipa, ipb),
      common: commonNetwork(ipa, ipb),
    };
  }, [a, b]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plus long préfixe commun</CardTitle>
        <CardDescription>
          Le plus petit réseau qui contient à la fois A et B (utile pour le route summarization).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cp-a">IP A</Label>
            <Input
              id="cp-a"
              value={a}
              onChange={(e) => setA(sanitizeIPInput(e.target.value))}
              placeholder="192.168.1.0"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-b">IP B</Label>
            <Input
              id="cp-b"
              value={b}
              onChange={(e) => setB(sanitizeIPInput(e.target.value))}
              placeholder="192.168.1.128"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
        </div>
        {result && !result.ok && <ErrorMessage message={result.error} />}
        {result?.ok && (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Préfixe commun
                </div>
                <div className="font-mono-tabular text-lg">/{result.prefix}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  Réseau couvrant
                </div>
                <div className="font-mono-tabular text-lg">
                  {toDotted(result.common.network)}/{result.common.prefix}
                </div>
              </div>
              <CopyButton
                value={`${toDotted(result.common.network)}/${result.common.prefix}`}
                label="le réseau commun"
              />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Plage : {rangeText(result.common.network, result.common.prefix)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
