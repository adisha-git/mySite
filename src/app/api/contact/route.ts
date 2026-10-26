import { Resend } from "resend";
import { z } from "zod";
import { buildContactEmail } from "@/lib/contact-email";
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

/**
 * Reads the body as UTF-8, giving up as soon as it passes `maxBytes` so an oversized
 * request is never buffered in full. Returns null when the body is too large.
 * Throws on invalid UTF-8.
 */
async function readBodyCapped(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
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
    const raw = await readBodyCapped(request, MAX_BODY_BYTES);
    if (raw === null) return fail(413, "That message is too long.");
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

  const { email, startedAt, submissionId } = parsed.data;

  // Submitted implausibly fast (or with a nonsense timestamp): treat as a bot, quietly.
  const age = Date.now() - startedAt;
  if (age < MIN_FILL_MS || age > MAX_FORM_AGE_MS) return ok();

  const { RESEND_API_KEY, CONTACT_TO_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL) {
    console.error("[contact] Not configured: RESEND_API_KEY and/or CONTACT_TO_EMAIL is missing");
    return fail(503, "The contact form isn't available right now. Please email me directly.");
  }

  const { subject, text, html } = buildContactEmail(parsed.data, new Date());

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send(
      {
        from: FROM,
        to: CONTACT_TO_EMAIL,
        replyTo: email,
        subject,
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
