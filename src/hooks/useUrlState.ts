"use client";

import * as React from "react";

/**
 * État synchronisé avec l'URL (query string + hash de tab).
 * - On lit le hash et les params au mount.
 * - On écrit avec replaceState pour ne pas polluer l'historique.
 * - On debounce les écritures URL.
 *
 * Format : /#analyze?ip=192.168.1.10&mask=/24
 */

export function useUrlHash(defaultValue: string): [string, (v: string) => void] {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    const initial = window.location.hash.replace(/^#/, "").split("?")[0];
    if (initial) setValue(initial);

    const onHashChange = () => {
      const h = window.location.hash.replace(/^#/, "").split("?")[0];
      if (h) setValue(h);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const update = React.useCallback((v: string) => {
    setValue(v);
    const search = window.location.hash.includes("?")
      ? "?" + window.location.hash.split("?").slice(1).join("?")
      : "";
    const newHash = `#${v}${search}`;
    if (window.location.hash !== newHash) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}${newHash}`);
    }
  }, []);

  return [value, update];
}

/** Lit un paramètre depuis le hash (#tab?param=value). */
export function useHashParam(name: string): [string, (v: string) => void] {
  const [value, setValue] = React.useState("");

  const read = React.useCallback(() => {
    const hash = window.location.hash;
    const idx = hash.indexOf("?");
    if (idx === -1) return "";
    const params = new URLSearchParams(hash.slice(idx + 1));
    return params.get(name) ?? "";
  }, [name]);

  React.useEffect(() => {
    setValue(read());
    const onChange = () => setValue(read());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, [read]);

  const update = React.useCallback(
    (v: string) => {
      setValue(v);
      const hash = window.location.hash;
      const idx = hash.indexOf("?");
      const tab = idx === -1 ? hash.slice(1) : hash.slice(1, idx);
      const params = new URLSearchParams(idx === -1 ? "" : hash.slice(idx + 1));
      if (v === "") params.delete(name);
      else params.set(name, v);
      const queryString = params.toString();
      const newHash = `#${tab}${queryString ? "?" + queryString : ""}`;
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}${newHash}`);
    },
    [name],
  );

  return [value, update];
}

/** Construit une URL partageable pour l'état actuel. */
export function buildShareUrl(tab: string, params: Record<string, string>): string {
  if (typeof window === "undefined") return "";
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== undefined && v !== null) search.set(k, v);
  }
  const qs = search.toString();
  return `${window.location.origin}${window.location.pathname}#${tab}${qs ? "?" + qs : ""}`;
}
