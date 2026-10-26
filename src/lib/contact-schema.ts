import { z } from "zod";
import { enquiryTypes } from "@/data/profile";

// Single-line fields end up in the email subject, so line breaks aren't allowed.
const singleLine = /^[^\r\n]*$/;

/** Shared by the contact form (client) and /api/contact (server). */
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(100, "That name is a bit long.")
    .regex(singleLine, "Please keep your name on one line."),
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
    .regex(singleLine, "Please keep the company name on one line."),
  enquiryType: z.enum(enquiryTypes, "Please choose an enquiry type."),
  message: z
    .string()
    .trim()
    .min(10, "Please write at least a sentence or two.")
    .max(5000, "Please keep your message under 5,000 characters."),
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
