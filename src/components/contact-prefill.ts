import type { EnquiryType } from "@/data/profile";

export const PREFILL_EVENT = "contact:prefill";

export interface ContactPrefill {
  enquiryType: EnquiryType;
  message?: string;
}

/** Scrolls to the contact form and asks it to pre-fill the given fields. */
export function requestContactPrefill(detail: ContactPrefill) {
  window.dispatchEvent(new CustomEvent<ContactPrefill>(PREFILL_EVENT, { detail }));
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
