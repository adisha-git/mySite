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
vi.mock("@/lib/chat/db/client", () => ({
  getDb: () => {
    throw new Error("db not available in tests");
  },
}));

import { POST } from "@/app/api/chat/route";
import { resetMemoryRateLimit } from "@/lib/chat/guard";

const URL_ = "http://localhost:3000/api/chat";
const SOURCE = {
  id: "1",
  sourcePath: "content/knowledge/roles/ocbc.md",
  headingPath: "OCBC Bank > What I owned",
  content: "Adisha led frontend architecture for RM Frontend.",
};

const userMessage = (text: string) => ({ id: "m1", role: "user", parts: [{ type: "text", text }] });

function post(body: unknown, { origin = "http://localhost:3000", ip = "203.0.113.7" } = {}) {
  return new Request(URL_, {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  resetMemoryRateLimit();
  retrieve.mockResolvedValue([SOURCE]);
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
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
      "downloadCv",
      "openProject",
      "scrollToSection",
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
    const OTHER = { ...SOURCE, id: "2", sourcePath: "content/knowledge/roles/mindlogics.md" };

    async function metadataFor(...deltas: string[]) {
      retrieve.mockResolvedValue([SOURCE, OTHER]);
      await POST(post({ conversationId, messages: [userMessage("What did he do at OCBC?")] }));
      const { messageMetadata } = (toUIMessageStreamResponse.mock.calls[0] as unknown[])[0] as {
        messageMetadata: (o: { part: { type: string; text?: string } }) => unknown;
      };
      const start = messageMetadata({ part: { type: "start" } });
      for (const text of deltas) {
        expect(messageMetadata({ part: { type: "text-delta", text } })).toBeUndefined();
      }
      return { start, finish: messageMetadata({ part: { type: "finish" } }) };
    }

    it("sends the conversation id at the start, before any sources are known", async () => {
      const { start } = await metadataFor("Hi");
      expect(start).toEqual({ conversationId });
    });

    it("sends only the sources the answer cites when it finishes", async () => {
      const { finish } = await metadataFor("He led RM Frontend.\n\n[[sour", "ces: 1]]");
      expect(finish).toEqual({
        conversationId,
        sources: [{ path: SOURCE.sourcePath, heading: SOURCE.headingPath }],
      });
    });

    it("sends no sources when the answer cites none or has no marker", async () => {
      expect((await metadataFor("I don't know.\n\n[[sources: none]]")).finish).toEqual({
        conversationId,
        sources: [],
      });
      vi.clearAllMocks();
      resetMemoryRateLimit();
      expect((await metadataFor("I don't know.")).finish).toEqual({ conversationId, sources: [] });
    });
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
