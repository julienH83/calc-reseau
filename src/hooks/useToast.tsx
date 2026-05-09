"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContext {
  show: (message: string, type?: ToastType) => void;
}

const ToastCtx = React.createContext<ToastContext | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const show = React.useCallback((message: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2200);
  }, []);

  const ctx = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={ctx}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 sm:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2 text-sm shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2",
              t.type === "success" && "border-emerald-500/40 bg-emerald-500/15 text-emerald-50",
              t.type === "error" && "border-destructive/40 bg-destructive/20 text-foreground",
              t.type === "info" && "border-sky-500/40 bg-sky-500/15 text-sky-50",
            )}
          >
            {t.type === "success" && <CheckCircle2 className="h-4 w-4" />}
            {t.type === "error" && <AlertCircle className="h-4 w-4" />}
            {t.type === "info" && <Info className="h-4 w-4" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastContext {
  const ctx = React.useContext(ToastCtx);
  if (!ctx) {
    // Fallback no-op pour SSR / tests.
    return { show: () => {} };
  }
  return ctx;
}
