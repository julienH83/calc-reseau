"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Network, Calculator, Layers, Scissors, GitMerge, Keyboard, Wrench } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToastProvider } from "@/hooks/useToast";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { InstallButton } from "@/components/shared/InstallButton";
import { useUrlHash } from "@/hooks/useUrlState";

// Lazy-load des onglets — chacun n'embarque sa logique que lorsqu'il est ouvert.
// Cela réduit le JS du chemin critique et la TTI sur mobile.
const ConverterTab = dynamic(
  () => import("@/components/tabs/ConverterTab").then((m) => m.ConverterTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const AnalyzerTab = dynamic(
  () => import("@/components/tabs/AnalyzerTab").then((m) => m.AnalyzerTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const ExplorerTab = dynamic(
  () => import("@/components/tabs/ExplorerTab").then((m) => m.ExplorerTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const SubnetterTab = dynamic(
  () => import("@/components/tabs/SubnetterTab").then((m) => m.SubnetterTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const AggregatorTab = dynamic(
  () => import("@/components/tabs/AggregatorTab").then((m) => m.AggregatorTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);
const ToolsTab = dynamic(
  () => import("@/components/tabs/ToolsTab").then((m) => m.ToolsTab),
  { ssr: false, loading: () => <TabSkeleton /> },
);

const TABS = [
  { id: "converter", label: "Convertir", icon: Calculator, shortcut: "1" },
  { id: "analyze", label: "Analyser", icon: Network, shortcut: "2" },
  { id: "explore", label: "Explorer", icon: Layers, shortcut: "3" },
  { id: "subnet", label: "Découper", icon: Scissors, shortcut: "4" },
  { id: "aggregate", label: "Agréger", icon: GitMerge, shortcut: "5" },
  { id: "tools", label: "Outils", icon: Wrench, shortcut: "6" },
] as const;

export default function HomePage() {
  return (
    <ToastProvider>
      <HomePageContent />
    </ToastProvider>
  );
}

function HomePageContent() {
  const [activeTab, setActiveTab] = useUrlHash("converter");
  const [helpOpen, setHelpOpen] = React.useState(false);

  // Raccourcis clavier 1..5 pour les onglets, ? pour l'aide.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const editable =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (editable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tab = TABS.find((t) => t.shortcut === e.key);
      if (tab) {
        setActiveTab(tab.id);
        e.preventDefault();
        return;
      }
      if (e.key === "?" || e.key === "/") {
        setHelpOpen((o) => !o);
        e.preventDefault();
      } else if (e.key === "Escape") {
        setHelpOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTab]);

  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <header className="mb-6 flex items-center justify-between gap-2 sm:mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Calc Réseau</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Calculateur IPv4 — fonctionne hors-ligne
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label="Raccourcis clavier"
            title="Raccourcis clavier (?)"
            className="hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground sm:inline-flex"
          >
            <Keyboard className="h-4 w-4" />
          </button>
          <InstallButton />
          <ThemeToggle />
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 sm:grid-cols-6">
          {TABS.map(({ id, label, icon: Icon }) => (
            <TabsTrigger
              key={id}
              value={id}
              className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="converter">
          <ConverterTab />
        </TabsContent>
        <TabsContent value="analyze">
          <AnalyzerTab />
        </TabsContent>
        <TabsContent value="explore">
          <ExplorerTab />
        </TabsContent>
        <TabsContent value="subnet">
          <SubnetterTab />
        </TabsContent>
        <TabsContent value="aggregate">
          <AggregatorTab />
        </TabsContent>
        <TabsContent value="tools">
          <ToolsTab />
        </TabsContent>
      </Tabs>

      <KeyboardHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      <footer className="mt-12 text-center text-xs text-muted-foreground">
        <p>
          Tous les calculs sont effectués localement dans ton navigateur.{" "}
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="underline-offset-2 hover:underline"
          >
            Raccourcis (?)
          </button>
        </p>
      </footer>
    </main>
  );
}

function TabSkeleton() {
  return (
    <div className="mt-4 space-y-4">
      <div className="h-32 animate-pulse rounded-xl border bg-card" />
      <div className="h-64 animate-pulse rounded-xl border bg-card" />
    </div>
  );
}

function KeyboardHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Raccourcis clavier</h2>
        <ul className="space-y-2 text-sm">
          {TABS.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Onglet {t.label}</span>
              <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border bg-muted px-1.5 font-mono-tabular text-xs">
                {t.shortcut}
              </kbd>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 border-t pt-2">
            <span className="text-muted-foreground">Ouvrir/fermer cette aide</span>
            <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border bg-muted px-1.5 font-mono-tabular text-xs">
              ?
            </kbd>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Fermer une popup</span>
            <kbd className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border bg-muted px-1.5 font-mono-tabular text-xs">
              Esc
            </kbd>
          </li>
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">
          Les raccourcis ne se déclenchent pas pendant la saisie dans un champ.
        </p>
      </div>
    </div>
  );
}
