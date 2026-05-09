"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/useToast";
import { buildShareUrl } from "@/hooks/useUrlState";

interface ShareButtonProps {
  tab: string;
  params: Record<string, string>;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "secondary" | "outline" | "ghost";
}

export function ShareButton({ tab, params, size = "icon", variant = "ghost" }: ShareButtonProps) {
  const { show } = useToast();

  const handleShare = React.useCallback(async () => {
    const url = buildShareUrl(tab, params);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Calc Réseau", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      show("Lien copié dans le presse-papiers", "success");
    } catch (e) {
      // L'utilisateur a annulé le share natif → pas une erreur réelle.
      if (e instanceof Error && e.name === "AbortError") return;
      show("Impossible de partager", "error");
    }
  }, [tab, params, show]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleShare}
      aria-label="Partager ce calcul"
      title="Partager ce calcul"
      className="text-muted-foreground hover:text-foreground"
    >
      <Share2 />
      {size !== "icon" && <span>Partager</span>}
    </Button>
  );
}
