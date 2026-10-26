import type { ContactInput } from "@/lib/contact-schema";

/**
 * Escapes text for HTML element content and quoted attribute values.
 * Every visitor-supplied value must pass through this before it goes into the HTML email.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type EmailFields = Pick<ContactInput, "name" | "email" | "company" | "enquiryType" | "message">;

/** Builds the subject, plain-text and HTML bodies for a contact-form notification. */
export function buildContactEmail(fields: EmailFields, receivedAt: Date) {
  const { name, email, company, enquiryType, message } = fields;

  const received = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(receivedAt);

  const rows: [string, string][] = [
    ["Name", name],
    ["Email", email],
    ["Company", company || "—"],
    ["Regarding", enquiryType],
    ["Received", `${received} (Brisbane)`],
  ];

  // Name and company are validated as single-line with no control characters,
  // so they can't break out of the subject line.
  const subject = `[Portfolio · ${enquiryType}] ${name}${company ? ` — ${company}` : ""}`;

  const text = [
    "New message from your portfolio website",
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    message,
    "",
    "—",
    `Reply to this email to respond to ${name} directly.`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#F6F8FB">
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#0B1220;max-width:600px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:12px;padding:24px">
    <h2 style="margin:0 0 16px;font-size:18px;font-weight:600">New message from your portfolio website</h2>
    <table role="presentation" style="border-collapse:collapse;margin-bottom:16px;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:4px 16px 4px 0;color:#526071;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}
    </table>
    <div style="border-top:1px solid #E2E8F0;padding-top:16px;font-size:15px;line-height:1.6;white-space:pre-wrap;word-break:break-word">${escapeHtml(message)}</div>
    <p style="margin:24px 0 0;color:#526071;font-size:12px">Reply to this email to respond to ${escapeHtml(name)} directly.</p>
  </div>
</body></html>`;

  return { subject, text, html };
}
