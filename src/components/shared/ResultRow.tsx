import * as React from "react";
import { CopyButton } from "./CopyButton";
import { cn } from "@/lib/utils";

interface ResultRowProps {
  label: string;
  value: React.ReactNode;
  copy?: string;
  mono?: boolean;
  className?: string;
}

export function ResultRow({ label, value, copy, mono = true, className }: ResultRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-[max-content_1fr_auto] items-center gap-x-3 gap-y-1 border-b border-border/50 py-2 last:border-b-0 sm:grid-cols-[10rem_1fr_auto]",
        className,
      )}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground sm:text-sm sm:normal-case sm:tracking-normal">
        {label}
      </div>
      <div className={cn("min-w-0 break-all", mono && "font-mono-tabular")}>{value}</div>
      <div className="shrink-0">
        {copy !== undefined && copy !== "" && <CopyButton value={copy} label={label} />}
      </div>
    </div>
  );
}
