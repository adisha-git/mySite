import { z } from "zod";
import { chatConfig } from "./config";

/**
 * Lead capture. The captureLead tool only drafts a lead; the widget shows it
 * as a card the visitor can edit, and nothing is saved or emailed until they
 * click Confirm, which posts to the lead endpoint. Safe to import in the browser.
 */

// Single-line fields go into the email subject: no control characters, line or
// paragraph separators, or bidi overrides (same rules as the contact form).
const singleLine = /^[^\u0000-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]*$/;
const multiLine = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]*$/;

export const leadFieldsSchema = z.object({
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
  topic: z.enum(chatConfig.leads.topics, "Please choose what it's about."),
  note: z
    .string()
    .trim()
    .max(2000, "Please keep the note under 2,000 characters.")
    .regex(multiLine, "The note contains unsupported characters."),
});

export type LeadFields = z.infer<typeof leadFieldsSchema>;

/** What the model passes to captureLead: only what the visitor actually said. */
export const captureLeadInputSchema = z.object({
  name: z.string().max(100).describe("The visitor's name, as they gave it."),
  email: z.string().max(254).describe("The visitor's email address, as they gave it."),
  company: z.string().max(120).optional().describe("Their company, only if they mentioned one."),
  topic: z.enum(chatConfig.leads.topics).describe("What they want to talk to him about."),
  note: z
    .string()
    .max(2000)
    .optional()
    .describe("A short note in the visitor's words about what they want, e.g. the role."),
});

/** The body the widget posts when the visitor clicks Confirm. */
export const leadConfirmSchema = z.object({
  /** Generated once per card; reused on retries so a lead is saved and emailed once. */
  leadId: z.uuid(),
  conversationId: z.uuid(),
  conversationToken: z.string().min(1).max(128),
  lead: leadFieldsSchema,
});

export type LeadConfirmRequest = z.infer<typeof leadConfirmSchema>;
