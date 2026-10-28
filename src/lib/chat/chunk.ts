import { createHash } from "node:crypto";

/**
 * Heading-based chunking for content/knowledge Markdown.
 *
 * Each H2/H3 section becomes a piece; small pieces are merged with their
 * neighbours and oversized ones are split on paragraph breaks, aiming for
 * 200–600 tokens per chunk. Draft notices and [TO CONFIRM …] lines are
 * stripped first, so unconfirmed text is never embedded.
 */

export const MIN_CHUNK_TOKENS = 200;
export const MAX_CHUNK_TOKENS = 600;

export type Chunk = {
  sourcePath: string;
  headingPath: string;
  content: string;
  contentHash: string;
};

type Piece = { label: string | null; text: string };

/** Rough count (about 4 characters per token); good enough for sizing chunks. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function stripDraftMarkers(markdown: string): { text: string; removed: number } {
  let removed = 0;
  const kept = markdown.split("\n").filter((line) => {
    const t = line.trim();
    const drop = t.includes("[TO CONFIRM") || /^>\s*DRAFT\b/.test(t);
    if (drop) removed += 1;
    return !drop;
  });
  return { text: kept.join("\n"), removed };
}

function splitSections(markdown: string): { title: string; pieces: Piece[] } {
  let title = "";
  let h2: string | null = null;
  let label: string | null = null;
  let headingLine = "";
  let body: string[] = [];
  const pieces: Piece[] = [];

  // A heading with nothing under it (e.g. once markers are stripped) is dropped.
  const flush = () => {
    const text = body.join("\n").trim();
    if (text) pieces.push({ label, text: headingLine ? `${headingLine}\n\n${text}` : text });
  };

  for (const line of markdown.split("\n")) {
    const heading = /^(#{1,3})\s+(.+?)\s*$/.exec(line);
    if (heading?.[1] === "#" && !title) {
      title = heading[2];
      continue;
    }
    if (heading && heading[1] !== "#") {
      flush();
      if (heading[1] === "##") {
        h2 = heading[2];
        label = heading[2];
      } else {
        label = h2 ? `${h2} > ${heading[2]}` : heading[2];
      }
      headingLine = line.trim();
      body = [];
      continue;
    }
    body.push(line);
  }
  flush();
  return { title, pieces };
}

function splitOversized(piece: Piece): Piece[] {
  if (estimateTokens(piece.text) <= MAX_CHUNK_TOKENS) return [piece];
  const parts: Piece[] = [];
  let current = "";
  for (const paragraph of piece.text.split(/\n{2,}/)) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (current && estimateTokens(next) > MAX_CHUNK_TOKENS) {
      parts.push({ label: piece.label, text: current });
      current = paragraph;
    } else {
      current = next;
    }
  }
  if (current) parts.push({ label: piece.label, text: current });
  return parts;
}

const groupTokens = (group: Piece[]) => group.reduce((n, p) => n + estimateTokens(p.text), 0);

function groupPieces(pieces: Piece[]): Piece[][] {
  const groups: Piece[][] = [];
  let current: Piece[] = [];
  for (const piece of pieces) {
    const size = groupTokens(current);
    if (
      current.length &&
      (size >= MIN_CHUNK_TOKENS || size + estimateTokens(piece.text) > MAX_CHUNK_TOKENS)
    ) {
      groups.push(current);
      current = [];
    }
    current.push(piece);
  }
  if (current.length) {
    // A small last group joins the one before it when that still fits.
    const previous = groups.at(-1);
    const size = groupTokens(current);
    if (size < MIN_CHUNK_TOKENS && previous && groupTokens(previous) + size <= MAX_CHUNK_TOKENS) {
      previous.push(...current);
    } else {
      groups.push(current);
    }
  }
  return groups;
}

export function hashChunk(model: string, headingPath: string, content: string): string {
  return createHash("sha256").update(`${model}\n${headingPath}\n${content}`).digest("hex");
}

/** Text sent to the embedding model: the breadcrumb gives each chunk its context. */
export function embeddingInput(chunk: Pick<Chunk, "headingPath" | "content">): string {
  return `${chunk.headingPath}\n\n${chunk.content}`;
}

export function chunkMarkdown(
  sourcePath: string,
  markdown: string,
  model: string,
): { chunks: Chunk[]; removedLines: number } {
  const { text, removed } = stripDraftMarkers(markdown);
  const { title, pieces } = splitSections(text);
  const docTitle = title || sourcePath;

  const chunks = groupPieces(pieces.flatMap(splitOversized)).map((group) => {
    const labels = [...new Set(group.map((p) => p.label).filter((l): l is string => l !== null))];
    const headingPath = labels.length ? `${docTitle} > ${labels.join("; ")}` : docTitle;
    const content = group.map((p) => p.text).join("\n\n");
    return {
      sourcePath,
      headingPath,
      content,
      contentHash: hashChunk(model, headingPath, content),
    };
  });

  return { chunks, removedLines: removed };
}
