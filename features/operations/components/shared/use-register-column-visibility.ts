"use client";

import { useEffect, useState } from "react";
import {
  defaultColumnVisibility,
  type RegisterColumnId,
} from "../../lib/register-columns";

const storageKey = "orreg-operations-column-visibility:v1";

export function useRegisterColumnVisibility() {
  const [columnVisibility, setColumnVisibility] = useState(defaultColumnVisibility);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const defaults = defaultColumnVisibility();
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        for (const id of Object.keys(defaults) as RegisterColumnId[]) {
          const value = (saved as Record<string, unknown>)[id];
          if (typeof value === "boolean") defaults[id] = value;
        }
      }
      defaults.actions = true;
      // Restore the persisted visibility after hydration; the server render uses defaults.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setColumnVisibility(defaults);
    } catch {
      defaults.actions = true;
      setColumnVisibility(defaults);
    }
    // This flag gates persistence until the browser preference has been restored.
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch {
      // Keep the preference for the current page if browser storage is unavailable.
    }
  }, [columnVisibility, loaded]);

  const changeColumnVisibility = (id: string, visible: boolean) => {
    if (id === "actions") return;
    setColumnVisibility((current) => ({ ...current, [id]: visible }));
  };

  const resetColumnVisibility = () => {
    const defaults = defaultColumnVisibility();
    defaults.actions = true;
    setColumnVisibility(defaults);
  };

  return { columnVisibility, changeColumnVisibility, resetColumnVisibility };
}
