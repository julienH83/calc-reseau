"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { useToast } from "@/hooks/useToast";

export function InstallButton() {
  const { canInstall, install } = useInstallPrompt();
  const { show } = useToast();

  if (!canInstall) return null;

  const handleClick = async () => {
    const accepted = await install();
    if (accepted) show("App installée ✓", "success");
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="hidden gap-2 sm:inline-flex"
    >
      <Download className="h-4 w-4" />
      <span>Installer l'app</span>
    </Button>
  );
}
