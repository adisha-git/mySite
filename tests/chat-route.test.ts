import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Retrieval, the model and the database are mocked: these tests never call Voyage, Claude or Neon.
const { retrieve, streamText, toUIMessageStreamResponse } = vi.hoisted(() => {
  const toUIMessageStreamResponse = vi.fn(() => new Response("stream"));
  return {
    retrieve: vi.fn(),
    toUIMessageStreamResponse,
    streamText: vi.fn(() => ({ toUIMessageStreamResponse })),
  };
});

vi.mock("@/lib/chat/retrieve", () => ({ retrieve }));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  streamText,
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "mock-model") }));
// The only read is the stored message count for a conversation.
const db = vi.hoisted(() => ({ storedCount: null as number | null }));
vi.mock("@/lib/chat/db/client", () => ({
  getDb: () => {
    if (db.storedCount === null) throw new Error("db not available in tests");
    const rows = [{ count: db.storedCount }];
    return { select: () => ({ from: () => ({ where: async () => rows }) }) };
  },
}));

import { POST } from "@/app/api/chat/route";
import { MAX_JD_CHARS, resetMemoryRateLimit, signConversation } from "@/lib/chat/guard";

const URL_ = "http://localhost:3000/api/chat";
const SOURCE = {
  id: "1",
  sourcePath: "content/knowledge/roles/ocbc.md",
  headingPath: "OCBC Bank > What I owned",
  content: "Adisha led frontend architecture for RM Frontend.",
};

const userMessage = (text: string) => ({ id: "m1", role: "user", parts: [{ type: "text", text }] });

const SALT = "test-salt-test-salt-test-salt-test";

/** A first message carries a bot-check token unless the test says otherwise. */
function post(body: unknown, { origin = "http://localhost:3000", ip = "203.0.113.7" } = {}) {
  const withToken =
    typeof body === "object" &&
    body !== null &&
    !("conversationId" in body) &&
    !("turnstileToken" in body)
      ? { ...body, turnstileToken: "turnstile-token" }
      : body;
  return new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": ip },
    body: typeof withToken === "string" ? withToken : JSON.stringify(withToken),
  });
}

// Cloudflare's siteverify endpoint.
const siteverify = vi.fn(async () => Response.json({ success: true }));

