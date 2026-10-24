import { z } from "zod";
import { enquiryTypes } from "@/data/profile";

/** Shared by the contact form (client) and /api/contact (server). */
export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100, "That name is a bit long."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .max(200)
    .pipe(z.email("Please enter a valid email address.")),
  company: z.string().trim().max(120, "Please shorten the company name."),
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
