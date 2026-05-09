"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResultRow } from "@/components/shared/ResultRow";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { TypeBadge } from "@/components/shared/TypeBadge";
import { BinaryView } from "@/components/shared/BinaryView";
import { ShareButton } from "@/components/shared/ShareButton";
import { CopyButton } from "@/components/shared/CopyButton";
import { HistoryDropdown, usePushHistory } from "@/components/shared/HistoryDropdown";
import { isValidDottedIPv4, isValidMask } from "@/lib/ip/validate";
import { parseDottedIPv4, parseMask } from "@/lib/ip/parse";
import { analyze } from "@/lib/ip/analyze";
import { toDotted } from "@/lib/ip/format";
import {
  toHex,
  toHexOctets,
  toUint32,
  toReversePtr,
  wildcardMask,
  toIPv4MappedIPv6,
  previousNetwork,
  nextNetwork,
  defaultClassfulMask,
  dhcpScopeSuggestion,
  ciscoAclLine,
  usableHostsRfc3021,
  totalAddresses,
} from "@/lib/ip/extras";
import { useHashParam } from "@/hooks/useUrlState";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { sanitizeIPInput } from "@/hooks/useAutoFormatIP";
import { cn } from "@/lib/utils";

const HISTORY_KEY = "calc-reseau:history:analyze";

