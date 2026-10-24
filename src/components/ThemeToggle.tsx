"use client";

import { Moon, Sun } from "lucide-react";
import { useLayoutEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// The <html data-theme> attribute (set by the inline script in layout.tsx) is the source of truth.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme | null {
  return null;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Re-apply after React's dev-mode remount clears the attribute. No-op in production.
  useLayoutEffect(() => {
    applyTheme(storedTheme() ?? "dark");
  }, []);

  function toggle() {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode) — the choice still applies for this visit.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        theme === "dark"
          ? "Switch to light theme"
          : theme === "light"
            ? "Switch to dark theme"
            : "Toggle theme"
      }
      className="text-ink hover:bg-ink/5 relative inline-flex size-10 items-center justify-center rounded-full transition-colors"
    >
      {/* Both icons render server-side; CSS picks one so there's no flash before hydration. */}
      <Sun aria-hidden="true" className="block size-[18px] [[data-theme=light]_&]:hidden" />
      <Moon aria-hidden="true" className="hidden size-[18px] [[data-theme=light]_&]:block" />
    </button>
  );
}
