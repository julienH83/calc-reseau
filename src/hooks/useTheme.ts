"use client";

import * as React from "react";
import { useLocalStorage } from "./useLocalStorage";

export type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useLocalStorage<Theme>("calc-reseau:theme", "dark");

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    // Met à jour la balise meta theme-color pour la barre du navigateur sur mobile.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#0b1220" : "#f8fafc");
    }
  }, [theme]);

  const toggle = React.useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, [setTheme]);

  return { theme, toggle, setTheme };
}
