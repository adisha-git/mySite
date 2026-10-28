import { sql } from "drizzle-orm";
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const EMBEDDING_DIMENSIONS = 1024;

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export type MessageSource = {
  path: string;
  heading: string;
};

/** Metadata streamed to the client with each assistant message. */
export type ChatMessageMetadata = {
  conversationId: string;
  /** Signed proof that the conversation passed the bot check; sent back with later messages. */
  conversationToken?: string;
  /** The sources the answer cites; sent when the answer finishes. */
  sources?: MessageSource[];
};

// One row per heading-based chunk of a content/knowledge file.
export const chunks = pgTable(
  "chunks",
  {
    id: uuid().primaryKey().defaultRandom(),
    sourcePath: text("source_path").notNull(),
    headingPath: text("heading_path").notNull(),
    content: text().notNull(),
    contentHash: text("content_hash").notNull(),
    embedding: vector({ dimensions: EMBEDDING_DIMENSIONS }).notNull(),
    tsv: tsvector().generatedAlwaysAs(sql`to_tsvector('english', heading_path || ' ' || content)`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("chunks_source_hash_idx").on(t.sourcePath, t.contentHash),
    index("chunks_embedding_hnsw_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
    index("chunks_tsv_gin_idx").using("gin", t.tsv),
  ],
);

export const conversations = pgTable("conversations", {
  id: uuid().primaryKey().defaultRandom(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  ipHash: text("ip_hash").notNull(),
  userAgent: text("user_agent"),
  messageCount: integer("message_count").notNull().default(0),
});

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text().$type<"user" | "assistant">().notNull(),
    content: text().notNull(),
    sources: jsonb().$type<MessageSource[]>(),
    tokensIn: integer("tokens_in"),
    tokensOut: integer("tokens_out"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId)],
);

export const leads = pgTable("leads", {
  id: uuid().primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id, {
    onDelete: "set null",
  }),
  name: text().notNull(),
  email: text().notNull(),
  company: text(),
  topic: text().notNull(),
  note: text(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
