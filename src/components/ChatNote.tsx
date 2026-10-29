"use client";

import { MessageSquare } from "lucide-react";
import { profile } from "@/data/profile";
import { openChat } from "./chat/open-chat";

/** "How this chat works": ties the site's own chat to the RAG pipeline above it. */
export function ChatNote() {
  const { chatNote } = profile.ai;
  return (
    <div className="border-line bg-surface rounded-2xl border p-6 sm:p-8">
      <h3 className="font-display text-2xl leading-tight font-semibold tracking-tight">
        {chatNote.title}
      </h3>
      <p className="text-muted mt-3 leading-relaxed">{chatNote.intro}</p>
      <dl className="mt-5 grid gap-4 md:grid-cols-5 md:gap-4">
        {chatNote.steps.map(({ step, detail }, i) => (
          <div key={step}>
            <dt className="text-accent-text font-mono text-xs">
              {String(i + 1).padStart(2, "0")} {step}
            </dt>
            <dd className="text-ink/85 mt-1 text-sm leading-snug">{detail}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={() => openChat()}
        className="border-accent/50 text-accent-text hover:bg-accent/10 mt-6 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
      >
        <MessageSquare aria-hidden="true" className="size-4" />
        {chatNote.cta}
      </button>
    </div>
  );
}
