import { createHmac, timingSafeEqual } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { fitResultSchema, fitToText } from "./fit";
import { MAX_JD_CHARS, MAX_MESSAGE_CHARS, MAX_MESSAGES } from "./limits";

/**
 * Request guards for the chat API: input limits, bot checks, IP hashing and
 * rate limits.
 *
 * Rate limits live in Upstash Redis so they hold across Vercel instances:
 *  - per hashed IP: 10 messages a minute and 60 a day (sliding windows)
 *  - per hashed IP: 5 confirmed leads an hour
 *  - per hashed IP: 5 job-description fit checks an hour (they use Claude Sonnet)
 * Without Redis credentials (e.g. local dev) it falls back to an in-memory
 * counter, which only limits bursts hitting a single instance.
 *
 * Bot check: the first message of a conversation needs a Cloudflare Turnstile
 * token. The reply carries a signed conversation token, and later messages
 * in that conversation present it instead.
 */

export { MAX_JD_CHARS, MAX_MESSAGE_CHARS, MAX_MESSAGES };
export const MAX_BODY_BYTES = 64 * 1024;

const PER_MINUTE = { max: 10, windowMs: 60 * 1000 } as const;
const PER_DAY = { max: 60, windowMs: 24 * 60 * 60 * 1000 } as const;
const LEADS_PER_HOUR = { max: 5, windowMs: 60 * 60 * 1000 } as const;
const FITS_PER_HOUR = { max: 5, windowMs: 60 * 60 * 1000 } as const;

// ---------- Input ----------

const textPart = z.object({ type: z.literal("text"), text: z.string() });
// A fit card shown earlier; resent to the model as plain text.
const fitPart = z.object({ type: z.literal("data-fit"), data: fitResultSchema });
// Other UI parts (step markers, sources) may come back from the client; they're ignored.
const otherPart = z.object({ type: z.string().max(64) }).loose();

const messageSchema = z.object({
  id: z.string().max(128),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.union([textPart, fitPart, otherPart])).max(50),
});

export type ChatMessage = { role: "user" | "assistant"; text: string };

export const chatRequestSchema = z
  .object({
    conversationId: z.uuid().optional(),
    conversationToken: z.string().max(128).optional(),
    turnstileToken: z.string().max(2048).optional(),
    /** "jd" when the visitor is pasting a job description, which may be longer. */
    mode: z.enum(["chat", "jd"]).default("chat"),
    messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  })
  .transform(({ messages, ...rest }) => ({
    ...rest,
    messages: messages
      .map((m): ChatMessage => ({
        role: m.role,
        text: m.parts
          .map((p) => {
            if (p.type === "text" && "text" in p) return p.text as string;
            if (p.type === "data-fit" && "data" in p) {
              return fitToText(p.data as z.infer<typeof fitResultSchema>);
            }
            return "";
          })
          .filter(Boolean)
          .join("\n")
          .trim(),
      }))
      // An assistant turn that only used a tool (e.g. scrolled the page) has no text to resend.
      .filter((m) => m.role === "user" || m.text.length > 0),
  }))
  .refine((r) => r.messages.at(-1)?.role === "user", "The last message must be from the user.")
  .refine((r) => r.messages.every((m) => m.text.length > 0), "Messages can't be empty.")
  .refine(
    (r) => r.messages.at(-1)!.text.length <= (r.mode === "jd" ? MAX_JD_CHARS : MAX_MESSAGE_CHARS),
    `Messages can be at most ${MAX_MESSAGE_CHARS} characters (${MAX_JD_CHARS} for a job description).`,
  )
  // Earlier messages may include a job description pasted before.
  .refine(
    (r) => r.messages.every((m) => m.role !== "user" || m.text.length <= MAX_JD_CHARS),
    `Messages can be at most ${MAX_JD_CHARS} characters.`,
  );

// ---------- Request checks ----------

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** Only accept posts from this site's own pages. */
export function isSameOrigin(request: Request): boolean {
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
 * Reads the body as UTF-8, giving up as soon as it passes `maxBytes` so an
 * oversized request is never buffered in full. Returns null when too large.
 * Throws on invalid UTF-8.
 */
export async function readBodyCapped(
  request: Request,
  maxBytes = MAX_BODY_BYTES,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(parts));
}

// ---------- IP hashing and signing ----------

/**
 * The server secret for hashing IPs and signing conversation tokens. Production
 * must set IP_HASH_SALT: without it, anyone could forge a conversation token.
 */
export function serverSecret(): string | null {
  const salt = process.env.IP_HASH_SALT;
  if (salt) return salt;
  return process.env.NODE_ENV === "production" ? null : "ask-about-adisha-dev";
}

