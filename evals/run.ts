/**
 * Answer-quality evals: asks every question in evals/questions.yaml through
 * /api/chat, checks must / mustNot / tool, and has Claude Haiku judge whether
 * every claim is supported by the fixed facts or the knowledge files.
 *
 *   npm run dev            # in another terminal (development mode)
 *   npm run evals          # all questions
 *   npm run evals -- story-bug facts-location   # only these ids
 *
 * Env: EVAL_BASE_URL (default http://localhost:3000), EVAL_DELAY_MS (default
 * 21000, which keeps Voyage's free tier of 3 requests a minute happy).
 *
 * Runs against the dev server: there the bot check uses Cloudflare's test
 * keys, which accept the dummy token below. Results go to evals/results/.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { parse } from "yaml";
import { z } from "zod";
import { hasLooseMarker, parseCitations } from "../src/lib/chat/citations";
import { getDb } from "../src/lib/chat/db/client";
import { chunks } from "../src/lib/chat/db/schema";
import { facts } from "../src/lib/chat/facts";
import { checkAnswer, questionSchema, visibleAnswer, type CardFact } from "./checks";
import { judge } from "./judge";

loadEnvConfig(process.cwd());

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 21000);
/** Accepted by Cloudflare's always-pass test secret, which the dev server uses. */
const TEST_TURNSTILE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

type Source = { path: string; heading: string };
type Answer = {
  status: number;
  text: string;
  tools: string[];
  facts: CardFact[];
  sources: Source[];
  error?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Asks one question as a new conversation and reads the UI message stream. */
async function ask(question: string, index: number): Promise<Answer> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: BASE_URL,
      "user-agent": "portfolio-chat-evals",
      // Rate limits are per IP; a documentation-range address per question keeps
      // a run from using up the dev machine's own daily quota.
      "x-forwarded-for": `198.51.100.${(index % 250) + 1}`,
    },
    body: JSON.stringify({
      turnstileToken: TEST_TURNSTILE_TOKEN,
      messages: [{ id: "q", role: "user", parts: [{ type: "text", text: question }] }],
    }),
  });
  const body = await res.text();
  if (!res.ok)
    return { status: res.status, text: "", tools: [], facts: [], sources: [], error: body };

  let text = "";
  const tools: string[] = [];
  const cards: CardFact[] = [];
  let sources: Source[] = [];
  let error: string | undefined;
  for (const line of body.split("\n")) {
    if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
    const part = JSON.parse(line.slice(6)) as Record<string, unknown>;
    if (part.type === "text-delta") text += String(part.delta);
    if (part.type === "tool-input-available") tools.push(String(part.toolName));
    if (part.type === "tool-output-available") {
      const output = part.output as { facts?: CardFact[] } | undefined;
      if (output?.facts) cards.push(...output.facts);
    }
    if (part.type === "error") error = String(part.errorText);
    const metadata = part.messageMetadata as { sources?: Source[] } | undefined;
    if (metadata?.sources) sources = metadata.sources;
  }
  return { status: res.status, text, tools, facts: cards, sources, error };
}

async function main() {
  const filter = process.argv.slice(2);
  const file = parse(await readFile("evals/questions.yaml", "utf8")) as { questions: unknown[] };
  const all = z.array(questionSchema).parse(file.questions);
  const questions = filter.length ? all.filter((q) => filter.includes(q.id)) : all;

  // Everything the chat may draw on: fixed facts plus every embedded chunk.
  const rows = await getDb()
    .select({ path: chunks.sourcePath, heading: chunks.headingPath, content: chunks.content })
    .from(chunks);
  const factsText = facts.map((f) => `${f.label}: ${f.text}`).join("\n");
  const contextFor = (sources: Source[]) =>
    [
      `<facts>\n${factsText}\n</facts>`,
      ...rows
        .filter((r) => sources.some((s) => s.path === r.path && s.heading === r.heading))
        .map((r) => `<source path="${r.path}">\n${r.content}\n</source>`),
    ].join("\n\n");
  const fullContext = contextFor(rows.map((r) => ({ path: r.path, heading: r.heading })));

  const results = [];
  for (const [i, q] of questions.entries()) {
    if (i > 0) await sleep(DELAY_MS);
    const answer = await ask(q.question, i);
    const visible = visibleAnswer(answer);
    const failures: string[] = [];
    const warnings: string[] = [];

    if (answer.error || answer.status !== 200) {
      failures.push(`request failed (${answer.status}): ${answer.error?.slice(0, 200)}`);
    } else {
      failures.push(...checkAnswer(q, answer, { reference: contextFor(answer.sources) }));
      if (parseCitations(answer.text) === null) warnings.push("no [[sources]] marker");
      // The widget hides it and the chips still work, but the prompt asks for brackets.
      if (hasLooseMarker(answer.text)) warnings.push("sources line without [[brackets]]");

      // Judge against the cited sources first; if that fails, against everything, to
      // tell an invented claim (a failure) from a claim whose source wasn't cited (a warning).
      try {
        const cited = await judge(q.question, visible, answer.tools, contextFor(answer.sources));
        if (!cited.supported) {
          const full = await judge(q.question, visible, answer.tools, fullContext);
          if (full.supported) {
            warnings.push(`cited sources don't cover: ${cited.unsupportedClaims.join("; ")}`);
          } else {
            failures.push(`unsupported: ${full.unsupportedClaims.join("; ")}`);
          }
        }
      } catch (error) {
        failures.push(`judge failed: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }

    const passed = failures.length === 0;
    results.push({
      ...q,
      passed,
      failures,
      warnings,
      answer: visible,
      modelText: answer.text,
      factCards: answer.facts.map((f) => f.id),
      tools: answer.tools,
      sources: answer.sources,
    });
    console.log(
      `${passed ? "PASS" : "FAIL"}  ${q.id}${failures.length ? `\n      ${failures.join("\n      ")}` : ""}${
        warnings.length ? `\n      (warn) ${warnings.join("\n      (warn) ")}` : ""
      }`,
    );
  }

  const passed = results.filter((r) => r.passed).length;
  const byCategory = Object.entries(Object.groupBy(results, (r) => r.category)).map(
    ([category, rs]) => `${category} ${rs!.filter((r) => r.passed).length}/${rs!.length}`,
  );
  console.log(`\nevals: ${passed}/${results.length} passed (${byCategory.join(", ")})`);

  await mkdir("evals/results", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = `evals/results/${stamp}.json`;
  await writeFile(
    out,
    JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        baseUrl: BASE_URL,
        passed,
        total: results.length,
        results,
      },
      null,
      2,
    ),
  );
  console.log(`results: ${out}`);
}

main().catch((error: unknown) => {
  console.error("evals failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
