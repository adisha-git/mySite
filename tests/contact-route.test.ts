import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Email delivery and rate limiting are mocked: these tests never call Resend or Redis.
const { send, rateLimitContact } = vi.hoisted(() => ({
  send: vi.fn(),
  rateLimitContact: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimitContact }));

import { POST } from "@/app/api/contact/route";

const ORIGIN = "https://www.example.com";
const FROM = "Portfolio Website <contact@adishamadhushanka.com.au>";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Jane Recruiter",
    email: "jane@example.com",
    company: "Acme",
    enquiryType: "Full-time role",
    message: "Hi Adisha, we have a senior role that might suit you.",
    website: "",
    startedAt: Date.now() - 10_000,
    submissionId: "3f1c2a9e-8b7d-4c6e-9a5f-1e2d3c4b5a69",
    ...overrides,
  };
}

function post(
  body: unknown,
  { headers = {}, raw }: { headers?: Record<string, string>; raw?: string } = {},
) {
  return POST(
    new Request(`${ORIGIN}/api/contact`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: ORIGIN, ...headers },
      body: raw ?? JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "re_test_dummy");
  vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
  rateLimitContact.mockResolvedValue({ ok: true });
  send.mockResolvedValue({ data: { id: "email_1" }, error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

function sentPayload() {
  expect(send).toHaveBeenCalledTimes(1);
  return send.mock.calls[0][0] as {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    text: string;
    html: string;
  };
}

describe("normal submissions", () => {
  it("sends one email from the fixed sender to the configured inbox", async () => {
    const res = await post(validBody());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });

    const email = sentPayload();
    expect(email.from).toBe(FROM);
    expect(email.to).toBe("owner@example.com");
    expect(email.replyTo).toBe("jane@example.com");
    expect(email.subject).toBe("[Portfolio · Full-time role] Jane Recruiter — Acme");
    expect(email.text).toContain("we have a senior role");
    expect(send.mock.calls[0][1]).toEqual({
      idempotencyKey: "contact/3f1c2a9e-8b7d-4c6e-9a5f-1e2d3c4b5a69",
    });
  });

  it("trims fields and accepts non-Latin names with joiners", async () => {
    const res = await post(validBody({ name: "  ශ්‍රී ලාල් ", email: " jane@example.com " }));
    expect(res.status).toBe(200);
    expect(sentPayload().replyTo).toBe("jane@example.com");
    expect(sentPayload().subject).toContain("ශ්‍රී ලාල්");
  });

  it("ignores extra fields that try to override delivery settings", async () => {
    const res = await post(
      validBody({
        to: "attacker@evil.test",
        from: "ceo@bank.test",
        bcc: ["victim@evil.test"],
        cc: "x@evil.test",
        headers: { "X-Evil": "1" },
        replyTo: "attacker@evil.test",
        subject: "Spoofed",
      }),
    );
    expect(res.status).toBe(200);
    const email = sentPayload();
    expect(email.from).toBe(FROM);
    expect(email.to).toBe("owner@example.com");
    expect(email.replyTo).toBe("jane@example.com");
    expect(email.subject).not.toContain("Spoofed");
    expect(email).not.toHaveProperty("bcc");
    expect(email).not.toHaveProperty("cc");
    expect(email).not.toHaveProperty("headers");
  });
});

describe("invalid types and malformed input", () => {
  it.each([
    ["a JSON array", [1, 2, 3]],
    ["null", null],
    ["a number for name", validBody({ name: 12345 })],
    ["an object for message", validBody({ message: { $gt: "" } })],
    ["an array for email", validBody({ email: ["a@b.co", "c@d.co"] })],
    ["an unknown enquiry type", validBody({ enquiryType: "Free money" })],
    ["a missing required field", { ...validBody(), name: undefined }],
    ["a string timestamp", validBody({ startedAt: "yesterday" })],
    ["a non-UUID submission id", validBody({ submissionId: "../../etc/passwd" })],
  ])("rejects %s with 422 and sends nothing", async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects syntactically invalid JSON with 400", async () => {
    const res = await post(null, { raw: '{"name": "Jane",' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid request." });
  });

  it("rejects invalid UTF-8 with 400", async () => {
    const bytes = new Uint8Array([0x7b, 0x22, 0xff, 0xfe, 0x22, 0x7d]);
    const res = await POST(
      new Request(`${ORIGIN}/api/contact`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: ORIGIN },
        body: bytes,
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects non-JSON content types and cross-origin posts", async () => {
    expect((await post(validBody(), { headers: { "content-type": "text/plain" } })).status).toBe(
      415,
    );
    expect((await post(validBody(), { headers: { origin: "https://evil.test" } })).status).toBe(
      403,
    );
    expect(send).not.toHaveBeenCalled();
  });
});

describe("oversized input", () => {
  it("rejects a message over 5,000 characters", async () => {
    const res = await post(validBody({ message: "a".repeat(5001) }));
    expect(res.status).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["name", "a".repeat(101)],
    ["company", "a".repeat(121)],
    ["email", `${"a".repeat(250)}@b.co`],
  ])("rejects an over-long %s", async (field, value) => {
    const res = await post(validBody({ [field]: value }));
    expect(res.status).toBe(422);
  });

  it("rejects bodies over 16 KB with 413, measured in bytes not characters", async () => {
    // 4,200 four-byte emoji: within the 5,000-character message limit (Zod counts code
    // points) but 16,800 bytes, so over the byte cap.
    const res = await post(validBody({ message: "😀".repeat(4200) }));
    expect(res.status).toBe(413);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects a declared Content-Length over the cap without reading the body", async () => {
    const res = await post(validBody(), { headers: { "content-length": "10000000" } });
    expect(res.status).toBe(413);
  });
});

describe("malicious HTML", () => {
  const payload = `<script>alert("x")</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">click</a>`;

  it("escapes HTML in every field of the HTML email", async () => {
    const res = await post(
      validBody({
        name: `<b>Jane</b> "quote" 'single'`,
        company: `<iframe src="https://evil.test">`,
        message: payload,
      }),
    );
    expect(res.status).toBe(200);
    const { html, text } = sentPayload();

    expect(html).not.toContain("<script");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<iframe");
    expect(html).not.toContain("<b>Jane");
    expect(html).not.toContain('<a href="javascript');
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(html).toContain("&lt;b&gt;Jane&lt;/b&gt; &quot;quote&quot; &#39;single&#39;");
    // The plain-text part is text/plain, so it carries the original characters.
    expect(text).toContain(payload);
  });
});

describe("email header injection", () => {
  it.each([
    ["CRLF + Bcc in the email", { email: "jane@example.com\r\nBcc: victim@evil.test" }],
    ["two addresses in the email", { email: "jane@example.com, victim@evil.test" }],
    ["a display name in the email", { email: "Evil <jane@example.com>" }],
    ["CRLF in the name", { name: "Jane\r\nBcc: victim@evil.test" }],
    ["LF in the company", { company: "Acme\nX-Injected: 1" }],
    ["a NUL byte in the name", { name: "Jane\u0000Doe" }],
    ["U+0085 (NEL) in the name", { name: "Jane\u0085Bcc: x@evil.test" }],
    ["U+2028 in the company", { company: "Acme Bcc: x@evil.test" }],
    ["a bidi override in the name", { name: "Jane ‮gnp.exe" }],
    ["a control character in the message", { message: "Hello there\u0007 this rings a bell" }],
  ])("rejects %s", async (_label, overrides) => {
    const res = await post(validBody(overrides));
    expect(res.status).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });

  it("allows line breaks and tabs in the message body", async () => {
    const res = await post(validBody({ message: "Line one\r\nLine two\n\tIndented" }));
    expect(res.status).toBe(200);
    expect(sentPayload().text).toContain("Line two\n\tIndented");
  });
});

describe("spam checks, rate limit and errors", () => {
  it("silently drops honeypot submissions", async () => {
    const res = await post(validBody({ website: "https://spam.test" }));
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("silently drops submissions faster than 3 seconds", async () => {
    const res = await post(validBody({ startedAt: Date.now() - 500 }));
    expect(res.status).toBe(200);
    expect(send).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when rate limited, before reading the body", async () => {
    rateLimitContact.mockResolvedValue({ ok: false, retryAfter: 120 });
    const res = await post(null, { raw: "not json" });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
  });

  it("identifies the visitor by the first x-forwarded-for address", async () => {
    await post(validBody(), { headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" } });
    expect(rateLimitContact).toHaveBeenCalledWith("203.0.113.7");
  });

  it("returns a generic 503 when configuration is missing, without naming values", async () => {
    vi.stubEnv("CONTACT_TO_EMAIL", "");
    const res = await post(validBody());
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toMatch(/RESEND|CONTACT_TO|re_test/);
    expect(send).not.toHaveBeenCalled();
  });

  it("hides Resend error details from the visitor and the logs", async () => {
    send.mockResolvedValue({
      data: null,
      error: {
        name: "validation_error",
        statusCode: 422,
        message: "API key re_test_dummy is invalid for jane@example.com",
      },
    });
    const res = await post(validBody());
    expect(res.status).toBe(502);
    const body = JSON.stringify(await res.json());
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    for (const leak of ["re_test_dummy", "jane@example.com", "is invalid"]) {
      expect(body).not.toContain(leak);
      expect(logged).not.toContain(leak);
    }
  });

  it("hides thrown errors and stack traces", async () => {
    send.mockRejectedValue(new Error("socket hang up at secret-host:443 re_test_dummy"));
    const res = await post(validBody());
    expect(res.status).toBe(500);
    const body = JSON.stringify(await res.json());
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(body).not.toMatch(/socket|secret-host|re_test_dummy|at /);
    expect(logged).not.toMatch(/socket|secret-host|re_test_dummy/);
  });
});
