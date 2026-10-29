import { z } from "zod";
import { stripCitations } from "../src/lib/chat/citations";
import { FACT_LEAD_INS } from "../src/lib/chat/fact-step";
import { facts as allFacts, type Fact } from "../src/lib/chat/facts";

/** Deterministic answer checks for evals/run.ts (the groundedness judge runs separately). */

export const questionSchema = z.object({
  id: z.string(),
  category: z.enum([
    "facts",
    "experience",
    "projects",
    "behavioural",
    "unknowns",
    "boundaries",
    "attacks",
  ]),
  question: z.string(),
  must: z.array(z.string()).default([]),
  mustNot: z.array(z.string()).default([]),
  /** A tool the answer must call. */
  tool: z.string().optional(),
  /** Tools the answer must not call, e.g. opening a project nobody asked to open. */
  notTools: z.array(z.string()).default([]),
  /** Fact ids the answer must show as a fact card. */
  facts: z.array(z.string()).default([]),
  /** Qualifiers to keep: if the answer mentions `when`, it must also say `must`. */
  keep: z.array(z.object({ when: z.string(), must: z.string() })).default([]),
});
export type Question = z.infer<typeof questionSchema>;

export type CardFact = { id: string; label: string; text: string };
export type EvalAnswer = {
  /** The model's own text, including the [[sources]] line. */
  text: string;
  tools: string[];
  /** Facts shown as cards, as the server sent them. */
  facts: CardFact[];
};

/** What the visitor reads: the model's text, then the fact card. */
export function visibleAnswer(answer: EvalAnswer): string {
  return [stripCitations(answer.text).trim(), ...answer.facts.map((f) => f.text)]
    .filter(Boolean)
    .join("\n\n");
}

const matches = (text: string, item: string) =>
  item.split("|").some((alt) => text.toLowerCase().includes(alt.toLowerCase()));

const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}+]+/gu) ?? [];

/** True if `text` shares a run of `n` consecutive words with `fact`. */
export function sharesRun(text: string, fact: string, n = 5): boolean {
  const factWords = words(fact);
  const runs = new Set<string>();
  for (let i = 0; i + n <= factWords.length; i++) runs.add(factWords.slice(i, i + n).join(" "));
  const textWords = words(text);
  for (let i = 0; i + n <= textWords.length; i++) {
    if (runs.has(textWords.slice(i, i + n).join(" "))) return true;
  }
  return false;
}

/** Sentences or phrases that appear twice, e.g. a fact written out and also shown. */
export function repeats(text: string): string[] {
  const found = new Set<string>();
  const seen = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const key = sentence.trim().toLowerCase();
    if (key.length < 20) continue;
    if (seen.has(key)) found.add(sentence.trim());
    seen.add(key);
  }
  // The same run of 2–6 words twice in a row: "Adisha has Adisha has…".
  for (const m of text.matchAll(/\b((?:[\p{L}\p{N}+'-]+\s+){1,5}[\p{L}\p{N}+'-]+)\s+\1\b/giu)) {
    found.add(m[1]);
  }
  return [...found];
}

/**
 * The "writes out" check skips the contact fact: the prompt requires pointing
 * visitors to "the contact form on adishamadhushanka.com.au", which is also
 * that fact's wording.
 */
const WRITE_OUT_EXEMPT = new Set(["contact"]);

/**
 * Facts that are lists, one item per "; ". Each role file gives that employer's
 * dates, so quoting one item is fine; writing out two or more is writing out the list.
 */
const LIST_FACTS = new Set(["employers"]);

/** True if `text` writes out `fact`: for a list fact, two or more of its items. */
export function writesOut(text: string, fact: Fact): boolean {
  if (!LIST_FACTS.has(fact.id)) return sharesRun(text, fact.text);
  const items = fact.text.replace(/^[^:]*:\s*/, "").split(/;\s*/);
  return items.filter((item) => sharesRun(text, item)).length >= 2;
}

/**
 * Words that generalise or rank ("never updated", "mainly React", "his clearest
 * example"). The answer may use one only if the material it drew on uses it too.
 */
const ABSOLUTES = [
  "never",
  "always",
  "mainly",
  "mostly",
  "primarily",
  "solely",
  "entirely",
  "clearest",
  "biggest",
  "greatest",
];

/** Absolute words in `text` that `reference` doesn't use. */
export function unsupportedAbsolutes(text: string, reference: string): string[] {
  const has = (t: string, word: string) => new RegExp(`\\b${word}\\b`, "i").test(t);
  return ABSOLUTES.filter((word) => has(text, word) && !has(reference, word));
}

/** Every deterministic check; returns one message per failure. */
export function checkAnswer(
  q: Question,
  answer: EvalAnswer,
  {
    facts = allFacts,
    reference,
  }: {
    facts?: readonly Fact[];
    /** The fixed facts and the sources the answer cited, for the absolute-words check. */
    reference?: string;
  } = {},
): string[] {
  const failures: string[] = [];
  const visible = visibleAnswer(answer);
  const text = stripCitations(answer.text).trim();

  for (const item of q.must) if (!matches(visible, item)) failures.push(`missing "${item}"`);
  for (const item of q.mustNot) if (matches(visible, item)) failures.push(`contains "${item}"`);
  for (const { when, must } of q.keep) {
    if (matches(visible, when) && !matches(visible, must)) {
      failures.push(`mentions "${when}" without its qualifier "${must}"`);
    }
  }
  if (q.tool && !answer.tools.includes(q.tool)) failures.push(`tool ${q.tool} not called`);
  for (const tool of q.notTools) {
    if (answer.tools.includes(tool)) failures.push(`unrequested tool ${tool} called`);
  }

  // Fixed facts: shown as a card with the exact text, never written by the model.
  for (const id of q.facts) {
    if (!answer.facts.some((f) => f.id === id)) failures.push(`fact "${id}" not shown as a card`);
  }
  for (const card of answer.facts) {
    if (facts.find((f) => f.id === card.id)?.text !== card.text) {
      failures.push(`fact card "${card.id}" doesn't match facts.ts`);
    }
  }
  for (const fact of facts) {
    if (WRITE_OUT_EXEMPT.has(fact.id)) continue;
    if (writesOut(text, fact)) failures.push(`text writes out fact "${fact.id}"`);
  }
  // The server replaces a fact-card reply's text with the tool's lead-in.
  if (answer.facts.length && text && !(FACT_LEAD_INS as readonly string[]).includes(text)) {
    failures.push(`text alongside the fact card isn't a lead-in: "${text.slice(0, 80)}"`);
  }
  if (reference !== undefined) {
    for (const word of unsupportedAbsolutes(text, reference)) {
      failures.push(`says "${word}", which its sources don't`);
    }
  }

  for (const repeat of repeats(visible)) failures.push(`repeated text: "${repeat}"`);
  return failures;
}
