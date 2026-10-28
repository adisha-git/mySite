/**
 * Sends five sample questions to /api/chat and prints each streamed answer
 * with its sources. Needs `npm run dev` running (or CHAT_URL set).
 *
 *   npm run chat:smoke
 *   npm run chat:smoke -- "Has he worked at Google?"   # ask only these questions
 *   SMOKE_DELAY_MS=25000 npm run chat:smoke            # wait between questions
 *                                                      # (Voyage's free tier allows 3 requests/min)
 */
const BASE_URL = process.env.CHAT_URL ?? "http://localhost:3000";
const DELAY_MS = Number(process.env.SMOKE_DELAY_MS ?? 0);

const DEFAULT_QUESTIONS = [
  "What did Adisha do at OCBC?",
  "What's his salary expectation?",
  "Has he worked at Google?",
  "Is he open to work?",
  "What did he build at Singapore Airlines?",
];

type StreamChunk = {
  type: string;
  delta?: string;
  errorText?: string;
  messageMetadata?: { sources?: { path: string; heading: string }[] };
};

async function ask(question: string) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({
      messages: [{ id: "smoke", role: "user", parts: [{ type: "text", text: question }] }],
    }),
  });
  console.log(`\n=== ${question}`);
  if (!res.ok) {
    console.log(`HTTP ${res.status}: ${await res.text()}`);
    return false;
  }

  let answer = "";
  let sources: { path: string; heading: string }[] = [];
  let error: string | undefined;
  for (const line of (await res.text()).split("\n")) {
    if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
    const chunk = JSON.parse(line.slice(6)) as StreamChunk;
    if (chunk.type === "text-delta") answer += chunk.delta ?? "";
    if (chunk.messageMetadata?.sources) sources = chunk.messageMetadata.sources;
    if (chunk.type === "error") error = chunk.errorText;
  }
  console.log(answer.trim() || "(no answer)");
  if (error) console.log(`ERROR: ${error}`);
  console.log(`Sources: ${sources.length ? sources.map((s) => s.heading).join(" | ") : "(none)"}`);
  return !error && answer.trim().length > 0;
}

async function main() {
  const questions = process.argv.length > 2 ? process.argv.slice(2) : DEFAULT_QUESTIONS;
  let passed = 0;
  for (const [i, q] of questions.entries()) {
    if (i > 0 && DELAY_MS > 0) await new Promise((r) => setTimeout(r, DELAY_MS));
    if (await ask(q)) passed += 1;
  }
  console.log(`\n${passed}/${questions.length} questions got a streamed answer.`);
  if (passed !== questions.length) process.exit(1);
}

main().catch((error: unknown) => {
  console.error("chat:smoke failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
