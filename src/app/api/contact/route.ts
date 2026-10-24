import { Resend } from "resend";
import { z } from "zod";
import { contactSchema } from "@/lib/contact-schema";
import { rateLimit } from "@/lib/rate-limit";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
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
  const limit = rateLimit(clientIp(request));
  if (!limit.ok) {
    return Response.json(
      { error: "Too many messages — please try again in a few minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot filled in: pretend success so bots learn nothing.
  if (
    typeof body === "object" &&
    body !== null &&
    "website" in body &&
    typeof body.website === "string" &&
    body.website.length > 0
  ) {
    return Response.json({ ok: true });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Please check the form and try again.",
        issues: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 422 },
    );
  }

  const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
    console.error("[contact] Missing RESEND_API_KEY, CONTACT_TO_EMAIL or CONTACT_FROM_EMAIL");
    return Response.json(
      { error: "The contact form isn't configured yet. Please email me directly." },
      { status: 503 },
    );
  }

  const { name, email, company, enquiryType, message } = parsed.data;
  const rows: [string, string][] = [
    ["Name", name],
    ["Email", email],
    ["Company", company || "—"],
    ["Regarding", enquiryType],
  ];

  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${message}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0B1220;max-width:600px">
      <h2 style="font-family:Georgia,serif;font-weight:500">New message from your portfolio</h2>
      <table style="border-collapse:collapse;margin-bottom:16px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:4px 16px 4px 0;color:#526071">${k}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      <div style="border-top:1px solid #E2E8F0;padding-top:16px;white-space:pre-wrap">${escapeHtml(message)}</div>
    </div>`;

  try {
    const resend = new Resend(RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `[${enquiryType}] ${name}${company ? ` — ${company}` : ""}`,
      text,
      html,
    });
    if (error) {
      console.error("[contact] Resend error", error);
      return Response.json(
        { error: "Sorry — the message couldn't be sent. Please email me directly." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[contact] Unexpected error", error);
    return Response.json(
      { error: "Sorry — something went wrong. Please email me directly." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
}
