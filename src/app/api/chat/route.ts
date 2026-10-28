import { anthropic } from "@ai-sdk/anthropic";
import { hasToolCall, stepCountIs, streamText, type ModelMessage } from "ai";
import { eq, sql } from "drizzle-orm";
import { citedSources, parseCitations, stripCitations } from "@/lib/chat/citations";
import { chatConfig } from "@/lib/chat/config";
import { getDb } from "@/lib/chat/db/client";
import {
  conversations,
  messages as messagesTable,
  type ChatMessageMetadata,
  type MessageSource,
} from "@/lib/chat/db/schema";
import {
  chatRequestSchema,
  clientIp,
  hashIp,
  isSameOrigin,
  MAX_MESSAGES,
  rateLimitChat,
  readBodyCapped,
  serverSecret,
  signConversation,
  turnstileSecret,
  verifyConversation,
  verifyTurnstile,
} from "@/lib/chat/guard";
import { buildInstructions } from "@/lib/chat/prompt";
import { retrieve, type RetrievedChunk } from "@/lib/chat/retrieve";
import { activeToolsFor, buildChatTools } from "@/lib/chat/tools";

const UNAVAILABLE = "The chat isn't available right now. Please try again later.";

const fail = (status: number, error: string, init?: ResponseInit) =>
  Response.json({ error }, { ...init, status });

/** Logs only the error's name and message: never request bodies, IPs or keys. */
function logError(context: string, error: unknown) {
  console.error(
    `chat: ${context}`,
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
  );
}

type Exchange = {
  conversationId: string;
  ipHash: string;
  userAgent: string | null;
  question: string;
  answer: string;
  sources: MessageSource[];
  tokensIn: number | undefined;
  tokensOut: number | undefined;
};

async function saveExchange(e: Exchange) {
  const db = getDb();
  await db.batch([
    db
      .insert(conversations)
      .values({ id: e.conversationId, ipHash: e.ipHash, userAgent: e.userAgent, messageCount: 2 })
      .onConflictDoUpdate({
        target: conversations.id,
        set: { messageCount: sql`${conversations.messageCount} + 2` },
      }),
    db.insert(messagesTable).values([
      { conversationId: e.conversationId, role: "user", content: e.question },
      {
        conversationId: e.conversationId,
        role: "assistant",
        content: e.answer,
        sources: e.sources,
        tokensIn: e.tokensIn ?? null,
        tokensOut: e.tokensOut ?? null,
      },
    ]),
  ]);
}

/** Messages already stored for a conversation; 0 if unknown, so a DB hiccup never blocks a chat. */
async function storedMessageCount(conversationId: string): Promise<number> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ count: conversations.messageCount })
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return row?.count ?? 0;
  } catch (error) {
    logError("failed to read conversation", error);
    return 0;
  }
}

