"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, m } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm, type FieldError } from "react-hook-form";
import { enquiryTypes } from "@/data/profile";
import { contactSchema, type ContactInput } from "@/lib/contact-schema";
import { PREFILL_EVENT, type ContactPrefill } from "./contact-prefill";
import { buttonClass } from "./ui";

type Status = { state: "idle" } | { state: "success" } | { state: "error"; message: string };

const fieldClass =
  "block w-full rounded-xl border border-line bg-paper px-4 py-3 text-ink placeholder:text-muted/70 transition-colors hover:border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 aria-[invalid=true]:border-red-600 dark:aria-[invalid=true]:border-red-400";

function Field({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: FieldError;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-ink mb-2 block text-sm font-medium">
        {label}
        {required ? (
          <span className="text-accent-text" aria-hidden="true">
            {" "}
            *
          </span>
        ) : (
          <span className="text-muted font-normal"> (optional)</span>
        )}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error?.message ? (
          <m.p
            id={`${id}-error`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 flex items-center gap-1.5 text-sm text-red-700 dark:text-red-300"
          >
            <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
            {error.message}
          </m.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const defaults: ContactInput = {
  name: "",
  email: "",
  company: "",
  enquiryType: "Full-time role",
  message: "",
  website: "",
};

export function ContactForm() {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaults,
    mode: "onTouched",
  });

  // "Request a demo" on a project card pre-fills the enquiry.
  useEffect(() => {
    function onPrefill(event: Event) {
      const { enquiryType, message } = (event as CustomEvent<ContactPrefill>).detail;
      setStatus({ state: "idle" });
      setValue("enquiryType", enquiryType, { shouldDirty: true });
      if (message) setValue("message", message, { shouldDirty: true });
      setTimeout(() => setFocus("name"), 600);
    }
    window.addEventListener(PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_EVENT, onPrefill);
  }, [setValue, setFocus]);

  async function onSubmit(values: ContactInput) {
    setStatus({ state: "idle" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => null);
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Something went wrong. Please try again or email me directly.";
        setStatus({ state: "error", message });
        return;
      }
      reset(defaults);
      setStatus({ state: "success" });
    } catch {
      setStatus({
        state: "error",
        message: "Network error — please check your connection and try again.",
      });
    }
  }

  const describedBy = (name: keyof ContactInput) => (errors[name] ? `${name}-error` : undefined);

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="border-line bg-surface relative rounded-2xl border p-6 sm:p-8"
      aria-describedby="form-required-note"
    >
      <p id="form-required-note" className="text-muted mb-6 text-sm">
        Fields marked <span className="text-accent-text">*</span> are required.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Name" required error={errors.name}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            aria-required="true"
            aria-invalid={errors.name ? true : undefined}
            aria-describedby={describedBy("name")}
            className={fieldClass}
            {...register("name")}
          />
        </Field>
        <Field id="email" label="Email" required error={errors.email}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-required="true"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={describedBy("email")}
            className={fieldClass}
            {...register("email")}
          />
        </Field>
        <Field id="company" label="Company" error={errors.company}>
          <input
            id="company"
            type="text"
            autoComplete="organization"
            aria-invalid={errors.company ? true : undefined}
            aria-describedby={describedBy("company")}
            className={fieldClass}
            {...register("company")}
          />
        </Field>
        <Field id="enquiryType" label="What's this about?" required error={errors.enquiryType}>
          <select
            id="enquiryType"
            aria-required="true"
            aria-invalid={errors.enquiryType ? true : undefined}
            aria-describedby={describedBy("enquiryType")}
            className={`${fieldClass} appearance-none bg-[url("data:image/svg+xml,%3Csvg_xmlns='http://www.w3.org/2000/svg'_width='12'_height='12'_viewBox='0_0_24_24'_fill='none'_stroke='%230E7490'_stroke-width='2'%3E%3Cpath_d='m6_9_6_6_6-6'/%3E%3C/svg%3E")] bg-[position:right_1rem_center] bg-no-repeat pr-10`}
            {...register("enquiryType")}
          >
            {enquiryTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field id="message" label="Message" required error={errors.message}>
            <textarea
              id="message"
              rows={6}
              aria-required="true"
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={describedBy("message")}
              className={`${fieldClass} min-h-36 resize-y`}
              {...register("message")}
            />
          </Field>
        </div>
      </div>

      {/* Honeypot: hidden from people and assistive tech; bots tend to fill every field. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isSubmitting}
          className={buttonClass("primary", "min-w-40")}
        >
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            <>
              <Send aria-hidden="true" className="size-4" />
              Send message
            </>
          )}
        </button>

        <div aria-live="polite" className="min-h-6 text-sm">
          <AnimatePresence mode="wait">
            {status.state === "success" ? (
              <m.p
                key="success"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300"
              >
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Thanks — your message is on its way. I&apos;ll reply soon.
              </m.p>
            ) : status.state === "error" ? (
              <m.p
                key="error"
                role="alert"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-700 dark:text-red-300"
              >
                <AlertCircle aria-hidden="true" className="size-4 shrink-0" />
                {status.message}
              </m.p>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </form>
  );
}
