"use client";

import * as React from "react";

/**
 * useState synchronisé avec localStorage. Côté serveur on rend la valeur initiale
 * pour éviter le flash, puis on hydrate depuis localStorage côté client.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = React.useState<T>(initialValue);
  const [hydrated, setHydrated] = React.useState(false);

  // Lecture initiale depuis localStorage côté client.
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) {
        setValue(JSON.parse(raw) as T);
      }
    } catch {
      // QuotaExceeded, JSON.parse error, etc. — on ignore et on garde initialValue.
    }
    setHydrated(true);
  }, [key]);

  const update = React.useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        if (hydrated) {
          try {
            window.localStorage.setItem(key, JSON.stringify(resolved));
          } catch {
            // ignore
          }
        }
        return resolved;
      });
    },
    [key, hydrated],
  );

  return [value, update];
}
