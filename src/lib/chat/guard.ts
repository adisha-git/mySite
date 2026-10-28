import { createHmac } from "node:crypto";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { MAX_MESSAGE_CHARS, MAX_MESSAGES } from "./limits";

/**
 * Request guards for the chat API: input limits, IP hashing and rate limits.
 *
 * Rate limits live in Upstash Redis so they hold across Vercel instances:
 *  - per hashed IP: 10 messages a minute and 60 a day (sliding windows)
 * Without Redis credentials (e.g. local dev) it falls back to an in-memory
 * counter, which only limits bursts hitting a single instance.
 */

export { MAX_MESSAGE_CHARS, MAX_MESSAGES };
export const MAX_BODY_BYTES = 64 * 1024;

const PER_MINUTE = { max: 10, windowMs: 60 * 1000 } as const;
const PER_DAY = { max: 60, windowMs: 24 * 60 * 60 * 1000 } as const;

// ---------- Input ----------

const textPart = z.object({ type: z.literal("text"), text: z.string() });
// Other UI parts (step markers, sources) may come back from the client; they're ignored.
const otherPart = z.object({ type: z.string().max(64) }).loose();

const messageSchema = z.object({
  id: z.string().max(128),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.union([textPart, otherPart])).max(50),
});

export type ChatMessage = { role: "user" | "assistant"; text: string };

export const chatRequestSchema = z
  .object({
    conversationId: z.uuid().optional(),
    messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  })
  .transform(({ conversationId, messages }) => ({
    conversationId,
    messages: messages
      .map((m): ChatMessage => ({
        role: m.role,
        text: m.parts
          .filter((p): p is z.infer<typeof textPart> => p.type === "text" && "text" in p)
          .map((p) => p.text)
          .join("\n")
          .trim(),
      }))
      // An assistant turn that only used a tool (e.g. scrolled the page) has no text to resend.
      .filter((m) => m.role === "user" || m.text.length > 0),
  }))
  .refine((r) => r.messages.at(-1)?.role === "user", "The last message must be from the user.")
  .refine((r) => r.messages.every((m) => m.text.length > 0), "Messages can't be empty.")
  .refine(
    (r) => r.messages.every((m) => m.role !== "user" || m.text.length <= MAX_MESSAGE_CHARS),
    `Messages can be at most ${MAX_MESSAGE_CHARS} characters.`,
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

// ---------- IP hashing ----------

/** IPs are only ever stored or used as keys in hashed form. Set IP_HASH_SALT in production. */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "ask-about-adisha";
  return createHmac("sha256", salt).update(ip).digest("hex");
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

/** Test hook: clears the in-memory fallback counters. */
export function resetMemoryRateLimit() {
  hits.clear();
}
