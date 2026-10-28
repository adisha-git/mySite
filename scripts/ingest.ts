/**
 * Chunks content/knowledge/**\/*.md, embeds only what changed, and removes
 * chunks whose text or source file no longer exists.
 *
 *   npm run ingest            # always runs
 *   tsx scripts/ingest.ts --build   # from `npm run build`: only on Vercel production builds,
 *                                   # so previews never overwrite production chunks
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { inArray } from "drizzle-orm";
import { chunkMarkdown, embeddingInput, type Chunk } from "../src/lib/chat/chunk";
import { chatConfig } from "../src/lib/chat/config";
import { getDb } from "../src/lib/chat/db/client";
import { chunks } from "../src/lib/chat/db/schema";
import { embedDocuments } from "../src/lib/chat/embed";

const KNOWLEDGE_DIR = "content/knowledge";
const INSERT_BATCH = 50;

loadEnvConfig(process.cwd());

const key = (sourcePath: string, contentHash: string) => `${sourcePath}\0${contentHash}`;

async function loadChunks(): Promise<{ files: number; chunks: Chunk[]; removedLines: number }> {
  const entries = await readdir(KNOWLEDGE_DIR, { recursive: true });
  const files = entries.filter((f) => f.endsWith(".md")).sort();
  const all: Chunk[] = [];
  let removedLines = 0;
  for (const file of files) {
    const sourcePath = path.posix.join(KNOWLEDGE_DIR, file.split(path.sep).join("/"));
    const markdown = await readFile(sourcePath, "utf8");
    const result = chunkMarkdown(sourcePath, markdown, chatConfig.models.embedding);
    if (result.removedLines) {
      console.log(`  ${sourcePath}: skipped ${result.removedLines} draft/[TO CONFIRM] line(s)`);
    }
    removedLines += result.removedLines;
    all.push(...result.chunks);
  }
  return { files: files.length, chunks: all, removedLines };
}

async function main() {
  if (process.argv.includes("--build") && process.env.VERCEL_ENV !== "production") {
    console.log("ingest: skipped (runs during Vercel production builds, or via `npm run ingest`)");
    return;
  }

  const { files, chunks: wanted, removedLines } = await loadChunks();
  // An empty knowledge base almost certainly means a wrong path; never wipe the table for it.
  if (!wanted.length) throw new Error(`No chunks found in ${KNOWLEDGE_DIR}`);

  const db = getDb();
  const existing = await db
    .select({ id: chunks.id, sourcePath: chunks.sourcePath, contentHash: chunks.contentHash })
    .from(chunks);
  const existingKeys = new Set(existing.map((r) => key(r.sourcePath, r.contentHash)));
  const wantedKeys = new Set(wanted.map((c) => key(c.sourcePath, c.contentHash)));

  const seen = new Set<string>();
  const toEmbed = wanted.filter((c) => {
    const k = key(c.sourcePath, c.contentHash);
    if (existingKeys.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const toDelete = existing
    .filter((r) => !wantedKeys.has(key(r.sourcePath, r.contentHash)))
    .map((r) => r.id);

  // Insert before deleting, so the chat never sees an empty table mid-run.
  if (toEmbed.length) {
    const embeddings = await embedDocuments(toEmbed.map(embeddingInput));
    const rows = toEmbed.map((c, i) => ({ ...c, embedding: embeddings[i] }));
    for (let i = 0; i < rows.length; i += INSERT_BATCH) {
      await db
        .insert(chunks)
        .values(rows.slice(i, i + INSERT_BATCH))
        .onConflictDoNothing();
    }
  }
  if (toDelete.length) await db.delete(chunks).where(inArray(chunks.id, toDelete));

  console.log(
    `ingest: ${files} file(s), ${wanted.length} chunk(s): ${toEmbed.length} embedded, ` +
      `${wanted.length - toEmbed.length} unchanged, ${toDelete.length} deleted` +
      (removedLines ? `; ${removedLines} draft line(s) skipped` : ""),
  );
}

main().catch((error: unknown) => {
  console.error("ingest failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
