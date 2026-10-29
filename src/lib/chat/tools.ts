import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import type { ChatConfig } from "./config";
import type { ChatMessageMetadata } from "./db/schema";
import { FACT_LEAD_INS } from "./fact-step";
import { factIds, getFacts } from "./facts";
import type { FitResult } from "./fit";
import { captureLeadInputSchema } from "./lead";

/**
 * Site actions the model can trigger. Each tool validates its input against
 * the config and returns what the widget needs; the widget then acts on the
 * visitor's page (scrolls, or shows a CV / project link to click). Running
 * `execute` on the server lets the model write its reply in the same request,
 * with no second round trip from the browser.
 *
 * Every tool ends the answer (see the route's stopWhen), so the model writes
 * its one sentence before calling one and never repeats itself afterwards.
 *
 * captureLead has no side effects: it only drafts the lead. The widget shows
 * the draft as a card, and the lead is saved and emailed only when the
 * visitor clicks Confirm (see lead.ts and /api/chat/lead).
 */
export function buildChatTools(config: ChatConfig) {
  const { site, enabledTools } = config;
  const sectionIds = site.sections.map((s) => s.id) as [string, ...string[]];
  const projectSlugs = site.projects.map((p) => p.slug) as [string, ...string[]];

  const all = {
    showFacts: tool({
      description: `Show the visitor a card with fixed facts about ${config.persona.subjectName}, word for word. Use it whenever the answer needs one of these facts, instead of writing it: ${factIds.join(", ")}. Call it once, with every fact id the answer needs; the answer ends with the card. Any text you write alongside it is replaced by leadIn, so put a yes/no answer there.`,
      inputSchema: z.object({
        ids: z.array(z.enum(factIds)).min(1).max(4),
        leadIn: z
          .enum(FACT_LEAD_INS)
          .optional()
          .describe(
            '"Yes." or "No." when the question is a yes/no question; otherwise leave it out.',
          ),
      }),
      execute: async ({ ids }) => ({
        facts: getFacts(ids).map(({ id, label, text }) => ({ id, label, text })),
      }),
    }),
    captureLead: tool({
      description: `Show the visitor a card with their contact details so ${config.persona.subjectName} can get back to them. Call it only once the visitor has given at least their name and email, and only with details they actually gave. Nothing is saved or sent until the visitor checks the card and clicks Confirm.`,
      inputSchema: captureLeadInputSchema,
      execute: async (lead) => ({
        status: "awaiting-confirmation" as const,
        lead: {
          name: lead.name,
          email: lead.email,
          company: lead.company ?? "",
          topic: lead.topic,
          note: lead.note ?? "",
        },
      }),
    }),
    downloadCv: tool({
      description: `Show the visitor a button to download ${config.persona.subjectName}'s CV (resume). Use when they ask for his CV or resume. The visitor still has to click it.`,
      inputSchema: z.object({}),
      execute: async () => ({ url: site.cvUrl, fileName: site.cvFileName }),
    }),
    scrollToSection: tool({
      description: `Scroll the visitor's page to a section of the site. Use when they ask to see or go to one. Sections: ${site.sections
        .map((s) => `${s.id} (${s.label})`)
        .join(", ")}.`,
      inputSchema: z.object({ section: z.enum(sectionIds) }),
      execute: async ({ section }) => ({
        section,
        label: site.sections.find((s) => s.id === section)?.label ?? section,
      }),
    }),
    openProject: tool({
      description: `Show the visitor a button that opens one of ${config.persona.subjectName}'s live project sites in a new tab. Use when they want to see a project. The visitor still has to click it. Projects: ${site.projects
        .map((p) => `${p.slug} (${p.name})`)
        .join(", ")}.`,
      inputSchema: z.object({ project: z.enum(projectSlugs) }),
      execute: async ({ project }) => {
        const p = site.projects.find((x) => x.slug === project)!;
        return { name: p.name, url: p.url };
      },
    }),
  };

  return Object.fromEntries(
    Object.entries(all).filter(([name]) => (enabledTools as readonly string[]).includes(name)),
  ) as Partial<typeof all>;
}

export type ChatTools = ReturnType<typeof buildChatTools>;

/**
 * Site actions are only offered to the model when the visitor's message asks
 * for one, so describing a project never opens it and a CV question about his
 * skills never shows a download. Fact cards and lead capture are always offered.
 */
const ACTION_REQUESTS: Record<string, RegExp> = {
  downloadCv: /\b(cv|resume|résumé|download)\b/i,
  scrollToSection:
    /\b(show|scroll|go to|take me|jump|navigate|section|on (the|this) (page|site))\b/i,
  openProject: /\b(open|visit|see|view|show|link|url|take me|go to|check out|look at)\b/i,
};

export function activeToolsFor(message: string, tools: ChatTools): (keyof ChatTools)[] {
  return (Object.keys(tools) as (keyof ChatTools)[]).filter(
    (name) => !(name in ACTION_REQUESTS) || ACTION_REQUESTS[name].test(message),
  );
}

/** The message shape shared by the API routes and the widget. A fit check's card is a `data-fit` part. */
export type ChatUIMessage = UIMessage<
  ChatMessageMetadata,
  { fit: FitResult },
  InferUITools<Required<ChatTools>>
>;
