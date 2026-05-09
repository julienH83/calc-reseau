"use client";

import * as React from "react";
import { toBinaryRaw } from "@/lib/ip/format";
import type { IPv4 } from "@/lib/ip/types";
import { cn } from "@/lib/utils";

interface BinaryViewProps {
  ip: IPv4;
  prefix: number;
  className?: string;
}

/** Affiche les 32 bits, séparés en octets, avec coloration bits réseau / bits hôte. */
export function BinaryView({ ip, prefix, className }: BinaryViewProps) {
  const bits = toBinaryRaw(ip);
  const groups: { bit: string; isNet: boolean }[] = bits.split("").map((bit, i) => ({
    bit,
    isNet: i < prefix,
  }));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-x-3 gap-y-2 font-mono-tabular text-sm sm:text-base">
        {[0, 1, 2, 3].map((octet) => (
          <div key={octet} className="flex">
            {groups.slice(octet * 8, octet * 8 + 8).map((g, i) => (
              <span
                key={i}
                className={cn(
                  "inline-block w-[1ch] tabular-nums",
                  g.isNet
                    ? "text-[hsl(var(--netbits))] font-semibold"
                    : "text-[hsl(var(--hostbits))]",
                )}
              >
                {g.bit}
              </span>
            ))}
            {octet < 3 && <span className="text-muted-foreground/50">.</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--netbits))]" />
          Bits réseau ({prefix})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--hostbits))]" />
          Bits hôte ({32 - prefix})
        </span>
      </div>
    </div>
  );
}
