import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Upstash is mocked so tests never touch the production Redis database.
const { limitByPrefix, constructed } = vi.hoisted(() => ({
  limitByPrefix: new Map<string, ReturnType<typeof vi.fn>>(),
  constructed: [] as { url: string; token: string }[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(opts: { url: string; token: string }) {
      constructed.push(opts);
    }
  },
}));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = (max: number, window: string) => ({ kind: "sliding", max, window });
    static fixedWindow = (max: number, window: string) => ({ kind: "fixed", max, window });
    limiter: unknown;
    limit: ReturnType<typeof vi.fn>;
    constructor(opts: { prefix: string; limiter: unknown }) {
      this.limiter = opts.limiter;
      this.limit = vi.fn();
      limitByPrefix.set(opts.prefix, this.limit);
    }
  }
  return { Ratelimit };
});

async function load() {
  vi.resetModules();
  limitByPrefix.clear();
  constructed.length = 0;
  return import("@/lib/rate-limit");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("with Redis configured via the Vercel KV variables", () => {
  beforeEach(() => {
    vi.stubEnv("KV_REST_API_URL", "https://fake.upstash.test");
    vi.stubEnv("KV_REST_API_TOKEN", "fake-token");
  });

  it("uses KV_REST_API_URL / KV_REST_API_TOKEN", async () => {
    const mod = await load();
    expect(mod.isDistributedRateLimit).toBe(true);
    expect(constructed).toEqual([{ url: "https://fake.upstash.test", token: "fake-token" }]);
  });

  it("allows a request when both limits pass, checking the IP first", async () => {
    const { rateLimitContact } = await load();
    const ip = limitByPrefix.get("contact:ip")!;
    const global = limitByPrefix.get("contact:global")!;
    ip.mockResolvedValue({ success: true, reset: Date.now() + 1000 });
    global.mockResolvedValue({ success: true, reset: Date.now() + 1000 });

    expect(await rateLimitContact("203.0.113.7")).toEqual({ ok: true });
    expect(ip).toHaveBeenCalledWith("203.0.113.7");
    expect(global).toHaveBeenCalledWith("all");
  });

  it("blocks on the per-IP limit without charging the global budget", async () => {
    const { rateLimitContact } = await load();
    const ip = limitByPrefix.get("contact:ip")!;
    const global = limitByPrefix.get("contact:global")!;
    ip.mockResolvedValue({ success: false, reset: Date.now() + 90_000 });

    const result = await rateLimitContact("203.0.113.7");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.retryAfter).toBeGreaterThanOrEqual(89);
    expect(global).not.toHaveBeenCalled();
  });

  it("blocks when the site-wide daily limit is reached", async () => {
    const { rateLimitContact } = await load();
    limitByPrefix.get("contact:ip")!.mockResolvedValue({ success: true, reset: 0 });
    limitByPrefix
      .get("contact:global")!
      .mockResolvedValue({ success: false, reset: Date.now() + 3_600_000 });
    expect((await rateLimitContact("203.0.113.7")).ok).toBe(false);
  });

  it("falls back to 5 per IP in memory if Redis fails, and logs no details", async () => {
    const { rateLimitContact } = await load();
    limitByPrefix
      .get("contact:ip")!
      .mockRejectedValue(new Error("connect ECONNREFUSED fake-token@fake.upstash.test"));

    const results = [];
    for (let i = 0; i < 6; i++) results.push((await rateLimitContact("198.51.100.1")).ok);
    expect(results).toEqual([true, true, true, true, true, false]);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toMatch(
      /fake-token|ECONNREFUSED/,
    );
  });
});

describe("without Redis credentials", () => {
  it("falls back to an in-memory limit of 5 per IP", async () => {
    const { rateLimitContact, isDistributedRateLimit } = await load();
    expect(isDistributedRateLimit).toBe(false);
    const results = [];
    for (let i = 0; i < 6; i++) results.push((await rateLimitContact("192.0.2.1")).ok);
    expect(results).toEqual([true, true, true, true, true, false]);
    // A different IP has its own allowance.
    expect((await rateLimitContact("192.0.2.2")).ok).toBe(true);
  });
});
