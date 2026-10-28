import { tool, type InferUITools, type UIMessage } from "ai";
import { z } from "zod";
import type { ChatConfig } from "./config";
import type { ChatMessageMetadata } from "./db/schema";

/**
 * Site actions the model can trigger. Each tool validates its input against
 * the config and returns what the widget needs; the widget then acts on the
 * visitor's page (scrolls, or shows a CV / project link to click). Running
 * `execute` on the server lets the model write its reply in the same request,
 * with no second round trip from the browser.
 *
 * captureLead is a server tool that arrives on Day 4.
 */
export function buildChatTools(config: ChatConfig) {
  const { site, enabledTools } = config;
  const sectionIds = site.sections.map((s) => s.id) as [string, ...string[]];
  const projectSlugs = site.projects.map((p) => p.slug) as [string, ...string[]];

  const all = {
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

/** The message shape shared by the API route and the widget. */
export type ChatUIMessage = UIMessage<
  ChatMessageMetadata,
  never,
  InferUITools<Required<ChatTools>>
>;