/** IPs are only ever stored or used as keys in hashed form. */
export function hashIp(ip: string): string {
  return createHmac("sha256", serverSecret() ?? "unset")
    .update(ip)
    .digest("hex");
}

/** Proves a conversation started with a passed bot check. */
export function signConversation(conversationId: string, secret: string): string {
  return createHmac("sha256", secret).update(`conversation:${conversationId}`).digest("base64url");
}

export function verifyConversation(conversationId: string, token: string, secret: string): boolean {
  const expected = Buffer.from(signConversation(conversationId, secret));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// ---------- Turnstile ----------

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
/** Cloudflare's published test secret: always passes. Used only in local development. */
export const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export function turnstileSecret(): string | null {
  if (process.env.NODE_ENV === "development") return TURNSTILE_TEST_SECRET;
  return process.env.TURNSTILE_SECRET_KEY || null;
}

/** Server-side Turnstile check. Fails closed: a network error or timeout counts as a failure. */
export async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  try {
    const res = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: unknown };
    return data.success === true;
  } catch {
    return false;
  }
}

// ---------- Conversations ----------

export type ConversationCheck =
  | { ok: true; conversationId: string; isNew: boolean }
  | { ok: false; status: number; error: string; code?: "bot-check"; misconfigured?: boolean };

/**
 * A later message must carry the token issued when its conversation passed the
 * bot check; the first message of a conversation must pass Turnstile.
 */
export async function checkConversation(
  request: { conversationId?: string; conversationToken?: string; turnstileToken?: string },
  secret: string,
): Promise<ConversationCheck> {
  if (request.conversationId) {
    const token = request.conversationToken;
    if (!token || !verifyConversation(request.conversationId, token, secret)) {
      return {
        ok: false,
        status: 403,
        error: "This chat session isn't valid any more. Please refresh the page and try again.",
      };
    }
    return { ok: true, conversationId: request.conversationId, isNew: false };
  }
  const turnstile = turnstileSecret();
  if (!turnstile) {
    return {
      ok: false,
      status: 503,
      error: "TURNSTILE_SECRET_KEY is not set",
      misconfigured: true,
    };
  }
  if (!request.turnstileToken || !(await verifyTurnstile(request.turnstileToken, turnstile))) {
    return {
      ok: false,
      status: 403,
      error: "We couldn't confirm you're not a bot. Please try again.",
      code: "bot-check",
    };
  }
  return { ok: true, conversationId: crypto.randomUUID(), isNew: true };
}

// ---------- Rate limiting ----------

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = redis
  ? [
      new Ratelimit({
        redis,
        prefix: "chat:min",
        limiter: Ratelimit.slidingWindow(PER_MINUTE.max, "1 m"),
      }),
      new Ratelimit({
        redis,
        prefix: "chat:day",
        limiter: Ratelimit.slidingWindow(PER_DAY.max, "1 d"),
      }),
    ]
  : null;

const hits = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, max: number, windowMs: number, now: number): RateLimitResult {
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
  }
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > max) return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  return { ok: true };
}

export async function rateLimitChat(ipHash: string, now = Date.now()): Promise<RateLimitResult> {
  if (!limiters) {
    for (const [name, { max, windowMs }] of [
      ["min", PER_MINUTE],
      ["day", PER_DAY],
    ] as const) {
      const result = memoryLimit(`${name}:${ipHash}`, max, windowMs, now);
      if (!result.ok) return result;
    }
    return { ok: true };
  }
  for (const limiter of limiters) {
    const { success, reset } = await limiter.limit(ipHash);
    if (!success) return { ok: false, retryAfter: Math.max(1, Math.ceil((reset - now) / 1000)) };
  }
  return { ok: true };
}

function hourlyLimit(prefix: string, { max, windowMs }: { max: number; windowMs: number }) {
  const limiter = redis
    ? new Ratelimit({ redis, prefix, limiter: Ratelimit.slidingWindow(max, "1 h") })
    : null;
  return async (ipHash: string, now = Date.now()): Promise<RateLimitResult> => {
    if (!limiter) return memoryLimit(`${prefix}:${ipHash}`, max, windowMs, now);
    const { success, reset } = await limiter.limit(ipHash);
    return success
      ? { ok: true }
      : { ok: false, retryAfter: Math.max(1, Math.ceil((reset - now) / 1000)) };
  };
}

export const rateLimitLead = hourlyLimit("chat:lead", LEADS_PER_HOUR);
export const rateLimitFit = hourlyLimit("chat:fit", FITS_PER_HOUR);

/** Test hook: clears the in-memory fallback counters. */
export function resetMemoryRateLimit() {
  hits.clear();
}
