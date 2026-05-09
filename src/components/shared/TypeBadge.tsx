import * as React from "react";
import type { IPType } from "@/lib/ip/types";
import { cn } from "@/lib/utils";

const labels: Record<IPType, string> = {
  public: "Publique",
  private: "Privée",
  loopback: "Loopback",
  apipa: "APIPA",
  multicast: "Multicast",
  reserved: "Réservée",
};

const colors: Record<IPType, string> = {
  public: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  private: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  loopback: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  apipa: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  multicast: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  reserved: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

export function TypeBadge({ type, className }: { type: IPType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        colors[type],
        className,
      )}
    >
      {labels[type]}
    </span>
  );
}
