import type { StreamTextTransform, TextStreamPart, ToolSet } from "ai";
import { parseCitations } from "./citations";

/**
 * Fact cards are the only place a fixed fact appears. Telling the model not to
 * write a fact before the card isn't enough on its own, so the text of a step
 * that shows a card never reaches the visitor: each step is held back until it
 * ends, and if it called showFacts, its text is replaced by the lead-in the
 * tool call chose ("Yes.", "No." or nothing), followed by the step's sources
 * marker. Steps without a card are passed through unchanged.
 */

export const FACT_LEAD_INS = ["Yes.", "No."] as const;
export type FactLeadIn = (typeof FACT_LEAD_INS)[number];

/** The marker for the sources a held-back text cited, so the source chips still work. */
function markerFor(text: string): string {
  const ids = parseCitations(text);
  if (ids === null) return "";
  return `[[sources: ${ids.length ? ids.join(", ") : "none"}]]`;
}

/** What the visitor sees of a fact-card step's text: the lead-in, then the sources marker. */
export function factStepText(modelText: string, leadIn: string | undefined): string {
  return [leadIn ?? "", markerFor(modelText)].filter(Boolean).join("\n\n");
}

export function factStepTransform<TOOLS extends ToolSet>(): StreamTextTransform<TOOLS> {
  return () => {
    let held: TextStreamPart<TOOLS>[] | null = null;

    const release = (controller: TransformStreamDefaultController<TextStreamPart<TOOLS>>) => {
      if (!held) return;
      const parts = held;
      held = null;

      const call = parts.find((p) => p.type === "tool-call" && p.toolName === "showFacts");
      if (!call || call.type !== "tool-call") {
        for (const part of parts) controller.enqueue(part);
        return;
      }

      const modelText = parts.map((p) => (p.type === "text-delta" ? p.text : "")).join("");
      const text = factStepText(modelText, (call.input as { leadIn?: string }).leadIn);
      if (text) {
        const id = parts.find((p) => p.type === "text-start")?.id ?? `${call.toolCallId}-lead-in`;
        controller.enqueue({ type: "text-start", id });
        controller.enqueue({ type: "text-delta", id, text });
        controller.enqueue({ type: "text-end", id });
      }
      for (const part of parts) {
        if (part.type !== "text-start" && part.type !== "text-delta" && part.type !== "text-end") {
          controller.enqueue(part);
        }
      }
    };

    return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
      transform(part, controller) {
        if (part.type === "start-step") {
          controller.enqueue(part);
          held = [];
          return;
        }
        if (part.type === "finish-step") {
          release(controller);
          controller.enqueue(part);
          return;
        }
        // Errors and aborts go straight through, so the visitor isn't left waiting.
        if (held && part.type !== "error" && part.type !== "abort") {
          held.push(part);
          return;
        }
        controller.enqueue(part);
      },
      flush(controller) {
        release(controller);
      },
    });
  };
}
