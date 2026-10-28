import { cosineDistance, desc, sql } from "drizzle-orm";
import { getDb } from "./db/client";
import { chunks } from "./db/schema";
import { embedQuery } from "./embed";

export type RetrievedChunk = {
  id: string;
  sourcePath: string;
  headingPath: string;
  content: string;
};

const RRF_K = 60;
const PER_LIST = 8;

/**
 * Reciprocal rank fusion: each list contributes 1 / (k + rank) per id, so an
 * id ranked well by both searches beats one ranked first by only one.
 * Returns ids, best first.
 */
export function reciprocalRankFusion(rankings: string[][], k = RRF_K): string[] {
  const scores = new Map<string, number>();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + index + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

const columns = {
  id: chunks.id,
  sourcePath: chunks.sourcePath,
  headingPath: chunks.headingPath,
  content: chunks.content,
};

/** Hybrid search: vector top 8 + full-text top 8, merged with RRF, best `limit` kept. */
export async function retrieve(query: string, { limit = 6 } = {}): Promise<RetrievedChunk[]> {
  const db = getDb();
  const tsQuery = sql`websearch_to_tsquery('english', ${query})`;

  const [vectorRows, textRows] = await Promise.all([
    embedQuery(query).then((embedding) =>
      db
        .select(columns)
        .from(chunks)
        .orderBy(cosineDistance(chunks.embedding, embedding))
        .limit(PER_LIST),
    ),
    db
      .select(columns)
      .from(chunks)
      .where(sql`${chunks.tsv} @@ ${tsQuery}`)
      .orderBy(desc(sql`ts_rank(${chunks.tsv}, ${tsQuery})`))
      .limit(PER_LIST),
  ]);

  const byId = new Map([...vectorRows, ...textRows].map((row) => [row.id, row]));
  return reciprocalRankFusion([vectorRows.map((r) => r.id), textRows.map((r) => r.id)])
    .slice(0, limit)
    .map((id) => byId.get(id)!);
}
