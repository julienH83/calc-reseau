"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { isValidCIDR } from "@/lib/ip/validate";
import { parseCIDR } from "@/lib/ip/parse";
import { exploreSubdivisions } from "@/lib/ip/explore";
import { toDotted } from "@/lib/ip/format";
import { useHashParam } from "@/hooks/useUrlState";

export function ExplorerTab() {
  const [cidrParam, setCidrParam] = useHashParam("net");
  const [cidrInput, setCidrInput] = React.useState(cidrParam || "192.168.1.0/24");

  React.useEffect(() => {
    if (cidrParam && cidrParam !== cidrInput) setCidrInput(cidrParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidrParam]);

  const result = React.useMemo(() => {
    const trimmed = cidrInput.trim();
    if (trimmed === "") return null;
    if (!isValidCIDR(trimmed)) {
      return {
        ok: false as const,
        error: "Notation CIDR attendue. Exemple : 192.168.1.0/24",
      };
    }
    try {
      const { prefix } = parseCIDR(trimmed);
      const rows = exploreSubdivisions(prefix);
      return { ok: true as const, prefix, rows };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erreur" };
    }
  }, [cidrInput]);

  React.useEffect(() => {
    if (!result?.ok) return;
    const handle = setTimeout(() => setCidrParam(cidrInput.trim()), 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidrInput, result?.ok]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Explorer les découpages possibles</CardTitle>
            <CardDescription>
              Liste tous les découpages d'un réseau, du plus grand au plus petit. S'arrête quand
              chaque sous-réseau a moins de 2 hôtes utilisables.
            </CardDescription>
          </div>
          {result?.ok && (
            <ShareButton tab="explore" params={{ net: cidrInput.trim() }} />
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="explorer-cidr">Réseau de départ</Label>
            <Input
              id="explorer-cidr"
              value={cidrInput}
              onChange={(e) => setCidrInput(e.target.value)}
              placeholder="192.168.1.0/24"
              autoComplete="off"
              spellCheck={false}
              className="font-mono-tabular"
            />
          </div>
          {result && !result.ok && <ErrorMessage message={result.error} />}
        </CardContent>
      </Card>

      {result?.ok && (
        <Card>
          <CardHeader>
            <CardTitle>
              {result.rows.length} découpage{result.rows.length > 1 ? "s" : ""} possible
              {result.rows.length > 1 ? "s" : ""} pour /{result.prefix}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ce réseau ne peut plus être découpé en sous-réseaux utilisables (chaque
                sous-réseau aurait moins de 2 hôtes).
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sous-réseaux</TableHead>
                    <TableHead>Nouveau CIDR</TableHead>
                    <TableHead>Masque</TableHead>
                    <TableHead className="text-right">Hôtes / sous-réseau</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row) => (
                    <TableRow key={row.newPrefix}>
                      <TableCell className="font-mono-tabular">{row.count}</TableCell>
                      <TableCell className="font-mono-tabular">/{row.newPrefix}</TableCell>
                      <TableCell className="font-mono-tabular">{toDotted(row.mask)}</TableCell>
                      <TableCell className="text-right font-mono-tabular">
                        {row.hostsPerSubnet.toLocaleString("fr-FR")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
