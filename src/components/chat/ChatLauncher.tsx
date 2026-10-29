"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { track, type ChatPlacement } from "@/lib/analytics";
import { OPEN_CHAT_EVENT, type OpenChatDetail } from "./open-chat";

// None of the chat code (AI SDK, Markdown) loads until the visitor opens the panel.
const loadPanel = () => import("./ChatPanel");
const ChatPanel = dynamic(() => loadPanel().then((m) => m.ChatPanel), { ssr: false });

/** Labels come from the server layout, so chatConfig stays out of the first-load bundle. */
export function ChatLauncher({ label, assistantName }: { label: string; assistantName: string }) {
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  // Mirrors `open` synchronously, so chat_open fires only on a closed → open change.
  const openRef = useRef(false);

  const show = useCallback((placement: ChatPlacement, message?: string) => {
    if (message) setPending(message);
    setLoaded(true);
    setOpen(true);
    if (!openRef.current) {
      openRef.current = true;
      track("chat_open", { placement });
    }
  }, []);

  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
    // The launcher is hidden while the panel is open; focus it once it's back.
    requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<OpenChatDetail>).detail;
      show(detail.placement, detail.message);
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, [show]);

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        onClick={() => show("floating_launcher")}
        // Start fetching the panel as soon as the visitor shows intent.
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-label={`Open chat: ${assistantName}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${open ? "hidden" : "inline-flex"} border-accent/40 bg-surface/90 text-ink hover:border-accent fixed right-4 bottom-4 z-[55] items-center gap-2 rounded-lg border px-4 py-3 font-mono text-sm shadow-lg shadow-black/30 backdrop-blur transition-colors sm:right-6 sm:bottom-6`}
      >
        <span className="text-accent-text">{label}</span>
        <span
          aria-hidden="true"
          className="bg-accent inline-block h-4 w-2 motion-safe:animate-pulse"
        />
      </button>
      {loaded ? (
        <ChatPanel
          open={open}
          onClose={close}
          pendingMessage={pending}
          onPendingSent={() => setPending(null)}
        />
      ) : null}
    </>
  );
}
