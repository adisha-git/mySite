import { Resend } from "resend";
import { z } from "zod";
import { contactRequestSchema } from "@/lib/contact-schema";
import { rateLimitContact } from "@/lib/rate-limit";

/** Sender is fixed to the domain verified in Resend; the visitor's address only ever goes in replyTo. */
const FROM = "Portfolio Website <contact@adishamadhushanka.com.au>";
const MAX_BODY_BYTES = 16 * 1024;
/** Humans take longer than this to fill in the form; most bots don't. */
const MIN_FILL_MS = 3000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

const ok = () => Response.json({ ok: true });
const fail = (status: number, error: string, init?: ResponseInit) =>
  Response.json({ error }, { ...init, status });

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** Only accept posts from this site's own pages. */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Invalid request.");
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return fail(415, "Invalid request.");
  }

  const limit = await rateLimitContact(clientIp(request));
  if (!limit.ok) {
    return fail(429, "Too many messages — please try again a bit later.", {
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return fail(413, "That message is too long.");
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid request.");
  }

  // Honeypot filled in: pretend success so bots learn nothing.
  if (
    typeof body === "object" &&
    body !== null &&
    "website" in body &&
    typeof body.website === "string" &&
    body.website.length > 0
  ) {
    return ok();
  }

  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Please check the form and try again.",
        issues: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 422 },
    );
  }

  const { name, email, company, enquiryType, message, startedAt, submissionId } = parsed.data;

  // Submitted implausibly fast (or with a nonsense timestamp): treat as a bot, quietly.
  const age = Date.now() - startedAt;
  if (age < MIN_FILL_MS || age > MAX_FORM_AGE_MS) return ok();

  const { RESEND_API_KEY, CONTACT_TO_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL) {
    console.error("[contact] Not configured: RESEND_API_KEY and/or CONTACT_TO_EMAIL is missing");
    return fail(503, "The contact form isn't available right now. Please email me directly.");
  }

  const received = new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date());

  const rows: [string, string][] = [
    ["Name", name],
    ["Email", email],
    ["Company", company || "—"],
    ["Regarding", enquiryType],
    ["Received", `${received} (Brisbane)`],
  ];

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
            `<tr><td style="padding:4px 16px 4px 0;color:#526071;vertical-align:top">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
        )
        .join("")}
    </table>
    <div style="border-top:1px solid #E2E8F0;padding-top:16px;font-size:15px;line-height:1.6;white-space:pre-wrap;word-break:break-word">${escapeHtml(message)}</div>
    <p style="margin:24px 0 0;color:#526071;font-size:12px">Reply to this email to respond to ${escapeHtml(name)} directly.</p>
  </div>
</body></html>`;

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send(
      {
        from: FROM,
        to: CONTACT_TO_EMAIL,
        replyTo: email,
        subject: `[Portfolio · ${enquiryType}] ${name}${company ? ` — ${company}` : ""}`,
        text,
        html,
      },
      // Same submissionId on a retry → Resend sends at most one email.
      { idempotencyKey: `contact/${submissionId}` },
    );
    if (error) {
      // Log the error type only — never the key or the visitor's details.
      console.error(`[contact] Resend rejected the email: ${error.name} (${error.statusCode})`);
      return fail(502, "Sorry — your message couldn't be sent. Please email me directly.");
    }
  } catch (error) {
    console.error(
      "[contact] Unexpected error sending email:",
      error instanceof Error ? error.name : "unknown",
    );
    return fail(500, "Sorry — something went wrong. Please email me directly.");
  }

  return ok();
}
