import { describe, expect, it } from "vitest";
import {
  MAX_CHUNK_TOKENS,
  chunkMarkdown,
  embeddingInput,
  estimateTokens,
  stripDraftMarkers,
} from "@/lib/chat/chunk";

const MODEL = "voyage-4-lite";
const sentence = "Adisha led frontend architecture for the RM Frontend application. ";

describe("stripDraftMarkers", () => {
  it("removes the draft notice and every [TO CONFIRM] line, and counts them", () => {
    const md = [
      "# Title",
      "> DRAFT. Every `[TO CONFIRM: …]` marker is a gap.",
      "## Section",
      "Real text.",
      "[TO CONFIRM: team size]",
      "- [TO CONFIRM: another]",
    ].join("\n");
    const { text, removed } = stripDraftMarkers(md);
    expect(removed).toBe(3);
    expect(text).not.toContain("TO CONFIRM");
    expect(text).not.toContain("DRAFT");
    expect(text).toContain("Real text.");
  });
});

describe("chunkMarkdown", () => {
  it("never embeds unconfirmed text and drops headings left empty", () => {
    const md = [
      "# OCBC Bank",
      "## What I owned",
      "He led frontend architecture.",
      "## Hardest problem",
      "[TO CONFIRM: the situation]",
    ].join("\n");
    const { chunks, removedLines } = chunkMarkdown("content/knowledge/roles/ocbc.md", md, MODEL);
    expect(removedLines).toBe(1);
    const all = chunks.map((c) => c.headingPath + c.content).join("\n");
    expect(all).not.toContain("TO CONFIRM");
    expect(all).not.toContain("Hardest problem");
  });

  it("merges small sections and prefixes a breadcrumb with the title and headings", () => {
    const md = [
      "# OCBC Bank",
      "Singapore · 2022",
      "## What I owned",
      "A.",
      "## Team and setup",
      "B.",
    ].join("\n");
    const { chunks } = chunkMarkdown("content/knowledge/roles/ocbc.md", md, MODEL);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].headingPath).toBe("OCBC Bank > What I owned; Team and setup");
    expect(chunks[0].content).toContain("Singapore · 2022");
    expect(chunks[0].content).toContain("## Team and setup\n\nB.");
    expect(embeddingInput(chunks[0]).startsWith("OCBC Bank > What I owned")).toBe(true);
  });

  it("labels H3 sections with their H2", () => {
    const md = ["# Facts", "## Contact", "### Email", "Email him."].join("\n");
    const { chunks } = chunkMarkdown("content/knowledge/facts.md", md, MODEL);
    expect(chunks[0].headingPath).toBe("Facts > Contact > Email");
  });

  it("keeps sections that are large enough on their own as separate chunks", () => {
    const big = sentence.repeat(20); // ~330 tokens
    const md = ["# Doc", "## One", big, "## Two", big].join("\n");
    const { chunks } = chunkMarkdown("content/knowledge/doc.md", md, MODEL);
    expect(chunks.map((c) => c.headingPath)).toEqual(["Doc > One", "Doc > Two"]);
  });

  it("splits oversized sections on paragraph breaks", () => {
    const paragraph = sentence.repeat(12);
    const md = [
      "# Doc",
      "## Long",
      ...Array(8)
        .fill(paragraph)
        .flatMap((p) => [p, ""]),
    ].join("\n");
    const { chunks } = chunkMarkdown("content/knowledge/doc.md", md, MODEL);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(estimateTokens(c.content)).toBeLessThanOrEqual(MAX_CHUNK_TOKENS);
  });

  it("hashes deterministically, and changes the hash when the model changes", () => {
    const md = "# Doc\n## A\nSome text.";
    const a = chunkMarkdown("p.md", md, MODEL).chunks[0].contentHash;
    const b = chunkMarkdown("p.md", md, MODEL).chunks[0].contentHash;
    const c = chunkMarkdown("p.md", md, "another-model").chunks[0].contentHash;
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
