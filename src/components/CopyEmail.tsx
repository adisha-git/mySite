"use client";

import { AnimatePresence, m } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyEmail({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const t = setTimeout(() => setStatus("idle"), 2200);
    return () => clearTimeout(t);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="border-line text-muted hover:border-accent hover:text-ink inline-flex size-9 items-center justify-center rounded-full border transition-colors"
        aria-label="Copy email address"
      >
        {status === "copied" ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
      </button>

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4"
      >
        <AnimatePresence>
          {status !== "idle" ? (
            <m.div
              key={status}
              role="status"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              className="bg-ink text-paper rounded-full px-4 py-2.5 text-sm shadow-lg"
            >
              {status === "copied"
                ? "Email copied to clipboard"
                : "Couldn't copy — please select the address instead"}
            </m.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
