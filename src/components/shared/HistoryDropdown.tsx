"use client";

import * as React from "react";
import { History as HistoryIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { cn } from "@/lib/utils";

interface HistoryEntry {
  /** Texte affiché dans la liste (ex: "192.168.1.10 /24"). */
  label: string;
  /** Charge utile pour restaurer (ex: { ip, mask } ou { cidr } ou { reqs }). */
  payload: Record<string, string>;
  /** Timestamp epoch ms. */
  ts: number;
}

interface HistoryDropdownProps {
  storageKey: string;
  onSelect: (payload: Record<string, string>) => void;
  className?: string;
}

const MAX_ENTRIES = 12;

/**
 * Bouton d'historique : clic → ouvre une liste des derniers calculs persistés.
 * Le parent appelle pushToHistory(label, payload) via la ref retournée pour ajouter une entrée.
 */
export function HistoryDropdown({ storageKey, onSelect, className }: HistoryDropdownProps) {
  const [entries, setEntries] = useLocalStorage<HistoryEntry[]>(storageKey, []);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const remove = (ts: number) => {
    setEntries((prev) => prev.filter((e) => e.ts !== ts));
  };

  const clear = () => {
    setEntries([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Historique"
        title="Historique"
        className="text-muted-foreground hover:text-foreground"
      >
        <HistoryIcon />
      </Button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in slide-in-from-top-1">
          {entries.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              Aucun calcul mémorisé.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <span>Récents</span>
                <button
                  onClick={clear}
                  className="rounded px-1.5 py-0.5 text-[10px] hover:bg-accent hover:text-accent-foreground"
                >
                  Tout effacer
                </button>
              </div>
              <ul className="max-h-72 overflow-auto py-1">
                {entries.map((e) => (
                  <li key={e.ts} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(e.payload);
                        setOpen(false);
                      }}
                      className="flex-1 truncate rounded px-2 py-1.5 text-left text-sm font-mono-tabular hover:bg-accent hover:text-accent-foreground"
                    >
                      {e.label}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(e.ts)}
                      aria-label="Supprimer"
                      className="rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-accent hover:text-accent-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Hook compagnon — ajoute une entrée à l'historique sans dupliquer la dernière entrée.
 */
export function usePushHistory(storageKey: string) {
  const [, setEntries] = useLocalStorage<HistoryEntry[]>(storageKey, []);

  return React.useCallback(
    (label: string, payload: Record<string, string>) => {
      setEntries((prev) => {
        const dedup = prev.filter((e) => e.label !== label);
        const next: HistoryEntry[] = [{ label, payload, ts: Date.now() }, ...dedup];
        return next.slice(0, MAX_ENTRIES);
      });
    },
    [setEntries],
  );
}
