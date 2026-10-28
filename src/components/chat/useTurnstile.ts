"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Cloudflare's published test site key: always passes. Used only in local development. */
const TEST_SITE_KEY = "1x00000000000000000000AA";
const SITE_KEY =
  process.env.NODE_ENV === "development"
    ? TEST_SITE_KEY
    : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export type TurnstileState = "loading" | "ready" | "error";

/**
 * Cloudflare Turnstile bot check for the first message of a conversation.
 * The widget only becomes visible if Cloudflare needs the visitor to interact.
 * `tokenRef` always holds the latest unused token (tokens are single-use).
 */
export function useTurnstile(container: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const tokenRef = useRef<string | null>(null);
  const widgetRef = useRef<string | null>(null);
  const [state, setState] = useState<TurnstileState>(SITE_KEY ? "loading" : "error");

  useEffect(() => {
    if (!enabled || !SITE_KEY || widgetRef.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetRef.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          theme: "auto",
          size: "flexible",
          appearance: "interaction-only",
          "refresh-expired": "auto",
          callback: (token: string) => {
            tokenRef.current = token;
            setState("ready");
          },
          "expired-callback": () => {
            tokenRef.current = null;
            setState("loading");
          },
          "error-callback": () => {
            tokenRef.current = null;
            setState("error");
          },
        });
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [container, enabled]);

  useEffect(
    () => () => {
      if (widgetRef.current) window.turnstile?.remove(widgetRef.current);
    },
    [],
  );

  /** Fetches a fresh token, e.g. after the server has used (or rejected) the last one. */
  const reset = useCallback(() => {
    tokenRef.current = null;
    if (widgetRef.current && window.turnstile) {
      setState("loading");
      window.turnstile.reset(widgetRef.current);
    }
  }, []);

  /** Takes the current token; it can only be used once. */
  const take = useCallback(() => {
    const token = tokenRef.current;
    tokenRef.current = null;
    return token;
  }, []);

  return { state, take, reset };
}
