import { z } from "zod";
import { enquiryTypes } from "@/data/profile";

// Single-line fields end up in the email subject. Reject line breaks and every other
// control character (C0, DEL, C1 incl. U+0085), Unicode line/paragraph separators and
// bidi overrides, which could split or visually spoof the subject. Joiners (ZWJ/ZWNJ)
// stay allowed because scripts such as Sinhala need them.
const singleLine = /^[^\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]*$/;
// The message may contain tabs and line breaks, but no other control characters.
const multiLine = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]*$/;

/** Shared by the contact form (client) and /api/contact (server). */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(100, "That name is a bit long.")
    .regex(singleLine, "Please use one line and only regular characters."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .max(254, "That email address is too long.")
    .pipe(z.email("Please enter a valid email address.")),
  company: z
    .string()
    .trim()
    .max(120, "Please shorten the company name.")
    .regex(singleLine, "Please use one line and only regular characters."),
  enquiryType: z.enum(enquiryTypes, "Please choose an enquiry type."),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least a sentence or two.")
    .max(5000, "Please keep your message under 5,000 characters.")
    .regex(multiLine, "Your message contains unsupported characters."),
  /** Honeypot — real users never see or fill this. */
  website: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/** What the browser actually POSTs: the fields plus anti-spam / dedupe metadata. */
export const contactRequestSchema = contactSchema.extend({
  /** When the form was first shown (ms since epoch) — for the minimum fill-time check. */
  startedAt: z.number().int().positive(),
  /** One ID per message; reused on retries so Resend never sends the same message twice. */
  submissionId: z.uuid(),
});

export type ContactRequest = z.infer<typeof contactRequestSchema>;
