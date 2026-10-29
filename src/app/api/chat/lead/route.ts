import { asc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { chatConfig } from "@/lib/chat/config";
import { getDb } from "@/lib/chat/db/client";
import { conversations, leads, messages as messagesTable } from "@/lib/chat/db/schema";
import {
  clientIp,
  hashIp,
  isSameOrigin,
  rateLimitLead,
  readBodyCapped,
  serverSecret,
  verifyConversation,
} from "@/lib/chat/guard";
import { leadConfirmSchema } from "@/lib/chat/lead";
import {
  buildLeadEmail,
  findJobDescription,
  summariseConversation,
  type TranscriptMessage,
} from "@/lib/chat/lead-email";

/**
 * Saves a lead and emails Adisha. Only the widget's Confirm button calls this,
 * after the visitor has checked the details on the card: the model can draft a
 * lead but never save or send one.
 */

const MAX_BODY_BYTES = 16 * 1024;

const fail = (status: number, error: string, init?: ResponseInit) =>
  Response.json({ error }, { ...init, status });

/** Logs only the error's name and message: never request bodies, IPs or keys. */
function logError(context: string, error: unknown) {
  console.error(
    `chat lead: ${context}`,
    error instanceof Error ? `${error.name}: ${error.message}` : "unknown error",
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail(403, "Forbidden.");

  let body: unknown;
  try {
    const raw = await readBodyCapped(request, MAX_BODY_BYTES);
    if (raw === null) return fail(413, "Request is too large.");
    body = JSON.parse(raw);
  } catch {
    return fail(400, "Invalid request body.");
  }

  const parsed = leadConfirmSchema.safeParse(body);
  if (!parsed.success) return fail(422, parsed.error.issues[0]?.message ?? "Invalid request.");
  const { leadId, conversationId, conversationToken, lead } = parsed.data;

  const limit = await rateLimitLead(hashIp(clientIp(request)));
  if (!limit.ok) {
    return fail(429, "Too many requests. Please wait a while and try again.", {
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  // Only a conversation that passed the bot check can leave a lead.
  const secret = serverSecret();
  if (!secret || !verifyConversation(conversationId, conversationToken, secret)) {
    return fail(403, "This chat session isn't valid any more. Please use the contact form.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const notify = process.env[chatConfig.leads.notifyEnv];
  if (!apiKey || !notify) {
    logError(
      "not configured",
      new Error(`RESEND_API_KEY or ${chatConfig.leads.notifyEnv} is not set`),
    );
    return fail(503, "This isn't available right now. Please use the contact form.");
  }

  let transcript: TranscriptMessage[] = [];
  let jobDescription: string | null = null;
  try {
    const db = getDb();
    const [conversation] = await db
      .select({ id: conversations.id, jobDescription: conversations.jobDescription })
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    if (conversation) {
      transcript = await db
        .select({ role: messagesTable.role, content: messagesTable.content })
        .from(messagesTable)
        .where(eq(messagesTable.conversationId, conversationId))
        .orderBy(asc(messagesTable.createdAt));
      // The fit check stores the job description it checked; older chats only have long messages.
      jobDescription = conversation.jobDescription ?? findJobDescription(transcript);
    }
    // Same leadId on a retry: saved once.
    await db
      .insert(leads)
      .values({
        id: leadId,
        conversationId: conversation ? conversationId : null,
        name: lead.name,
        email: lead.email,
        company: lead.company || null,
        topic: lead.topic,
        note: lead.note || null,
        jobDescription,
      })
      .onConflictDoNothing();
  } catch (error) {
    logError("failed to save lead", error);
    return fail(500, "Sorry, your details couldn't be saved. Please use the contact form.");
  }

  const summary = await summariseConversation(transcript);
  const { subject, text, html } = buildLeadEmail(lead, {
    summary,
    jobDescription,
    receivedAt: new Date(),
  });

  try {
    const { error } = await new Resend(apiKey).emails.send(
      { from: chatConfig.leads.emailFrom, to: notify, replyTo: lead.email, subject, text, html },
      // Same leadId on a retry: Resend sends at most one email.
      { idempotencyKey: `chat-lead/${leadId}` },
    );
    if (error) {
      logError("Resend rejected the email", new Error(`${error.name} (${error.statusCode})`));
      return fail(502, "Your details were saved, but the notification failed. Please try again.");
    }
  } catch (error) {
    logError("failed to send email", error);
    return fail(502, "Your details were saved, but the notification failed. Please try again.");
  }

  return Response.json({ ok: true });
}
