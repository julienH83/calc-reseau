"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "icon";
  silent?: boolean;
}

export function CopyButton({
  value,
  label,
  className,
  size = "icon",
  silent = false,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const { show } = useToast();

  const handleClick = React.useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (!silent) show(label ? `${label} copié` : "Copié", "success");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback (très vieux navigateurs)
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        if (!silent) show("Copié", "success");
        setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }, [value, label, silent, show]);

  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={handleClick}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      aria-label={copied ? "Copié !" : label ? `Copier ${label}` : "Copier"}
      title={copied ? "Copié !" : "Copier"}
    >
      {copied ? <Check className="text-emerald-500" /> : <Copy />}
      {size !== "icon" && <span>{copied ? "Copié" : "Copier"}</span>}
    </Button>
  );
}
