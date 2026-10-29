import { anthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, type ModelMessage } from "ai";
import { citedSources, parseCitations, stripCitations } from "@/lib/chat/citations";
import { chatConfig } from "@/lib/chat/config";
import type { ChatMessageMetadata, MessageSource } from "@/lib/chat/db/schema";
import { factStepText, factStepTransform } from "@/lib/chat/fact-step";
import {
  chatRequestSchema,
  checkConversation,
  clientIp,
  hashIp,
  isSameOrigin,
  MAX_MESSAGES,
  rateLimitChat,
  readBodyCapped,
  serverSecret,
  signConversation,
} from "@/lib/chat/guard";
import { buildInstructions } from "@/lib/chat/prompt";
import { retrieve, type RetrievedChunk } from "@/lib/chat/retrieve";
import { saveExchange, storedMessageCount } from "@/lib/chat/store";
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
    // The client caps the conversation too, but a client can drop its history; the stored count can't.
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
    // One step: any tool call (a fact card, a lead card or a site action) ends the
    // answer, so nothing written after it can repeat what came before.
    stopWhen: stepCountIs(1),
    // A fact card's step shows only its lead-in, never the model's own wording of the fact.
    experimental_transform: factStepTransform(),
    providerOptions: { anthropic: { effort: "low" } },
    onFinish: async ({ steps, totalUsage }) => {
      // What the visitor saw of each step's text (see fact-step.ts).
      const visibleText = steps.map((s) => {
        const facts = s.toolCalls.find((c) => c.toolName === "showFacts");
        return facts ? factStepText(s.text, (facts.input as { leadIn?: string }).leadIn) : s.text;
      });
      const answer = visibleText.join("\n\n");
      try {
        await saveExchange({
          conversationId,
          ipHash,
          userAgent: request.headers.get("user-agent")?.slice(0, 256) ?? null,
          question,
          // The stored answer includes the fact cards' text, as the visitor saw it.
          answer: steps
            .flatMap((s, i) => [
              stripCitations(visibleText[i]).trim(),
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