beforeEach(() => {
  resetMemoryRateLimit();
  db.storedCount = null;
  retrieve.mockResolvedValue([SOURCE]);
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("IP_HASH_SALT", SALT);
  vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
  vi.stubGlobal("fetch", siteverify);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/chat", () => {
  it("rejects requests from another origin before doing anything else", async () => {
    const res = await POST(
      post({ messages: [userMessage("Hi")] }, { origin: "https://evil.example" }),
    );
    expect(res.status).toBe(403);
    expect(retrieve).not.toHaveBeenCalled();
    expect(streamText).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const res = await POST(post("{not json"));
    expect(res.status).toBe(400);
  });

  it("rejects a message over 2,000 characters without calling Voyage or Claude", async () => {
    const res = await POST(post({ messages: [userMessage("x".repeat(2001))] }));
    expect(res.status).toBe(400);
    expect(retrieve).not.toHaveBeenCalled();
    expect(streamText).not.toHaveBeenCalled();
  });

  it("rejects more than 20 messages", async () => {
    const messages = Array.from({ length: 21 }, (_, i) => ({
      ...userMessage("Hi"),
      id: String(i),
    }));
    const res = await POST(post({ messages }));
    expect(res.status).toBe(400);
  });

  it("rejects a conversation that doesn't end with a user message", async () => {
    const res = await POST(
      post({
        messages: [
          userMessage("Hi"),
          { id: "a", role: "assistant", parts: [{ type: "text", text: "Hello" }] },
        ],
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 503 without calling Claude when the API key is missing", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(post({ messages: [userMessage("Hi")] }));
    expect(res.status).toBe(503);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("returns 503 when retrieval fails", async () => {
    retrieve.mockRejectedValueOnce(new Error("neon down"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ messages: [userMessage("Hi")] }));
    expect(res.status).toBe(503);
    expect(streamText).not.toHaveBeenCalled();
  });

  it("streams an answer grounded in the retrieved sources", async () => {
    const res = await POST(post({ messages: [userMessage("What did Adisha do at OCBC?")] }));
    expect(res.status).toBe(200);
    expect(retrieve).toHaveBeenCalledWith("What did Adisha do at OCBC?");

    const call = (streamText.mock.calls[0] as unknown[])[0] as {
      instructions: { content: string; providerOptions?: unknown }[];
      messages: unknown[];
    };
    expect(call.instructions[0].providerOptions).toEqual({
      anthropic: { cacheControl: { type: "ephemeral" } },
    });
    expect(call.instructions[0].content).toContain("unrestricted Australian working rights");
    // Until lead capture exists, the assistant must point to the contact form, not promise to forward.
    expect(call.instructions[0].content).toContain("contact form on this site");
    expect(call.instructions[0].content).not.toMatch(/offer to pass/i);
    expect(call.instructions[1].content).toContain(
      '<source id="1" path="content/knowledge/roles/ocbc.md"',
    );
    expect(call.messages).toEqual([{ role: "user", content: "What did Adisha do at OCBC?" }]);
  });

  it("gives the model the site action tools", async () => {
    await POST(post({ messages: [userMessage("Can I see his CV?")] }));
    const call = (streamText.mock.calls[0] as unknown[])[0] as { tools: Record<string, unknown> };
    expect(Object.keys(call.tools).sort()).toEqual([
      "captureLead",
      "downloadCv",
      "openProject",
      "scrollToSection",
      "showFacts",
    ]);
  });

  it("accepts history where an assistant turn only used a tool, and drops it", async () => {
    const res = await POST(
      post({
        messages: [
          userMessage("Show me his experience"),
          {
            id: "a1",
            role: "assistant",
            parts: [
              {
                type: "tool-scrollToSection",
                toolCallId: "t1",
                state: "output-available",
                input: { section: "experience" },
                output: { section: "experience", label: "Experience" },
              },
            ],
          },
          { ...userMessage("Thanks. Is he open to work?"), id: "m2" },
        ],
      }),
    );
    expect(res.status).toBe(200);
    const call = (streamText.mock.calls[0] as unknown[])[0] as { messages: unknown[] };
    expect(call.messages).toEqual([
      { role: "user", content: "Show me his experience" },
      { role: "user", content: "Thanks. Is he open to work?" },
    ]);
  });

  describe("stream metadata", () => {
    const conversationId = "6f1c1b7e-3b0a-4b8e-9a52-1f2d3c4b5a69";
    const conversationToken = signConversation(conversationId, SALT);
    const OTHER = { ...SOURCE, id: "2", sourcePath: "content/knowledge/roles/mindlogics.md" };

    async function metadataFor(...deltas: string[]) {
      retrieve.mockResolvedValue([SOURCE, OTHER]);
      const res = await POST(
        post({
          conversationId,
          conversationToken,
          messages: [userMessage("What did he do at OCBC?")],
        }),
      );
      expect(res.status).toBe(200);
      const { messageMetadata } = (toUIMessageStreamResponse.mock.calls[0] as unknown[])[0] as {
        messageMetadata: (o: { part: { type: string; text?: string } }) => unknown;
      };
      const start = messageMetadata({ part: { type: "start" } });
      for (const text of deltas) {
        expect(messageMetadata({ part: { type: "text-delta", text } })).toBeUndefined();
      }
      return { start, finish: messageMetadata({ part: { type: "finish" } }) };
    }

    it("sends the conversation id and its signed token at the start", async () => {
      const { start } = await metadataFor("Hi");
      expect(start).toEqual({ conversationId, conversationToken });
    });

    it("sends only the sources the answer cites when it finishes", async () => {
      const { finish } = await metadataFor("He led frontend work.\n\n[[sour", "ces: 1]]");
      expect(finish).toEqual({
        conversationId,
        conversationToken,
        sources: [{ path: SOURCE.sourcePath, heading: SOURCE.headingPath }],
      });
    });

    it("sends no sources when the answer cites none or has no marker", async () => {
      expect((await metadataFor("I don't know.\n\n[[sources: none]]")).finish).toEqual({
        conversationId,
        conversationToken,
        sources: [],
      });
      vi.clearAllMocks();
      resetMemoryRateLimit();
      expect((await metadataFor("I don't know.")).finish).toEqual({
        conversationId,
        conversationToken,
        sources: [],
      });
    });
  });

  describe("bot check", () => {
    it("rejects a first message without a Turnstile token, before retrieval", async () => {
      const res = await POST(post({ turnstileToken: undefined, messages: [userMessage("Hi")] }));
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ code: "bot-check" });
      expect(retrieve).not.toHaveBeenCalled();
      expect(streamText).not.toHaveBeenCalled();
    });

    it("verifies the token with Cloudflare using the secret key", async () => {
      expect((await POST(post({ messages: [userMessage("Hi")] }))).status).toBe(200);
      const [url, init] = siteverify.mock.calls[0] as unknown as [
        string,
        { body: URLSearchParams },
      ];
      expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
      expect(init.body.get("secret")).toBe("turnstile-secret");
      expect(init.body.get("response")).toBe("turnstile-token");
    });

    it("rejects a token Cloudflare doesn't accept, and fails closed when it can't be reached", async () => {
      siteverify.mockResolvedValueOnce(Response.json({ success: false }));
      expect((await POST(post({ messages: [userMessage("Hi")] }))).status).toBe(403);
      siteverify.mockRejectedValueOnce(new Error("network down"));
      expect((await POST(post({ messages: [userMessage("Hi")] }))).status).toBe(403);
      expect(streamText).not.toHaveBeenCalled();
    });

    it("returns 503 when the Turnstile secret isn't configured", async () => {
      vi.stubEnv("TURNSTILE_SECRET_KEY", "");
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect((await POST(post({ messages: [userMessage("Hi")] }))).status).toBe(503);
    });

    it("lets later messages through with the conversation token, without a new bot check", async () => {
      const conversationId = "0b8f5c1e-2d3a-4c5b-8e9f-112233445566";
      const res = await POST(
        post({
          conversationId,
          conversationToken: signConversation(conversationId, SALT),
          messages: [userMessage("Hi")],
        }),
      );
      expect(res.status).toBe(200);
      expect(siteverify).not.toHaveBeenCalled();
    });

    it("rejects a forged or missing conversation token", async () => {
      const conversationId = "0b8f5c1e-2d3a-4c5b-8e9f-112233445566";
      for (const conversationToken of ["forged", undefined]) {
        const res = await POST(
          post({ conversationId, conversationToken, messages: [userMessage("Hi")] }),
        );
        expect(res.status).toBe(403);
      }
      expect(streamText).not.toHaveBeenCalled();
    });
  });

  it("stops a conversation at 20 stored messages, even if the client drops its history", async () => {
    const conversationId = "0b8f5c1e-2d3a-4c5b-8e9f-112233445566";
    const body = {
      conversationId,
      conversationToken: signConversation(conversationId, SALT),
      messages: [userMessage("Hi")],
    };
    db.storedCount = 18;
    expect((await POST(post(body))).status).toBe(200);
    db.storedCount = 20;
    const res = await POST(post(body));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/contact form/);
  });

  describe("job descriptions", () => {
    it("allows up to 8,000 characters only in JD mode", async () => {
      const jd = "x".repeat(MAX_JD_CHARS);
      expect((await POST(post({ mode: "jd", messages: [userMessage(jd)] }))).status).toBe(200);
      expect((await POST(post({ messages: [userMessage(jd)] }))).status).toBe(400);
      expect((await POST(post({ mode: "jd", messages: [userMessage(jd + "x")] }))).status).toBe(
        400,
      );
    });

    it("resends an earlier fit card to the model as text", async () => {
      const conversationId = "0b8f5c1e-2d3a-4c5b-8e9f-112233445566";
      const fit = {
        role: "Senior Frontend Engineer",
        matched: [
          {
            requirement: "React",
            evidence: [{ label: "OCBC Bank", quote: "in React", path: "p", heading: "h" }],
          },
        ],
        partial: [],
        gaps: ["Kubernetes"],
        summary: "A strong React match.",
      };
      const res = await POST(
        post({
          conversationId,
          conversationToken: signConversation(conversationId, SALT),
          messages: [
            userMessage("x".repeat(500)),
            { id: "a", role: "assistant", parts: [{ type: "data-fit", data: fit }] },
            { ...userMessage("Tell me more about the React work"), id: "m2" },
          ],
        }),
      );
      expect(res.status).toBe(200);
      const call = (streamText.mock.calls[0] as unknown[])[0] as {
        messages: { role: string; content: string }[];
      };
      expect(call.messages[1]).toEqual({
        role: "assistant",
        content: expect.stringContaining("Not shown in his written experience: Kubernetes."),
      });
    });

    it("accepts a job description pasted earlier in the history", async () => {
      const conversationId = "0b8f5c1e-2d3a-4c5b-8e9f-112233445566";
      const res = await POST(
        post({
          conversationId,
          conversationToken: signConversation(conversationId, SALT),
          messages: [
            userMessage("x".repeat(5000)),
            { id: "a", role: "assistant", parts: [{ type: "text", text: "It matches." }] },
            { ...userMessage("What about the gaps?"), id: "m2" },
          ],
        }),
      );
      expect(res.status).toBe(200);
    });
  });

  it("ends the answer at any tool call and only offers the actions the visitor asked for", async () => {
    await POST(post({ messages: [userMessage("What is Sri Aero?")] }));
    const call = (streamText.mock.calls[0] as unknown[])[0] as {
      stopWhen: (options: { steps: unknown[] }) => boolean | PromiseLike<boolean>;
      experimental_transform: unknown;
      activeTools: string[];
    };
    // One step: a tool call can't be followed by more text that repeats the answer.
    expect(await call.stopWhen({ steps: [{}] })).toBe(true);
    expect(call.experimental_transform).toBeTypeOf("function");
    expect(call.activeTools).toEqual(expect.arrayContaining(["showFacts", "captureLead"]));
    expect(call.activeTools).not.toContain("openProject");
  });

  it("allows 10 messages a minute per IP, then returns 429 without calling Claude", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await POST(post({ messages: [userMessage("Hi")] }))).status).toBe(200);
    }
    const limited = await POST(post({ messages: [userMessage("Hi")] }));
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
    expect(streamText).toHaveBeenCalledTimes(10);

    // A different visitor is unaffected.
    expect(
      (await POST(post({ messages: [userMessage("Hi")] }, { ip: "198.51.100.2" }))).status,
    ).toBe(200);
  });
});
