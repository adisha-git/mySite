"use client";

import { Check, CircleDashed, Minus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { chatConfig } from "@/lib/chat/config";
import type { FitResult } from "@/lib/chat/fit";
import { LeadCard } from "./LeadCard";

/** Requirements with the quotes that show them, each labelled with where it's from. */
function Requirements({
  title,
  items,
  icon,
}: {
  title: string;
  items: FitResult["matched"];
  icon: ReactNode;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="text-muted mb-1.5 text-xs">{title}</h3>
      <ul className="space-y-2">
        {items.map((m) => (
          <li key={m.requirement} className="flex gap-2">
            {icon}
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium">{m.requirement}</p>
              {m.evidence.map((e) => (
                <p key={e.quote} className="text-muted mt-0.5 text-xs leading-snug">
                  <span className="text-ink/80">{e.label}:</span> “{e.quote}”
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A job-description fit check: each match with the quote that proves it, the
 * requirements his written experience doesn't show, and a short summary. It
 * ends by offering to pass the role on, which opens the lead card.
 */
export function FitCard({
  fit,
  conversationId,
  conversationToken,
}: {
  fit: FitResult;
  conversationId?: string;
  conversationToken?: string;
}) {
  const [passing, setPassing] = useState(false);
  const firstName = chatConfig.persona.subjectName.split(" ")[0];

  return (
    <div className="space-y-3">
      <section
        aria-label="Fit check"
        className="border-accent/40 space-y-3 rounded-lg border px-3 py-2.5"
      >
        <p className="text-accent-text font-mono text-[11px]">
          {"// fit check"}
          {fit.role ? <span className="text-muted"> · {fit.role}</span> : null}
        </p>

        <Requirements
          title="Matches, with evidence"
          items={fit.matched}
          icon={<Check aria-hidden="true" className="text-accent-text mt-1 size-4 shrink-0" />}
        />
        <Requirements
          title="Partly shown"
          items={fit.partial}
          icon={
            <CircleDashed aria-hidden="true" className="text-accent-text mt-1 size-4 shrink-0" />
          }
        />

        {fit.gaps.length ? (
          <div>
            <h3 className="text-muted mb-1.5 text-xs">
              Not shown in what {firstName} has written about his work
            </h3>
            <ul className="space-y-1">
              {fit.gaps.map((gap) => (
                <li key={gap} className="text-ink/90 flex gap-2 text-sm">
                  <Minus aria-hidden="true" className="text-muted mt-0.5 size-4 shrink-0" />
                  {gap}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {fit.summary ? (
          <p className="text-ink/90 border-line border-t pt-2.5 text-[15px] leading-relaxed">
            {fit.summary}
          </p>
        ) : null}
      </section>

      {passing ? (
        <LeadCard
          draft={{
            name: "",
            email: "",
            company: "",
            topic: chatConfig.leads.topics[0],
            note: fit.role ? `Role: ${fit.role}` : "",
          }}
          conversationId={conversationId}
          conversationToken={conversationToken}
          withJobDescription
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-ink/90 text-[15px]">Want me to pass this to {firstName}?</p>
          <button
            type="button"
            onClick={() => setPassing(true)}
            className="border-accent/50 text-accent-text hover:bg-accent/10 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
          >
            Yes, pass it on
          </button>
        </div>
      )}
    </div>
  );
}
