import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Retrieval, the model and the database are mocked: these tests never call Voyage, Claude or Neon.
const { allChunks, retrieve, generateText, saveExchange } = vi.hoisted(() => ({
  allChunks: vi.fn(),
  retrieve: vi.fn(),
  generateText: vi.fn(),
  saveExchange: vi.fn(async () => {}),
}));
vi.mock("@/lib/chat/retrieve", () => ({ allChunks, retrieve }));
vi.mock("@/lib/chat/store", () => ({ saveExchange, storedMessageCount: async () => 0 }));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("ai")>()),
  generateText,
}));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "mock-model") }));

import { POST } from "@/app/api/fit-check/route";
import {
  applyReview,
  buildReviewInput,
  collectCandidates,
  quoteAppearsIn,
  type FitModelOutput,
  type FitReview,
} from "@/lib/chat/fit";
import { resetMemoryRateLimit, signConversation } from "@/lib/chat/guard";

const SALT = "test-salt-test-salt-test-salt-test";
const OCBC = {
  id: "1",
  sourcePath: "content/knowledge/roles/ocbc.md",
  headingPath: "OCBC Bank — Senior Software Engineer (AVP) > What I owned",
  content:
    "Adisha designed and implemented the frontend of an internal application for relationship managers in React and TypeScript.",
};
const TGS = {
  id: "2",
  sourcePath: "content/knowledge/projects/tgs.md",
  headingPath: "TGS — Tour booking website > Overview",
  content:
    "Whether Adisha worked on TGS himself isn't confirmed. The stack includes Next.js, React, AWS Lambda and Amazon CloudFront.",
};
const JD = `Senior Frontend Engineer at Acme. ${"You'll build React and TypeScript apps, mentor engineers and work with Kubernetes. ".repeat(4)}`;

const modelOutput = (requirements: FitModelOutput["requirements"]): FitModelOutput => ({
  role: "Senior Frontend Engineer, Acme",
  requirements,
});

/** The support check's answer: the same rating for every evidence id unless given. */
const review = (
  ids: number,
  ratings: Record<number, FitReview["verdicts"][number]["support"]> = {},
) => ({
  verdicts: Array.from({ length: ids }, (_, i) => ({
    id: i + 1,
    support: ratings[i + 1] ?? "full",
  })),
  summary: "He matches the React and TypeScript work. Kubernetes isn't shown.",
});

/** Sonnet matches; Haiku (the support check) rates. */
const isReview = (options: { instructions: { content: string }[] }) =>
  options.instructions[0].content.startsWith("You check a job-fit card");

function post(body: unknown, { origin = "http://localhost:3000", ip = "203.0.113.20" } = {}) {
  return new Request("http://localhost:3000/api/fit-check", {
    method: "POST",
    headers: { "content-type": "application/json", origin, "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetMemoryRateLimit();
  allChunks.mockResolvedValue([OCBC]);
  retrieve.mockResolvedValue([OCBC]);
  const matching = {
    output: modelOutput([
      {
        requirement: "React and TypeScript",
        match: "yes",
        evidence: [{ source: 1, quote: "in React and TypeScript" }],
      },
      // Invented: the quote isn't in the source it names.
      {
        requirement: "Kubernetes",
        match: "yes",
        evidence: [{ source: 1, quote: "ran production Kubernetes clusters" }],
      },
      { requirement: "Mentoring", match: "no", evidence: [] },
    ]),
    usage: { inputTokens: 1000, outputTokens: 200 },
  };
  generateText.mockImplementation(async (options: { instructions: { content: string }[] }) =>
    isReview(options)
      ? { output: review(1), usage: { inputTokens: 300, outputTokens: 80 } }
      : matching,
  );
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
  vi.stubEnv("IP_HASH_SALT", SALT);
  vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ success: true })),
  );
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("fit validation", () => {
  const sources = [
    { path: OCBC.sourcePath, heading: OCBC.headingPath, content: OCBC.content },
    { path: TGS.sourcePath, heading: TGS.headingPath, content: TGS.content },
  ];

  it("keeps evidence only when its quote is in the confirmed source it names", () => {
    const collected = collectCandidates(
      modelOutput([
        {
          requirement: "React",
          match: "yes",
          evidence: [{ source: 1, quote: "“in React and TypeScript.”" }],
        },
        {
          requirement: "Frontend architecture",
          match: "partly",
          evidence: [{ source: 1, quote: "designed and implemented the frontend" }],
        },
        {
          requirement: "Kubernetes",
          match: "yes",
          evidence: [{ source: 1, quote: "deployed to Kubernetes" }],
        },
        {
          requirement: "Vue",
          match: "yes",
          evidence: [{ source: 3, quote: "in React and TypeScript" }],
        },
        // An exact quote, but from a project his involvement in isn't confirmed.
        {
          requirement: "AWS Lambda",
          match: "yes",
          evidence: [{ source: 2, quote: "The stack includes Next.js, React, AWS Lambda" }],
        },
        // The model said it isn't met, so evidence doesn't make it a match.
        {
          requirement: "Banking",
          match: "no",
          evidence: [{ source: 1, quote: "relationship managers in React" }],
        },
      ]),
      sources,
    );
    expect(collected.candidates.map((c) => [c.requirement, c.claimed])).toEqual([
      ["React", "full"],
      ["Frontend architecture", "partial"],
    ]);
    expect(collected.candidates.flatMap((c) => c.evidence.map((e) => e.id))).toEqual([1, 2]);
    // Invented quotes, a source that doesn't exist and an unconfirmed source are all gaps.
    expect(collected.gaps).toEqual(["Kubernetes", "Vue", "AWS Lambda", "Banking"]);
    // The support check only sees the confirmed, exact evidence.
    expect(buildReviewInput(collected)).not.toContain('AWS Lambda"');
  });

  it("drops an exact quote that doesn't support its requirement", () => {
    const collected = collectCandidates(
      modelOutput([
        {
          requirement: "Relationship management experience",
          match: "yes",
          evidence: [{ source: 1, quote: "an internal application for relationship managers" }],
        },
        {
          requirement: "React and TypeScript",
          match: "yes",
          evidence: [{ source: 1, quote: "in React and TypeScript" }],
        },
      ]),
      sources,
    );
    const fit = applyReview(collected, review(2, { 1: "none" }));
    expect(fit.matched.map((m) => m.requirement)).toEqual(["React and TypeScript"]);
    expect(fit.gaps).toEqual(["Relationship management experience"]);
  });

  it("keeps the weaker of the two ratings, and drops evidence the check didn't rate", () => {
    const collected = collectCandidates(
      modelOutput([
        {
          requirement: "Frontend architecture",
          match: "yes",
          evidence: [{ source: 1, quote: "designed and implemented the frontend" }],
        },
        {
          requirement: "TypeScript",
          match: "partly",
          evidence: [{ source: 1, quote: "in React and TypeScript" }],
        },
        {
          requirement: "React",
          match: "yes",
          evidence: [{ source: 1, quote: "in React and TypeScript" }],
        },
      ]),
      sources,
    );
    const fit = applyReview(collected, {
      verdicts: [
        { id: 1, support: "partial" },
        { id: 2, support: "full" },
      ],
      summary: "Summary.",
    });
    expect(fit.matched).toEqual([]);
    expect(fit.partial.map((m) => m.requirement)).toEqual(["Frontend architecture", "TypeScript"]);
    expect(fit.gaps).toEqual(["React"]);
    expect(fit.partial[0].evidence[0]).not.toHaveProperty("id");
  });

  it("rejects quotes that are stitched together or too short to prove anything", () => {
    expect(quoteAppearsIn("designed and implemented … React", OCBC.content)).toBe(false);
    expect(quoteAppearsIn("React", OCBC.content)).toBe(false);
    expect(quoteAppearsIn("Designed  and implemented the FRONTEND", OCBC.content)).toBe(true);
  });
});

