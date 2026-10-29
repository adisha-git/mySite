/**
 * Fit-check evals: sends each job description in evals/fit.yaml to
 * /api/fit-check and checks the card: response time, the expected matches and
 * gaps, that every quote is in the source it names, and (with Claude Haiku as
 * judge) that the summary only says what the sources support.
 *
 *   npm run dev              # in another terminal (development mode)
 *   npm run evals:fit
 *
 * Results go to evals/results/fit-*.json.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import { parse } from "yaml";
import { z } from "zod";
import { getDb } from "../src/lib/chat/db/client";
import { chunks } from "../src/lib/chat/db/schema";
import { facts } from "../src/lib/chat/facts";
import { isUnconfirmed, quoteAppearsIn, type FitCheckResponse } from "../src/lib/chat/fit";
import { judge } from "./judge";

loadEnvConfig(process.cwd());

const BASE_URL = process.env.EVAL_BASE_URL ?? "http://localhost:3000";
const DELAY_MS = Number(process.env.EVAL_DELAY_MS ?? 21000);
const MAX_SECONDS = 15;
/** Accepted by Cloudflare's always-pass test secret, which the dev server uses. */
const TEST_TURNSTILE_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

const jobSchema = z.object({
  id: z.string(),
  jobDescription: z.string(),
  match: z.array(z.string()).default([]),
  gap: z.array(z.string()).default([]),
  notMatched: z.array(z.string()).default([]),
});

/** Varies the test addresses between runs. */
const RUN = Math.floor(Math.random() * 254);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mentions = (text: string, item: string) =>
  item.split("|").some((alt) => new RegExp(`\\b${alt}\\b`, "i").test(text));

async function main() {
  const file = parse(await readFile("evals/fit.yaml", "utf8")) as { jobs: unknown[] };
  const jobs = z.array(jobSchema).parse(file.jobs);
  const rows = await getDb()
    .select({ path: chunks.sourcePath, heading: chunks.headingPath, content: chunks.content })
    .from(chunks);
  const factsText = facts.map((f) => `${f.label}: ${f.text}`).join("\n");
  const fullContext = [
    `<facts>\n${factsText}\n</facts>`,
    ...rows.map((r) => `<source path="${r.path}">\n${r.content}\n</source>`),
  ].join("\n\n");

  const results = [];
  for (const [i, job] of jobs.entries()) {
    if (i > 0) await sleep(DELAY_MS);
    const failures: string[] = [];
    const started = Date.now();
    const res = await fetch(`${BASE_URL}/api/fit-check`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: BASE_URL,
        "user-agent": "portfolio-chat-evals",
        // Fit checks are limited to 5 an hour per IP: a documentation-range address per job and run.
        "x-forwarded-for": `192.0.2.${((RUN + i) % 254) + 1}`,
      },
      body: JSON.stringify({
        jobDescription: job.jobDescription,
        turnstileToken: TEST_TURNSTILE_TOKEN,
      }),
    });
    const seconds = (Date.now() - started) / 1000;
    const body = (await res.json()) as Partial<FitCheckResponse> & { error?: string };
    if (!res.ok || !body.fit) {
      failures.push(`request failed (${res.status}): ${body.error ?? "no fit"}`);
      results.push({ id: job.id, passed: false, failures, seconds });
      console.log(`FAIL  ${job.id}\n      ${failures.join("\n      ")}`);
      continue;
    }
    const { fit } = body;
    if (seconds > MAX_SECONDS)
      failures.push(`took ${seconds.toFixed(1)}s (target ${MAX_SECONDS}s)`);

    const shown = [...fit.matched, ...fit.partial];
    const matchedText = shown
      .map((m) => [m.requirement, ...m.evidence.map((e) => e.quote)].join(" "))
      .join("\n");
    for (const item of job.match) {
      if (!mentions(matchedText, item)) failures.push(`"${item}" not matched`);
    }
    for (const item of job.gap) {
      if (!fit.gaps.some((g) => mentions(g, item))) failures.push(`"${item}" not listed as a gap`);
    }
    for (const item of job.notMatched) {
      if (shown.some((m) => mentions(m.requirement, item))) {
        failures.push(`"${item}" matched without support`);
      }
    }

    // Independently of the server: every quote must be in the source it names.
    for (const { requirement, evidence } of shown) {
      for (const e of evidence) {
        const content =
          e.path === "facts"
            ? facts.find((f) => f.label === e.heading)?.text
            : rows.find((r) => r.path === e.path && r.heading === e.heading)?.content;
        if (!content || !quoteAppearsIn(e.quote, content)) {
          failures.push(`quote for "${requirement}" isn't in ${e.path}`);
        } else if (isUnconfirmed({ path: e.path, heading: e.heading, content })) {
          failures.push(`"${requirement}" uses evidence from unconfirmed ${e.path}`);
        }
      }
    }

    // The card as the visitor reads it: each requirement next to the quotes shown for it.
    const withQuotes = (m: (typeof shown)[number]) =>
      `${m.requirement} (${m.evidence.map((e) => `${e.label}: "${e.quote}"`).join("; ")})`;
    const card = [
      ...fit.matched.map((m) => `Matches: ${withQuotes(m)}`),
      ...fit.partial.map((m) => `Partly shown: ${withQuotes(m)}`),
      ...fit.gaps.map((g) => `Not shown in his written experience: ${g}`),
      fit.summary,
    ].join("\n");
    try {
      // Requirement names come from the job description; the claim is that the quotes show them.
      const verdict = await judge(
        "How well does he fit this job? (The fit card names each requirement in the job's words. A line under Matches claims the quoted evidence shows he meets that requirement; a line under Partly shown claims it shows something related but narrower; a line under Not shown claims his material doesn't show it. The summary's assessment of the card itself, such as which matches are strongest or that only some requirements have evidence, is not a claim about Adisha; check the factual claims about him, his work and his experience.)",
        card,
        [],
        fullContext,
      );
      if (!verdict.supported) failures.push(`unsupported: ${verdict.unsupportedClaims.join("; ")}`);
    } catch (error) {
      failures.push(`judge failed: ${error instanceof Error ? error.message : "unknown"}`);
    }

    const passed = failures.length === 0;
    results.push({ id: job.id, passed, failures, seconds, fit });
    console.log(
      `${passed ? "PASS" : "FAIL"}  ${job.id} (${seconds.toFixed(1)}s, ${fit.matched.length} matched, ${fit.partial.length} partly, ${fit.gaps.length} gaps)${
        failures.length ? `\n      ${failures.join("\n      ")}` : ""
      }`,
    );
  }

  const passed = results.filter((r) => r.passed).length;
  console.log(`\nfit evals: ${passed}/${results.length} passed`);
  await mkdir("evals/results", { recursive: true });
  const out = `evals/results/fit-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(
    out,
    JSON.stringify(
      { ranAt: new Date().toISOString(), baseUrl: BASE_URL, passed, results },
      null,
      2,
    ),
  );
  console.log(`results: ${out}`);
}

main().catch((error: unknown) => {
  console.error("fit evals failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
