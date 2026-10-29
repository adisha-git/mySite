import { anthropic } from "@ai-sdk/anthropic";
import { generateText, Output } from "ai";
import { chatConfig } from "@/lib/chat/config";
import {
  applyReview,
  buildFitInstructions,
  buildFitSources,
  buildReviewInput,
  buildReviewInstructions,
  collectCandidates,
  factSources,
  FIT_MAX_CONTEXT_CHARS,
  FIT_SOURCES,
  fitModelSchema,
  fitRequestSchema,
  fitReviewSchema,
  fitToText,
  type FitCheckResponse,
  type FitResult,
  type FitSource,
} from "@/lib/chat/fit";
import {
  checkConversation,
  clientIp,
  hashIp,
  isSameOrigin,
  MAX_MESSAGES,
  rateLimitChat,
  rateLimitFit,
  readBodyCapped,
  serverSecret,
  signConversation,
} from "@/lib/chat/guard";
import { allChunks, retrieve } from "@/lib/chat/retrieve";
import { saveExchange, storedMessageCount } from "@/lib/chat/store";

/**
 * Checks a pasted job description against Adisha's written experience: Claude
 * Sonnet matches requirements to quotes, the server checks each quote is real
 * and from a confirmed source, and Claude Haiku checks each quote supports its
 * requirement (see lib/chat/fit.ts). Same guards as the chat: origin, size,
 * input validation, rate limits and the bot check all run before any call to
 * Voyage or Claude. The job description is stored with the conversation, so a
 * lead confirmed afterwards carries it; it's never logged.
 */

const MAX_BODY_BYTES = 32 * 1024;
const UNAVAILABLE = "The fit check isn't available right now. Please try again later.";
/** Past this, the visitor has waited too long; the plan's target is under 15 seconds. */
const TIMEOUT_MS = 30_000;

const fail = (status: number, error: string, init?: ResponseInit) =>
  Response.json({ error }, { ...init, status });

/** Logs only the error's name and message: never request bodies, IPs or keys. */
function logError(context: string, error: unknown) {
  console.error(
    `fit check: ${context}`,
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Forbidden.");

  let json: unknown;
  try {
    const raw = await readBodyCapped(request, MAX_BODY_BYTES);
    if (raw === null) return fail(413, "Request is too large.");
    json = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid request body.");
  }

  const parsed = fitRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid request.");

  const ipHash = hashIp(clientIp(request));
  // A fit check counts as a chat message, and has its own hourly limit as it uses Sonnet.
  const limit = await rateLimitChat(ipHash);
  if (!limit.ok) {
    return fail(429, "You're sending messages too quickly. Please wait a moment and try again.", {
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }
  const fitLimit = await rateLimitFit(ipHash);
  if (!fitLimit.ok) {
    return fail(429, "You've checked several job descriptions already. Please try again later.", {
      headers: { "Retry-After": String(fitLimit.retryAfter) },
    });
  }

  const secret = serverSecret();
  if (!process.env.ANTHROPIC_API_KEY || !secret) {
    logError("not configured", new Error("ANTHROPIC_API_KEY or IP_HASH_SALT is not set"));
    return fail(503, UNAVAILABLE);
  }

  const conversation = await checkConversation(parsed.data, secret);
  if (!conversation.ok) {
    if (conversation.misconfigured) {
      logError("not configured", new Error(conversation.error));
      return fail(503, UNAVAILABLE);
    }
    const { status, error, code } = conversation;
    return Response.json(code ? { error, code } : { error }, { status });
  }
  const { conversationId } = conversation;
  if (!conversation.isNew) {
    const stored = await storedMessageCount(conversationId, (error) =>
      logError("failed to read conversation", error),
    );
    if (stored + 2 > MAX_MESSAGES) {
      return fail(
        429,
        "This chat has reached its limit. Please use the contact form to reach Adisha directly.",
      );
    }
  }

  const { jobDescription } = parsed.data;
  let sources: FitSource[];
  try {
    // All of his material when it's small enough, so a gap is a real gap; otherwise
    // retrieve with the job description itself as the query, more chunks than a question.
    let chunks = await allChunks();
    if (chunks.reduce((n, c) => n + c.content.length, 0) > FIT_MAX_CONTEXT_CHARS) {
      chunks = await retrieve(jobDescription, { limit: FIT_SOURCES });
    }
    sources = [
      ...chunks.map((c) => ({ path: c.sourcePath, heading: c.headingPath, content: c.content })),
      ...factSources(),
    ];
  } catch (error) {
    logError("retrieval failed", error);
    return fail(503, UNAVAILABLE);
  }

  let fit: FitResult;
  let usage = { inputTokens: 0, outputTokens: 0 };
  const addUsage = (u: { inputTokens?: number; outputTokens?: number }) => {
    usage = {
      inputTokens: usage.inputTokens + (u.inputTokens ?? 0),
      outputTokens: usage.outputTokens + (u.outputTokens ?? 0),
    };
  };
  try {
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    const matching = await generateText({
      model: anthropic(chatConfig.models.fitCheck),
      output: Output.object({ schema: fitModelSchema }),
      instructions: [
        {
          role: "system",
          content: buildFitInstructions(),
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
        // The same for every fit check until the knowledge changes, so it's cached too.
        {
          role: "system",
          content: buildFitSources(sources),
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
      ],
      messages: [
        {
          role: "user",
          content: `<job_description>\n${jobDescription}\n</job_description>`,
        },
      ],
      maxOutputTokens: 2000,
      providerOptions: { anthropic: { effort: "low" } },
      abortSignal: signal,
    });
    addUsage(matching.usage);
    const collected = collectCandidates(matching.output, sources);

    // A separate check that each quote supports its specific requirement, which
    // also writes the summary from the checked card. If it fails, nothing is shown.
    const review = await generateText({
      model: anthropic(chatConfig.models.chat),
      output: Output.object({ schema: fitReviewSchema }),
      instructions: [
        {
          role: "system",
          content: buildReviewInstructions(),
          providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
        },
      ],
      messages: [{ role: "user", content: buildReviewInput(collected) }],
      // Rating quotes needs no extended thinking, which keeps this step to a few seconds.
      // The cap leaves room so the ratings are never cut off.
      maxOutputTokens: 3000,
      providerOptions: { anthropic: { thinking: { type: "disabled" } } },
      abortSignal: signal,
    });
    addUsage(review.usage);
    fit = applyReview(collected, review.output);
  } catch (error) {
    logError("generation failed", error);
    return fail(503, "Sorry, the fit check didn't work this time. Please try again.");
  }

  try {
    const cited = new Map(
      fit.matched
        .flatMap((m) => m.evidence)
        .filter((e) => e.path !== "facts")
        .map((e) => [`${e.path}\n${e.heading}`, { path: e.path, heading: e.heading }]),
    );
    await saveExchange({
      conversationId,
      ipHash,
      userAgent: request.headers.get("user-agent")?.slice(0, 256) ?? null,
      question: jobDescription,
      answer: fitToText(fit),
      sources: [...cited.values()],
      tokensIn: usage.inputTokens,
      tokensOut: usage.outputTokens,
      jobDescription,
    });
  } catch (error) {
    // The visitor still gets the card; only a lead would miss the job description.
    logError("failed to save fit check", error);
  }

  return Response.json({
    conversationId,
    conversationToken: signConversation(conversationId, secret),
    fit,
  } satisfies FitCheckResponse);
}