export function AnalyzerTab() {
  const [ipParam, setIpParam] = useHashParam("ip");
  const [maskParam, setMaskParam] = useHashParam("mask");
  const [ipInput, setIpInput] = React.useState(ipParam || "192.168.1.10");
  const [maskInput, setMaskInput] = React.useState(maskParam || "/24");
  const [rfc3021, setRfc3021] = useLocalStorage("calc-reseau:rfc3021", false);

  React.useEffect(() => {
    if (ipParam && ipParam !== ipInput) setIpInput(ipParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipParam]);
  React.useEffect(() => {
    if (maskParam && maskParam !== maskInput) setMaskInput(maskParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maskParam]);

  const pushHistory = usePushHistory(HISTORY_KEY);

  const result = React.useMemo(() => {
    const ipTrim = ipInput.trim();
    const maskTrim = maskInput.trim();
    if (ipTrim === "" || maskTrim === "") return null;
    if (!isValidDottedIPv4(ipTrim)) {
      return { ok: false as const, error: "IP invalide. Exemple : 192.168.1.10" };
    }
    if (!isValidMask(maskTrim)) {
      return {
        ok: false as const,
        error: "Masque invalide. Formats acceptés : /24, 24, ou 255.255.255.0",
      };
    }
    try {
      const ip = parseDottedIPv4(ipTrim);
      const prefix = parseMask(maskTrim);
      return { ok: true as const, info: analyze(ip, prefix) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erreur inconnue" };
    }
  }, [ipInput, maskInput]);

  React.useEffect(() => {
    if (!result?.ok) return;
    const handle = setTimeout(() => {
      setIpParam(ipInput.trim());
      setMaskParam(maskInput.trim());
      pushHistory(`${ipInput.trim()} ${maskInput.trim()}`, {
        ip: ipInput.trim(),
        mask: maskInput.trim(),
      });
    }, 500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipInput, maskInput, result?.ok]);

  const handleHistorySelect = React.useCallback((payload: Record<string, string>) => {
    if (payload.ip) setIpInput(payload.ip);
    if (payload.mask) setMaskInput(payload.mask);
  }, []);

  const jumpTo = React.useCallback((network: number, prefix: number) => {
    setIpInput(toDotted(network));
    setMaskInput(`/${prefix}`);
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Analyser un réseau</CardTitle>
            <CardDescription>
              Saisis une IPv4 et un masque. Calculs en direct.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <HistoryDropdown storageKey={HISTORY_KEY} onSelect={handleHistorySelect} />
            {result?.ok && (
              <ShareButton tab="analyze" params={{ ip: ipInput.trim(), mask: maskInput.trim() }} />
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <div className="space-y-2">
              <Label htmlFor="analyze-ip">IP</Label>
              <Input
                id="analyze-ip"
                value={ipInput}
                onChange={(e) => setIpInput(sanitizeIPInput(e.target.value))}
                placeholder="192.168.1.10"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                className="font-mono-tabular"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="analyze-mask">Masque</Label>
              <Input
                id="analyze-mask"
                value={maskInput}
                onChange={(e) => setMaskInput(e.target.value)}
                placeholder="/24 ou 255.255.255.0"
                autoComplete="off"
                spellCheck={false}
                className="font-mono-tabular"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={rfc3021}
              onChange={(e) => setRfc3021(e.target.checked)}
              className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-2 focus:ring-ring"
            />
            <span>
              Mode RFC 3021 — /31 = 2 hôtes utilisables (liens point-à-point), /32 = 1 (host route)
            </span>
          </label>
          {result && !result.ok && <ErrorMessage message={result.error} />}
        </CardContent>
      </Card>

      {result?.ok && (
        <ResultBlocks info={result.info} rfc3021={rfc3021} jumpTo={jumpTo} />
      )}
    </div>
  );
}

function ResultBlocks({
  info,
  rfc3021,
  jumpTo,
}: {
  info: ReturnType<typeof analyze>;
  rfc3021: boolean;
  jumpTo: (network: number, prefix: number) => void;
}) {
  const usable = rfc3021 ? usableHostsRfc3021(info.prefix) : info.usableHosts;
  const total = totalAddresses(info.prefix);
  const prev = previousNetwork(info.network, info.prefix);
  const next = nextNetwork(info.network, info.prefix);
  const classful = defaultClassfulMask(info.ip);
  const dhcp = dhcpScopeSuggestion(info.network, info.prefix);
  const acl = ciscoAclLine(info.network, info.prefix);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Résultat</CardTitle>
        </CardHeader>
        <CardContent>
          <ResultRow label="Adresse réseau" value={toDotted(info.network)} copy={toDotted(info.network)} />
          <ResultRow label="Broadcast" value={toDotted(info.broadcast)} copy={toDotted(info.broadcast)} />
          <ResultRow
            label="Première IP"
            value={info.firstHost !== null || rfc3021 ? toDotted(rfc3021 && info.prefix === 31 ? info.network : info.firstHost ?? info.network) : "—"}
            copy={info.firstHost !== null ? toDotted(info.firstHost) : rfc3021 && info.prefix === 31 ? toDotted(info.network) : ""}
          />
          <ResultRow
            label="Dernière IP"
            value={info.lastHost !== null || rfc3021 ? toDotted(rfc3021 && info.prefix === 31 ? info.broadcast : info.lastHost ?? info.broadcast) : "—"}
            copy={info.lastHost !== null ? toDotted(info.lastHost) : rfc3021 && info.prefix === 31 ? toDotted(info.broadcast) : ""}
          />
          <ResultRow
            label="Hôtes utilisables"
            value={
              <span>
                {usable.toLocaleString("fr-FR")}{" "}
                <span className="text-xs text-muted-foreground">
                  / {total.toLocaleString("fr-FR")} adresses
                </span>
              </span>
            }
            mono={false}
          />
          <ResultRow
            label="Masque"
            value={
              <span>
                {toDotted(info.mask)}{" "}
                <span className="text-muted-foreground">(/{info.prefix})</span>
              </span>
            }
            copy={`${toDotted(info.mask)} (/${info.prefix})`}
          />
          <ResultRow
            label="Wildcard (ACL)"
            value={toDotted(wildcardMask(info.prefix))}
            copy={toDotted(wildcardMask(info.prefix))}
          />
          <ResultRow
            label="Classe"
            value={
              <span>
                {info.ipClass}
                {classful && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    (masque par défaut : /{classful.prefix})
                  </span>
                )}
              </span>
            }
            mono={false}
          />
          <ResultRow label="Type" value={<TypeBadge type={info.type} />} mono={false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Représentations</CardTitle>
          <CardDescription>Conversions utiles pour la doc, les exports ou l'interop.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResultRow label="Hex (groupé)" value={toHex(info.ip)} copy={toHex(info.ip)} />
          <ResultRow label="Hex (par octet)" value={toHexOctets(info.ip)} copy={toHexOctets(info.ip)} />
          <ResultRow label="Entier (uint32)" value={toUint32(info.ip)} copy={toUint32(info.ip)} />
          <ResultRow
            label="IPv4-mapped IPv6"
            value={toIPv4MappedIPv6(info.ip)}
            copy={toIPv4MappedIPv6(info.ip)}
          />
          <ResultRow
            label="Zone PTR"
            value={toReversePtr(info.network, info.prefix)}
            copy={toReversePtr(info.network, info.prefix)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voisins</CardTitle>
          <CardDescription>
            Réseaux adjacents au même préfixe — clique pour les analyser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <NeighborButton
              direction="prev"
              label="Réseau précédent"
              network={prev}
            onJump={jumpTo}
            />
            <NeighborButton
              direction="next"
              label="Réseau suivant"
              network={next}
              onJump={jumpTo}
            />
          </div>
        </CardContent>
      </Card>

      {dhcp && (
        <Card>
          <CardHeader>
            <CardTitle>Suggestion de plages DHCP</CardTitle>
            <CardDescription>
              Découpage suggéré : 20 % statiques · 60 % DHCP · 20 % réservations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DhcpRangeRow
              label="Statiques (serveurs, gateway)"
              from={dhcp.staticRange.from}
              to={dhcp.staticRange.to}
              color="bg-sky-500"
            />
            <DhcpRangeRow
              label="DHCP dynamique"
              from={dhcp.dhcpRange.from}
              to={dhcp.dhcpRange.to}
              color="bg-emerald-500"
            />
            <DhcpRangeRow
              label="Réservations"
              from={dhcp.reservedRange.from}
              to={dhcp.reservedRange.to}
              color="bg-amber-500"
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Snippet ACL Cisco</CardTitle>
          <CardDescription>
            Ligne prête à coller dans une access-list IOS (utilise le wildcard).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3">
            <code className="grow break-all font-mono-tabular text-sm">{acl}</code>
            <CopyButton value={acl} label="ACL" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Représentation binaire de l'IP</CardTitle>
          <CardDescription>
            Les bits réseau sont colorés différemment des bits hôte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BinaryView ip={info.ip} prefix={info.prefix} />
        </CardContent>
      </Card>
    </>
  );
}

function NeighborButton({
  direction,
  label,
  network,
  onJump,
}: {
  direction: "prev" | "next";
  label: string;
  network: { network: number; prefix: number } | null;
  onJump: (network: number, prefix: number) => void;
}) {
  if (!network) {
    return (
      <div className="flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-3 text-sm text-muted-foreground">
        {direction === "prev" ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
        <span>
          {label} : <span className="italic">aucun (limite atteinte)</span>
        </span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onJump(network.network, network.prefix)}
      className="group flex items-center gap-3 rounded-md border bg-muted/20 px-3 py-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
    >
      {direction === "prev" ? (
        <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
      )}
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-mono-tabular text-sm">
          {toDotted(network.network)}/{network.prefix}
        </div>
      </div>
    </button>
  );
}

function DhcpRangeRow({
  label,
  from,
  to,
  color,
}: {
  label: string;
  from: number;
  to: number;
  color: string;
}) {
  const range = `${toDotted(from)} — ${toDotted(to)}`;
  const count = ((to >>> 0) - (from >>> 0) + 1).toLocaleString("fr-FR");
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-b-0">
      <span className={cn("h-3 w-3 shrink-0 rounded-sm", color)} />
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="font-mono-tabular text-sm">{range}</div>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{count} adresses</span>
      <CopyButton value={range} label={label} silent />
    </div>
  );
}
