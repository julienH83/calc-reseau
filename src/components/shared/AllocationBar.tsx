"use client";

import * as React from "react";
import type { Subnet } from "@/lib/ip/types";
import { totalAddresses } from "@/lib/ip/extras";
import { toDotted } from "@/lib/ip/format";
import { cn } from "@/lib/utils";

interface AllocationBarProps {
  parentNetwork: number;
  parentPrefix: number;
  subnets: Subnet[];
  className?: string;
}

const PALETTE = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-lime-500",
];

/**
 * Affiche le réseau parent comme une barre, avec chaque sous-réseau coloré
 * proportionnellement à sa taille. Les zones non allouées (VLSM partiel)
 * apparaissent en gris.
 */
export function AllocationBar({
  parentNetwork,
  parentPrefix,
  subnets,
  className,
}: AllocationBarProps) {
  const totalSize = totalAddresses(parentPrefix);
  const parentStart = parentNetwork >>> 0;

  // Construit les segments alloués + lacunes.
  const segments: Array<
    { kind: "subnet"; subnet: Subnet; offset: number; size: number }
    | { kind: "gap"; offset: number; size: number }
  > = [];

  const sorted = [...subnets].sort((a, b) => (a.network >>> 0) - (b.network >>> 0));
  let cursor = parentStart;
  for (const s of sorted) {
    const start = s.network >>> 0;
    if (start > cursor) {
      segments.push({ kind: "gap", offset: cursor - parentStart, size: start - cursor });
    }
    const size = totalAddresses(s.prefix);
    segments.push({ kind: "subnet", subnet: s, offset: start - parentStart, size });
    cursor = start + size;
  }
  const parentEnd = parentStart + totalSize;
  if (cursor < parentEnd) {
    segments.push({ kind: "gap", offset: cursor - parentStart, size: parentEnd - cursor });
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className="flex h-8 w-full overflow-hidden rounded-md ring-1 ring-border"
        role="img"
        aria-label="Répartition visuelle du réseau parent"
      >
        {segments.map((seg, i) => {
          const widthPct = (seg.size / totalSize) * 100;
          if (seg.kind === "gap") {
            return (
              <div
                key={`gap-${i}`}
                className="h-full bg-muted/40"
                style={{ width: `${widthPct}%` }}
                title={`Libre · ${seg.size.toLocaleString("fr-FR")} adresses`}
              />
            );
          }
          const color = PALETTE[(seg.subnet.index - 1) % PALETTE.length];
          return (
            <div
              key={`sn-${seg.subnet.index}`}
              className={cn("h-full", color)}
              style={{ width: `${widthPct}%` }}
              title={`#${seg.subnet.index} · ${toDotted(seg.subnet.network)}/${seg.subnet.prefix} · ${seg.subnet.usableHosts} hôtes`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {sorted.map((s) => {
          const color = PALETTE[(s.index - 1) % PALETTE.length];
          return (
            <span key={s.index} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm", color)} />
              <span className="font-mono-tabular">
                #{s.index} {toDotted(s.network)}/{s.prefix}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
