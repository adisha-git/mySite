import type { TextStreamPart, ToolSet } from "ai";
import { describe, expect, it } from "vitest";
import { factStepText, factStepTransform } from "@/lib/chat/fact-step";

type Part = TextStreamPart<ToolSet>;

const text = (id: string, ...deltas: string[]): Part[] => [
  { type: "text-start", id },
  ...deltas.map((d): Part => ({ type: "text-delta", id, text: d })),
  { type: "text-end", id },
];
const call = (toolName: string, input: unknown) =>
  ({ type: "tool-call", toolCallId: "call-1", toolName, input }) as Part;
const result = (toolName: string, output: unknown) =>
  ({ type: "tool-result", toolCallId: "call-1", toolName, input: {}, output }) as Part;
const step = (...parts: Part[]): Part[] => [
  { type: "start-step", request: {}, warnings: [] } as Part,
  ...parts,
  { type: "finish-step" } as Part,
];

async function run(parts: Part[]): Promise<Part[]> {
  const input = new ReadableStream<Part>({
    start(controller) {
      for (const part of parts) controller.enqueue(part);
      controller.close();
    },
  });
  const out: Part[] = [];
  const reader = input
    .pipeThrough(factStepTransform()({ tools: {}, stopStream: () => {} }))
    .getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return out;
    out.push(value);
  }
}

const visibleText = (parts: Part[]) =>
  parts.map((p) => (p.type === "text-delta" ? p.text : "")).join("");

describe("fact-card steps", () => {
  it("replaces the model's wording of a fact with the tool's lead-in", async () => {
    const parts = await run(
      step(
        ...text(
          "t",
          "Yes, he holds unrestricted ",
          "Australian working rights.\n\n[[sources: none]]",
        ),
        call("showFacts", { ids: ["work-rights"], leadIn: "Yes." }),
        result("showFacts", { facts: [] }),
      ),
    );
    expect(visibleText(parts)).toBe("Yes.\n\n[[sources: none]]");
    expect(visibleText(parts)).not.toContain("working rights");
    // The lead-in comes before the card.
    const types = parts.map((p) => p.type);
    expect(types.indexOf("text-delta")).toBeLessThan(types.indexOf("tool-result"));
  });

  it("drops a broken lead-in the card would have to finish", async () => {
    const parts = await run(
      step(...text("t", "He is based in"), call("showFacts", { ids: ["location"] })),
    );
    expect(visibleText(parts)).toBe("");
    expect(parts.some((p) => p.type === "text-start")).toBe(false);
  });

  it("keeps the step's sources, even from a marker without brackets", async () => {
    const parts = await run(
      step(
        ...text("t", "Adisha is based in Brisbane.\n\nSources: 1"),
        call("showFacts", { ids: ["location"], leadIn: "Yes." }),
      ),
    );
    expect(visibleText(parts)).toBe("Yes.\n\n[[sources: 1]]");
  });

  it("passes other steps through unchanged and in order", async () => {
    const parts = step(
      ...text("t", "Here's a button to download his CV.\n\n[[sources: none]]"),
      call("downloadCv", {}),
      result("downloadCv", { url: "/cv.pdf" }),
    );
    expect(await run(parts)).toEqual(parts);
  });

  it("stores the same text the visitor saw", () => {
    expect(factStepText("He is based in Brisbane.\n\n[[sources: 2]]", "No.")).toBe(
      "No.\n\n[[sources: 2]]",
    );
    expect(factStepText("He is based in Brisbane.", undefined)).toBe("");
  });
});
