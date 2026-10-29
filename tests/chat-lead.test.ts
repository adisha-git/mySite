import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The database, Resend and Claude are mocked: these tests never reach Neon, Resend or Anthropic.
const { db, send, summarise } = vi.hoisted(() => {
  const db = {
    conversation: [{ id: "c", jobDescription: null }] as {
      id: string;
      jobDescription: string | null;
    }[],
    transcript: [] as { role: "user" | "assistant"; content: string }[],
    inserted: [] as unknown[],
    failInsert: false,
  };
  return {
    db,
    send: vi.fn(async (): Promise<{ data: { id: string } | null; error: unknown }> => ({
      data: { id: "email" },
      error: null,
    })),
    summarise: vi.fn(async () => ["Recruiter hiring a senior React engineer."]),
  };
});

vi.mock("@/lib/chat/db/client", () => ({
  getDb: () => ({
    select: (cols: Record<string, unknown>) => ({
      from: () => ({
        where: () =>
          "role" in cols
            ? { orderBy: async () => db.transcript }
            : Promise.resolve(db.conversation),
      }),
    }),
    insert: () => ({
      values: (row: unknown) => ({
        onConflictDoNothing: async () => {
          if (db.failInsert) throw new Error("neon down");
          db.inserted.push(row);
        },
      }),
    }),
  }),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));
vi.mock("@/lib/chat/lead-email", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/chat/lead-email")>()),
  summariseConversation: summarise,
}));

import { POST } from "@/app/api/chat/lead/route";
import { resetMemoryRateLimit, signConversation } from "@/lib/chat/guard";

const SALT = "test-salt-test-salt-test-salt-test";
const conversationId = "6f1c1b7e-3b0a-4b8e-9a52-1f2d3c4b5a69";
const leadId = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const lead = {
  name: "Sam Lee",
  email: "sam@example.com",
  company: "Acme",
  topic: "Recruiter / agency",
  note: "Senior React role in Brisbane.",
};

function post(body: unknown, { origin = "http://localhost:3000", ip = "203.0.113.9" } = {}) {
  return new Request("http://localhost:3000/api/chat/lead", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}
const valid = () => ({
  leadId,
  conversationId,
  conversationToken: signConversation(conversationId, SALT),
  lead,
});

beforeEach(() => {
  resetMemoryRateLimit();
  db.conversation = [{ id: conversationId, jobDescription: null }];
  db.transcript = [];
  db.inserted = [];
  db.failInsert = false;
  vi.stubEnv("IP_HASH_SALT", SALT);
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("LEAD_NOTIFY_EMAIL", "owner@example.com");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("POST /api/chat/lead", () => {
  it("saves the confirmed lead and emails it, with the visitor as reply-to", async () => {
    const res = await POST(post(valid()));
    expect(res.status).toBe(200);
    expect(db.inserted).toEqual([
      {
        id: leadId,
        conversationId,
        name: "Sam Lee",
        email: "sam@example.com",
        company: "Acme",
        topic: "Recruiter / agency",
        note: "Senior React role in Brisbane.",
        jobDescription: null,
      },
    ]);
    const [message, options] = send.mock.calls[0] as unknown as [
      { to: string; replyTo: string; subject: string; text: string },
      { idempotencyKey: string },
    ];
    expect(message.to).toBe("owner@example.com");
    expect(message.replyTo).toBe("sam@example.com");
    expect(message.subject).toBe("[Chat lead · Recruiter / agency] Sam Lee — Acme");
    expect(message.text).toContain("Recruiter hiring a senior React engineer.");
    expect(options.idempotencyKey).toBe(`chat-lead/${leadId}`);
  });

  it("saves the job description from the conversation's fit check with the lead", async () => {
    const jd = "Senior Frontend Engineer at Acme. React, TypeScript and accessibility.";
    db.conversation = [{ id: conversationId, jobDescription: jd }];
    await POST(post(valid()));
    expect(db.inserted).toEqual([expect.objectContaining({ jobDescription: jd })]);
    const [message] = send.mock.calls[0] as unknown as [{ text: string }];
    expect(message.text).toContain("Job description they pasted:");
    expect(message.text).toContain(jd);
  });

  it("includes a job description pasted in the conversation", async () => {
    const jd = `Senior Frontend Engineer. ${"Requirements: React, TypeScript. ".repeat(80)}`;
    db.transcript = [
      { role: "user", content: jd },
      { role: "assistant", content: "Here's how he matches." },
    ];
    await POST(post(valid()));
    const [message] = send.mock.calls[0] as unknown as [{ text: string }];
    expect(message.text).toContain("Job description they pasted:");
    expect(message.text).toContain(jd);
  });

  it("rejects a forged conversation token without saving or emailing", async () => {
    const res = await POST(post({ ...valid(), conversationToken: "forged" }));
    expect(res.status).toBe(403);
    expect(db.inserted).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("validates the lead fields", async () => {
    const res = await POST(post({ ...valid(), lead: { ...lead, email: "not-an-email" } }));
    expect(res.status).toBe(422);
    const subjectInjection = await POST(
      post({ ...valid(), lead: { ...lead, name: "Sam\r\nBcc: x@example.com" } }),
    );
    expect(subjectInjection.status).toBe(422);
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects other origins", async () => {
    expect((await POST(post(valid(), { origin: "https://evil.example" }))).status).toBe(403);
  });

  it("returns 503 without saving when email isn't configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(post(valid()))).status).toBe(503);
    expect(db.inserted).toEqual([]);
  });

  it("reports a failed email so the visitor can retry with the same lead id", async () => {
    send.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", statusCode: 422 },
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await POST(post(valid()))).status).toBe(502);
  });

  it("allows 5 leads an hour per IP", async () => {
    for (let i = 0; i < 5; i++) expect((await POST(post(valid()))).status).toBe(200);
    expect((await POST(post(valid()))).status).toBe(429);
  });
});
