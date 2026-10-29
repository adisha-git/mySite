import { eq, sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { conversations, messages, type MessageSource } from "./db/schema";

export type Exchange = {
  conversationId: string;
  ipHash: string;
  userAgent: string | null;
  question: string;
  answer: string;
  sources: MessageSource[];
  tokensIn: number | undefined;
  tokensOut: number | undefined;
  /** Set by the fit check: the job description the visitor pasted. */
  jobDescription?: string;
};

/** Saves one question and answer, creating the conversation on its first exchange. */
export async function saveExchange(e: Exchange) {
  const db = getDb();
  const jobDescription = e.jobDescription ? { jobDescription: e.jobDescription } : {};
  await db.batch([
    db
      .insert(conversations)
      .values({
        id: e.conversationId,
        ipHash: e.ipHash,
        userAgent: e.userAgent,
        messageCount: 2,
        ...jobDescription,
      })
      .onConflictDoUpdate({
        target: conversations.id,
        set: { messageCount: sql`${conversations.messageCount} + 2`, ...jobDescription },
      }),
    db.insert(messages).values([
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
export async function storedMessageCount(
  conversationId: string,
  onError: (error: unknown) => void,
): Promise<number> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ count: conversations.messageCount })
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return row?.count ?? 0;
  } catch (error) {
    onError(error);
    return 0;
  }
}
