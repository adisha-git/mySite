"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { chatConfig } from "@/lib/chat/config";
import { leadFieldsSchema, type LeadFields } from "@/lib/chat/lead";

type Status = "editing" | "sending" | "sent" | "cancelled";

const inputClass =
  "bg-surface border-line text-ink focus:border-accent w-full rounded-md border px-2.5 py-1.5 text-base outline-none sm:text-sm";

/**
 * The lead the model drafted, for the visitor to check, edit and confirm.
 * Nothing is saved or emailed until they click Confirm.
 */
export function LeadCard({
  draft,
  conversationId,
  conversationToken,
  withJobDescription = false,
}: {
  draft: LeadFields;
  conversationId?: string;
  conversationToken?: string;
  /** From a fit check: the job description goes with the lead. */
  withJobDescription?: boolean;
}) {
  const id = useId();
  // One id per card, reused on retries, so the lead is saved and emailed at most once.
  const [leadId] = useState(() => crypto.randomUUID());
  const [fields, setFields] = useState<LeadFields>(draft);
  const [status, setStatus] = useState<Status>("editing");
  const [errors, setErrors] = useState<Partial<Record<keyof LeadFields, string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const firstName = chatConfig.persona.subjectName.split(" ")[0];

  async function confirm() {
    const parsed = leadFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof LeadFields;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    if (!conversationId || !conversationToken) {
      setFailure("This chat session isn't valid any more. Please use the contact form.");
      return;
    }
    setStatus("sending");
    setFailure(null);
    try {
      const res = await fetch("/api/chat/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leadId, conversationId, conversationToken, lead: parsed.data }),
      });
      if (res.ok) {
        setStatus("sent");
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setFailure(body.error ?? "Something went wrong. Please try again.");
    } catch {
      setFailure("Something went wrong. Please try again.");
    }
    setStatus("editing");
  }

  if (status === "sent") {
    return (
      <p role="status" className="text-accent-text flex items-center gap-1.5 text-sm">
        <Check aria-hidden="true" className="size-4" />
        Sent. {firstName} will get back to you at {fields.email}.
      </p>
    );
  }
  if (status === "cancelled") {
    return <p className="text-muted text-sm">Not sent. Your details weren&apos;t saved.</p>;
  }

  const field = (key: keyof LeadFields, label: string, input: React.ReactNode) => (
    <div className="space-y-1">
      <label htmlFor={`${id}-${key}`} className="text-muted block text-xs">
        {label}
      </label>
      {input}
      {errors[key] ? (
        <p id={`${id}-${key}-error`} className="text-xs text-red-400">
          {errors[key]}
        </p>
      ) : null}
    </div>
  );
  const bind = (key: keyof LeadFields) => ({
    id: `${id}-${key}`,
    value: fields[key],
    onChange: (e: { target: { value: string } }) =>
      setFields((f) => ({ ...f, [key]: e.target.value })),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${id}-${key}-error` : undefined,
    className: inputClass,
  });

  return (
    <form
      aria-labelledby={`${id}-title`}
      onSubmit={(e) => {
        e.preventDefault();
        void confirm();
      }}
      className="border-accent/40 space-y-3 rounded-lg border p-3"
    >
      <p id={`${id}-title`} className="text-accent-text font-mono text-xs">
        {"// check your details"}
      </p>
      {field("name", "Name", <input {...bind("name")} autoComplete="name" />)}
      {field("email", "Email", <input {...bind("email")} type="email" autoComplete="email" />)}
      {field(
        "company",
        "Company (optional)",
        <input {...bind("company")} autoComplete="organization" />,
      )}
      {field(
        "topic",
        "About",
        <select {...bind("topic")}>
          {chatConfig.leads.topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>,
      )}
      {field("note", "Note (optional)", <textarea {...bind("note")} rows={3} />)}
      {failure ? (
        <p role="alert" className="text-sm text-red-400">
          {failure}
        </p>
      ) : null}
      <p className="text-muted text-xs">
        Nothing is sent until you confirm. {firstName} gets these details
        {withJobDescription ? " and the job description" : ""} by email.
      </p>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="bg-accent text-on-accent rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Confirm and send"}
        </button>
        <button
          type="button"
          onClick={() => setStatus("cancelled")}
          disabled={status === "sending"}
          className="border-line text-ink hover:border-accent rounded-md border px-3 py-1.5 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
