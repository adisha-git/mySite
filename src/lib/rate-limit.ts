import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Contact-form rate limiting.
 *
 * On Vercel each request can land on a different function instance, so the
 * real limits live in Upstash Redis (shared across instances and regions):
 *  - per IP: 5 messages per 10 minutes
 *  - site-wide: 50 messages per day, so a botnet can't burn the Resend quota
 *
 * Without Redis credentials (e.g. local dev) it falls back to an in-memory
 * counter, which only limits bursts hitting a single instance.
 */
const PER_IP = { max: 5, windowMs: 10 * 60 * 1000 } as const;
const GLOBAL = { max: 50, windowMs: 24 * 60 * 60 * 1000 } as const;

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

// The Vercel Marketplace Upstash integration sets KV_REST_API_*; a direct
// Upstash database uses UPSTASH_REDIS_REST_*. Accept either.
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

const limiters = redis
  ? {
      ip: new Ratelimit({
        redis,
        prefix: "contact:ip",
        limiter: Ratelimit.slidingWindow(PER_IP.max, "10 m"),
      }),
      global: new Ratelimit({
        redis,
        prefix: "contact:global",
        limiter: Ratelimit.fixedWindow(GLOBAL.max, "1 d"),
      }),
    }
  : null;

export const isDistributedRateLimit = limiters !== null;

// ---------- In-memory fallback ----------

const hits = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, max: number, windowMs: number, now: number): RateLimitResult {
  // Opportunistic cleanup so the map can't grow without bound.
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

// ---------- Public API ----------

export async function rateLimitContact(ip: string): Promise<RateLimitResult> {
  const now = Date.now();

  if (!limiters) {
    const perIp = memoryLimit(`ip:${ip}`, PER_IP.max, PER_IP.windowMs, now);
    if (!perIp.ok) return perIp;
    return memoryLimit("global", GLOBAL.max, GLOBAL.windowMs, now);
  }

  try {
    // Check the IP first so one noisy client can't eat into the global budget.
    const perIp = await limiters.ip.limit(ip);
    if (!perIp.success) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((perIp.reset - now) / 1000)) };
    }
    const global = await limiters.global.limit("all");
    if (!global.success) {
      return { ok: false, retryAfter: Math.max(1, Math.ceil((global.reset - now) / 1000)) };
    }
    return { ok: true };
  } catch (error) {
    // Redis outage: fall back to the per-instance limit rather than blocking real visitors.
    console.error(
      "[contact] Rate limiter unavailable, using in-memory fallback:",
      error instanceof Error ? error.name : "unknown error",
    );
    return memoryLimit(`ip:${ip}`, PER_IP.max, PER_IP.windowMs, now);
  }
}