describe("POST /api/fit-check", () => {
  it("rejects text too short to be a job description before calling Voyage or Claude", async () => {
    const res = await POST(post({ jobDescription: "React dev", turnstileToken: "t" }));
    expect(res.status).toBe(400);
    expect(retrieve).not.toHaveBeenCalled();
    expect(generateText).not.toHaveBeenCalled();
  });

  it("rejects requests from another origin", async () => {
    const res = await POST(
      post({ jobDescription: JD, turnstileToken: "t" }, { origin: "https://evil.example" }),
    );
    expect(res.status).toBe(403);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("needs the bot check on a new conversation", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ success: false })),
    );
    const res = await POST(post({ jobDescription: JD, turnstileToken: "bad" }));
    expect(res.status).toBe(403);
    expect(generateText).not.toHaveBeenCalled();
  });

  it("rejects a forged conversation token", async () => {
    const conversationId = "0b8f5c1e-2d3a-4c5b-8e9f-112233445566";
    const res = await POST(
      post({ jobDescription: JD, conversationId, conversationToken: "forged" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns verified matches and honest gaps, and saves the job description", async () => {
    const res = await POST(post({ jobDescription: JD, turnstileToken: "t" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      conversationId: string;
      conversationToken: string;
      fit: { matched: { requirement: string }[]; gaps: string[] };
    };
    expect(body.fit.matched.map((m) => m.requirement)).toEqual(["React and TypeScript"]);
    expect(body.fit.gaps).toEqual(["Kubernetes", "Mentoring"]);
    expect(body.conversationToken).toBe(signConversation(body.conversationId, SALT));

    // The knowledge base is small, so the model reads all of it: no retrieval needed.
    expect(allChunks).toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
    expect(saveExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: body.conversationId,
        question: JD.trim(),
        jobDescription: JD.trim(),
        sources: [{ path: OCBC.sourcePath, heading: OCBC.headingPath }],
      }),
    );
    // The fixed facts are quotable too, after the retrieved chunks.
    const call = generateText.mock.calls[0][0] as { instructions: { content: string }[] };
    expect(call.instructions[1].content).toContain('<source id="2" path="facts"');
    // Then the separate support check sees only the evidence that passed the exact-quote check.
    const check = generateText.mock.calls[1][0] as { messages: { content: string }[] };
    expect(check.messages[0].content).toContain('<evidence id="1"');
    expect(check.messages[0].content).not.toContain("Kubernetes clusters");
  });

  it("retrieves with the job description instead once the knowledge is too big to send whole", async () => {
    allChunks.mockResolvedValueOnce([{ ...OCBC, content: "x".repeat(200_000) }]);
    await POST(post({ jobDescription: JD, turnstileToken: "t" }));
    expect(retrieve).toHaveBeenCalledWith(JD.trim(), { limit: 12 });
  });

  it("allows 5 fit checks an hour per IP", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await POST(post({ jobDescription: JD, turnstileToken: "t" }))).status).toBe(200);
    }
    const limited = await POST(post({ jobDescription: JD, turnstileToken: "t" }));
    expect(limited.status).toBe(429);
    expect(generateText).toHaveBeenCalledTimes(10);
  });

  it("returns 503 without saving when the support check fails", async () => {
    generateText.mockImplementation(async (options: { instructions: { content: string }[] }) => {
      if (isReview(options)) throw new Error("overloaded");
      return { output: modelOutput([]), usage: {} };
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await POST(post({ jobDescription: JD, turnstileToken: "t" }));
    expect(res.status).toBe(503);
    expect(saveExchange).not.toHaveBeenCalled();
  });
});
