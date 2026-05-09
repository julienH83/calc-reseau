"use client";

import * as React from "react";
import { ArrowDown, Plus, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/CopyButton";
import { ErrorMessage } from "@/components/shared/ErrorMessage";
import { ShareButton } from "@/components/shared/ShareButton";
import { isValidCIDR } from "@/lib/ip/validate";
import { parseCIDR } from "@/lib/ip/parse";
import { aggregateSubnets, totalAddresses, rangeText } from "@/lib/ip/extras";
import { toDotted } from "@/lib/ip/format";
import { useHashParam } from "@/hooks/useUrlState";

export function AggregatorTab() {
  const [listParam, setListParam] = useHashParam("list");
  const initialList = React.useMemo(() => {
    if (listParam) return listParam.split(/\s*,\s*/).filter(Boolean);
    return ["192.168.0.0/24", "192.168.1.0/24"];
  }, [listParam]);

  const [items, setItems] = React.useState<string[]>(initialList);

  React.useEffect(() => {
    if (listParam) {
      const parsed = listParam.split(/\s*,\s*/).filter(Boolean);
      if (parsed.length > 0 && parsed.join(",") !== items.join(",")) {
        setItems(parsed);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listParam]);

  const result = React.useMemo(() => {
    const cleaned = items.map((s) => s.trim()).filter((s) => s !== "");
    if (cleaned.length === 0) return null;
    const invalid = cleaned.find((s) => !isValidCIDR(s));
    if (invalid) {
      return { ok: false as const, error: `Notation CIDR invalide : "${invalid}"` };
    }
    try {
      const parsed = cleaned.map((s) => parseCIDR(s));
      const agg = aggregateSubnets(parsed)!;
      return {
        ok: true as const,
        agg,
        inputCount: cleaned.length,
        totalCovered: totalAddresses(agg.prefix),
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Erreur" };
    }
  }, [items]);

  React.useEffect(() => {
    if (!result?.ok) return;
    const handle = setTimeout(() => {
      const cleaned = items.map((s) => s.trim()).filter(Boolean);
      setListParam(cleaned.join(","));
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, result?.ok]);

  const updateItem = (i: number, v: string) => {
    setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  };
  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  };
  const addItem = () => {
    setItems((prev) => [...prev, ""]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Agréger des réseaux (supernet)</CardTitle>
            <CardDescription>
              Trouve le plus petit super-réseau (CIDR) qui couvre toute la liste. Pratique pour les
              récapitulatifs de routage.
            </CardDescription>
          </div>
          {result?.ok && (
            <ShareButton
              tab="aggregate"
              params={{ list: items.map((s) => s.trim()).filter(Boolean).join(",") }}
            />
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Réseaux à agréger</Label>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  placeholder="192.168.0.0/24"
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono-tabular"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(i)}
                  disabled={items.length === 1}
                  aria-label="Retirer ce réseau"
                  title="Retirer"
                >
                  <X />
                </Button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus />
            <span>Ajouter un réseau</span>
          </Button>
          {result && !result.ok && <ErrorMessage message={result.error} />}
        </CardContent>
      </Card>

      {result?.ok && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-primary" />
              Super-réseau
            </CardTitle>
            <CardDescription>
              Le plus petit CIDR qui contient les {result.inputCount} réseau
              {result.inputCount > 1 ? "x" : ""} fourni{result.inputCount > 1 ? "s" : ""}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-4">
              <code className="grow break-all font-mono-tabular text-base sm:text-lg">
                {toDotted(result.agg.network)}/{result.agg.prefix}
              </code>
              <CopyButton
                value={`${toDotted(result.agg.network)}/${result.agg.prefix}`}
                label="le supernet"
              />
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2 rounded border bg-muted/20 px-3 py-2">
                <dt className="text-muted-foreground">Plage</dt>
                <dd className="font-mono-tabular">
                  {rangeText(result.agg.network, result.agg.prefix)}
                </dd>
              </div>
              <div className="flex justify-between gap-2 rounded border bg-muted/20 px-3 py-2">
                <dt className="text-muted-foreground">Adresses couvertes</dt>
                <dd className="font-mono-tabular">
                  {result.totalCovered.toLocaleString("fr-FR")}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