export async function POST(request: Request) {
  // Every check here runs before any call to Voyage or Claude.
  if (!isSameOrigin(request)) return fail(403, "Forbidden.");

  let raw: string | null;
  try {
    raw = await readBodyCapped(request);
  } catch {
    return fail(400, "Invalid request body.");
  }
  if (raw === null) return fail(413, "Request is too large.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid request body.");
  }

  const parsed = chatRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, parsed.error.issues[0]?.message ?? "Invalid request.");

  const ipHash = hashIp(clientIp(request));
  const limit = await rateLimitChat(ipHash);
  if (!limit.ok) {
    return fail(429, "You're sending messages too quickly. Please wait a moment and try again.", {
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  const secret = serverSecret();
  if (!process.env.ANTHROPIC_API_KEY || !secret) {
    logError("not configured", new Error("ANTHROPIC_API_KEY or IP_HASH_SALT is not set"));
    return fail(503, UNAVAILABLE);
  }

  const { messages } = parsed.data;
  let conversationId: string;
  if (parsed.data.conversationId) {
    // A later message: it must carry the token issued when the conversation passed the bot check.
    const token = parsed.data.conversationToken;
    if (!token || !verifyConversation(parsed.data.conversationId, token, secret)) {
      return Response.json(
        { error: "This chat session isn't valid any more. Please refresh the page and try again." },
        { status: 403 },
      );
    }
    conversationId = parsed.data.conversationId;
    // The client caps the conversation too, but a client can drop its history; the stored count can't.
    if ((await storedMessageCount(conversationId)) + 2 > MAX_MESSAGES) {
      return fail(
        429,
        "This chat has reached its limit. Please use the contact form to reach Adisha directly.",
      );
    }
  } else {
    // The first message of a conversation needs a Turnstile token, verified with Cloudflare.
    const turnstile = turnstileSecret();
    if (!turnstile) {
      logError("not configured", new Error("TURNSTILE_SECRET_KEY is not set"));
      return fail(503, UNAVAILABLE);
    }
    const token = parsed.data.turnstileToken;
    if (!token || !(await verifyTurnstile(token, turnstile))) {
      return Response.json(
        { error: "We couldn't confirm you're not a bot. Please try again.", code: "bot-check" },
        { status: 403 },
      );
    }
    conversationId = crypto.randomUUID();
  }
  const conversationToken = signConversation(conversationId, secret);
  const userTexts = messages.filter((m) => m.role === "user").map((m) => m.text);
  const question = userTexts.at(-1)!;

  let sources: RetrievedChunk[];
  try {
    // The previous question is included so follow-ups ("what about his team?") still retrieve.
    sources = await retrieve(userTexts.slice(-2).join("\n"));
  } catch (error) {
    logError("retrieval failed", error);
    return fail(503, UNAVAILABLE);
  }
  const sourceMeta: MessageSource[] = sources.map((s) => ({
    path: s.sourcePath,
    heading: s.headingPath,
  }));
  // Only the sources the answer cites become chips. No marker means no chips:
  // better none than ones that didn't support the answer.
  const citedMeta = (text: string) => citedSources(sourceMeta, parseCitations(text) ?? []);

  const modelMessages: ModelMessage[] = messages.map((m) =>
    m.role === "user" ? { role: "user", content: m.text } : { role: "assistant", content: m.text },
  );

  const tools = buildChatTools(chatConfig);
  const result = streamText({
    model: anthropic(chatConfig.models.chat),
    instructions: buildInstructions(sources),
    messages: modelMessages,
    tools,
    // Site actions only when the visitor asked for one.
    activeTools: activeToolsFor(question, tools),
    // One step for the answer or a tool call, one more to reply after a tool runs.
    // A fact card always ends the answer, so no text can follow and repeat it.
    stopWhen: [stepCountIs(2), hasToolCall("showFacts")],
    providerOptions: { anthropic: { effort: "low" } },
    onFinish: async ({ steps, totalUsage }) => {
      const answer = steps.map((s) => s.text).join("\n\n");
      try {
        await saveExchange({
          conversationId,
          ipHash,
          userAgent: request.headers.get("user-agent")?.slice(0, 256) ?? null,
          question,
          // The stored answer includes the fact cards' text, as the visitor saw it.
          answer: steps
            .flatMap((s) => [
              stripCitations(s.text).trim(),
              ...s.toolResults.flatMap((r) =>
                r.toolName === "showFacts"
                  ? (r.output as { facts: { text: string }[] }).facts.map((f) => f.text)
                  : [],
              ),
            ])
            .filter(Boolean)
            .join("\n\n"),
          sources: citedMeta(answer),
          tokensIn: totalUsage.inputTokens,
          tokensOut: totalUsage.outputTokens,
        });
      } catch (error) {
        logError("failed to save conversation", error);
      }
    },
  });

  // Called for every streamed part: collect the text, then send the cited sources at the end.
  let streamedText = "";
  return result.toUIMessageStreamResponse({
    messageMetadata: ({ part }): ChatMessageMetadata | undefined => {
      if (part.type === "start") return { conversationId, conversationToken };
      if (part.type === "text-delta") streamedText += part.text;
      if (part.type === "finish") {
        return { conversationId, conversationToken, sources: citedMeta(streamedText) };
      }
      return undefined;
    },
    onError: (error) => {
      logError("generation failed", error);
      return "Sorry, something went wrong. Please try again.";
    },
  });
}
