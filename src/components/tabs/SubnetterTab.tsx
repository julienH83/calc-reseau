"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tabs as ModeTabs,
  TabsList as ModeTabsList,
  TabsTrigger as ModeTabsTrigger,
  TabsContent as ModeTabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ShareButton } from "@/components/shared/ShareButton";
import { AllocationBar } from "@/components/shared/AllocationBar";
import { isValidCIDR } from "@/lib/ip/validate";
import { parseCIDR } from "@/lib/ip/parse";
import {
  splitByHostCount,
  splitIntoN,
  vlsm,
  type VlsmSubnet,
} from "@/lib/ip/subnet";
import { networkAddress } from "@/lib/ip/analyze";
import type { Subnet } from "@/lib/ip/types";
import { toDotted } from "@/lib/ip/format";
import { downloadCsv, subnetsToCsv } from "@/lib/ip/csv";
import { useToast } from "@/hooks/useToast";
import { useHashParam } from "@/hooks/useUrlState";

type Mode = "n" | "hosts" | "vlsm";

export function SubnetterTab() {
  const [cidrParam, setCidrParam] = useHashParam("net");
  const [modeParam, setModeParam] = useHashParam("mode");
  const [argParam, setArgParam] = useHashParam("v");

  const [cidrInput, setCidrInput] = React.useState(cidrParam || "192.168.1.0/24");
  const [mode, setMode] = React.useState<Mode>((modeParam as Mode) || "n");
  const [nSubnets, setNSubnets] = React.useState(mode === "n" && argParam ? argParam : "4");
  const [hostsPerSubnet, setHostsPerSubnet] = React.useState(
    mode === "hosts" && argParam ? argParam : "50",
  );
  const [vlsmInput, setVlsmInput] = React.useState(
    mode === "vlsm" && argParam ? argParam : "50, 25, 10, 2",
  );

  // Sync depuis URL si cidrParam change
  React.useEffect(() => {
    if (cidrParam && cidrParam !== cidrInput) setCidrInput(cidrParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidrParam]);

  const { show } = useToast();

  const parsedParent = React.useMemo(() => {
    const trimmed = cidrInput.trim();
    if (!trimmed) return null;
    if (!isValidCIDR(trimmed)) {
      return { ok: false as const, error: "Notation CIDR attendue. Exemple : 192.168.1.0/24" };
    }
    try {
      return { ok: true as const, ...parseCIDR(trimmed) };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erreur" };
    }
  }, [cidrInput]);

  const result = React.useMemo<
    | null
    | { ok: false; error: string }
    | { ok: true; subnets: Subnet[] | VlsmSubnet[]; mode: Mode }
  >(() => {
    if (!parsedParent) return null;
    if (!parsedParent.ok) return { ok: false, error: parsedParent.error };
    try {
      if (mode === "n") {
        const n = Number(nSubnets);
        if (!Number.isInteger(n) || n < 1) {
          return { ok: false, error: "Saisis un nombre entier ≥ 1." };
        }
        return { ok: true, subnets: splitIntoN(parsedParent.ip, parsedParent.prefix, n), mode };
      }
      if (mode === "hosts") {
        const h = Number(hostsPerSubnet);
        if (!Number.isInteger(h) || h < 1) {
          return { ok: false, error: "Saisis un nombre entier ≥ 1." };
        }
        return {
          ok: true,
          subnets: splitByHostCount(parsedParent.ip, parsedParent.prefix, h),
          mode,
        };
      }
      const reqs = vlsmInput
        .split(/[,\s;]+/)
        .map((s) => s.trim())
        .filter((s) => s !== "")
        .map(Number);
      if (reqs.length === 0) {
        return { ok: false, error: "Saisis au moins un besoin (séparés par virgules ou espaces)." };
      }
      if (reqs.some((n) => !Number.isInteger(n) || n < 1)) {
        return { ok: false, error: "Chaque besoin doit être un entier ≥ 1." };
      }
      return {
        ok: true,
        subnets: vlsm(parsedParent.ip, parsedParent.prefix, reqs),
        mode,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
    }
  }, [parsedParent, mode, nSubnets, hostsPerSubnet, vlsmInput]);

  // Sync URL avec les paramètres courants.
  React.useEffect(() => {
    if (!result?.ok) return;
    const handle = setTimeout(() => {
      setCidrParam(cidrInput.trim());
      setModeParam(mode);
      setArgParam(mode === "n" ? nSubnets : mode === "hosts" ? hostsPerSubnet : vlsmInput);
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidrInput, mode, nSubnets, hostsPerSubnet, vlsmInput, result?.ok]);

  const handleExport = React.useCallback(() => {
    if (!result || !result.ok) return;
    const csv = subnetsToCsv(result.subnets);
    const filename = `decoupage-${parsedParent?.ok ? toDotted(parsedParent.ip) + "-" + parsedParent.prefix : "reseau"}.csv`;
    downloadCsv(filename, csv);
    show("CSV téléchargé", "success");
  }, [result, parsedParent, show]);

  const isVlsmRow = (s: Subnet | VlsmSubnet): s is VlsmSubnet => "requestedHosts" in s;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Découper un réseau</CardTitle>
            <CardDescription>
              Choisis un mode de découpage. Le plan d'adressage est recalculé en direct.
            </CardDescription>
          </div>
          {result?.ok && (
            <ShareButton
              tab="subnet"
              params={{
                net: cidrInput.trim(),
                mode,
                v: mode === "n" ? nSubnets : mode === "hosts" ? hostsPerSubnet : vlsmInput,
              }}
            />
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subnet-cidr">Réseau de départ</Label>
            <Input
              id="subnet-cidr"
              value={cidrInput}
              onChange={(e) => setCidrInput(e.target.value)}
              placeholder="192.168.1.0/24"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>

          <ModeTabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <ModeTabsList className="w-full">
              <ModeTabsTrigger value="n" className="grow">
                N sous-réseaux
              </ModeTabsTrigger>
              <ModeTabsTrigger value="hosts" className="grow">
                X hôtes min.
              </ModeTabsTrigger>
              <ModeTabsTrigger value="vlsm" className="grow">
                VLSM
              </ModeTabsTrigger>
            </ModeTabsList>

            <ModeTabsContent value="n" className="space-y-2">
              <Label htmlFor="subnet-n">Nombre de sous-réseaux souhaités</Label>
              <Input
                id="subnet-n"
                value={nSubnets}
                onChange={(e) => setNSubnets(e.target.value)}
                inputMode="numeric"
                placeholder="4"
                className="font-mono-tabular"
              />
              <p className="text-xs text-muted-foreground">
                Si la valeur n'est pas une puissance de 2, on remonte à la puissance de 2 supérieure
                (ex: 3 → 4 sous-réseaux).
              </p>
            </ModeTabsContent>

            <ModeTabsContent value="hosts" className="space-y-2">
              <Label htmlFor="subnet-hosts">Nombre d'hôtes minimum par sous-réseau</Label>
              <Input
                id="subnet-hosts"
                value={hostsPerSubnet}
                onChange={(e) => setHostsPerSubnet(e.target.value)}
                inputMode="numeric"
                placeholder="50"
                className="font-mono-tabular"
              />
              <p className="text-xs text-muted-foreground">
                Choisit le préfixe le plus serré qui satisfait, et génère tous les sous-réseaux du
                parent à ce préfixe.
              </p>
            </ModeTabsContent>

            <ModeTabsContent value="vlsm" className="space-y-2">
              <Label htmlFor="subnet-vlsm">Liste des besoins (séparés par virgules)</Label>
              <Input
                id="subnet-vlsm"
                value={vlsmInput}
                onChange={(e) => setVlsmInput(e.target.value)}
                placeholder="50, 25, 10, 2"
                autoComplete="off"
                spellCheck={false}
                className="font-mono-tabular"
              />
              <p className="text-xs text-muted-foreground">
                VLSM : chaque besoin reçoit un sous-réseau à la taille adaptée. L'ordre d'origine
                est préservé.
              </p>
            </ModeTabsContent>
          </ModeTabs>

          {result && !result.ok && <ErrorMessage message={result.error} />}
        </CardContent>
      </Card>

      {result?.ok && parsedParent?.ok && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Allocation visuelle</CardTitle>
              <CardDescription>
                Réseau parent <span className="font-mono-tabular">{toDotted(parsedParent.ip)}/{parsedParent.prefix}</span>{" "}
                — chaque bloc est proportionnel à la taille de son sous-réseau.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationBar
                parentNetwork={networkAddress(parsedParent.ip, parsedParent.prefix)}
                parentPrefix={parsedParent.prefix}
                subnets={result.subnets}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>
                  {result.subnets.length} sous-réseau{result.subnets.length > 1 ? "x" : ""}
                </CardTitle>
                <CardDescription>Plan d'adressage généré</CardDescription>
              </div>
              <Button onClick={handleExport} size="sm" variant="secondary">
                <Download />
                <span className="hidden sm:inline">Exporter en CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    {mode === "vlsm" && <TableHead>Besoin</TableHead>}
                    <TableHead>Réseau / CIDR</TableHead>
                    <TableHead>Masque</TableHead>
                    <TableHead>Première IP</TableHead>
                    <TableHead>Dernière IP</TableHead>
                    <TableHead>Broadcast</TableHead>
                    <TableHead className="text-right">Hôtes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.subnets.map((s) => (
                    <TableRow key={s.index}>
                      <TableCell className="font-mono-tabular">{s.index}</TableCell>
                      {mode === "vlsm" && (
                        <TableCell className="font-mono-tabular text-muted-foreground">
                          {isVlsmRow(s) ? s.requestedHosts : "—"}
                        </TableCell>
                      )}
                      <TableCell className="font-mono-tabular">
                        {toDotted(s.network)}
                        <span className="text-muted-foreground">/{s.prefix}</span>
                      </TableCell>
                      <TableCell className="font-mono-tabular">{toDotted(s.mask)}</TableCell>
                      <TableCell className="font-mono-tabular">
                        {s.firstHost !== null ? toDotted(s.firstHost) : "—"}
                      </TableCell>
                      <TableCell className="font-mono-tabular">
                        {s.lastHost !== null ? toDotted(s.lastHost) : "—"}
                      </TableCell>
                      <TableCell className="font-mono-tabular">{toDotted(s.broadcast)}</TableCell>
                      <TableCell className="text-right font-mono-tabular">
                        {s.usableHosts.toLocaleString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
