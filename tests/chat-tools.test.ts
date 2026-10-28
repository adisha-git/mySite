import { describe, expect, it } from "vitest";
import { toChips } from "@/components/chat/SourceChips";
import { chatConfig, type ChatConfig } from "@/lib/chat/config";
import { buildChatTools } from "@/lib/chat/tools";

const run = (t: { execute?: unknown } | undefined, input: unknown) =>
  (t!.execute as (i: unknown, o: unknown) => Promise<unknown>)(input, {
    toolCallId: "t1",
    messages: [],
  });

describe("buildChatTools", () => {
  const tools = buildChatTools(chatConfig);

  it("offers the three client actions and leaves captureLead for Day 4", () => {
    expect(Object.keys(tools).sort()).toEqual(["downloadCv", "openProject", "scrollToSection"]);
  });

  it("returns the CV link from config", async () => {
    expect(await run(tools.downloadCv, {})).toEqual({
      url: "/Adisha-Madhushanka-CV.pdf",
      fileName: "Adisha-Madhushanka-CV.pdf",
    });
  });

  it("resolves sections and projects from config", async () => {
    expect(await run(tools.scrollToSection, { section: "experience" })).toEqual({
      section: "experience",
      label: "Experience",
    });
    expect(await run(tools.openProject, { project: "sri-aero" })).toEqual({
      name: "Sri Aero",
      url: "https://www.sriaero.ca/",
    });
  });

  it("only accepts sections and projects the site has", () => {
    const section = (
      tools.scrollToSection!.inputSchema as { safeParse: (v: unknown) => { success: boolean } }
    ).safeParse;
    const project = (
      tools.openProject!.inputSchema as { safeParse: (v: unknown) => { success: boolean } }
    ).safeParse;
    expect(section({ section: "contact" }).success).toBe(true);
    expect(section({ section: "admin" }).success).toBe(false);
    expect(project({ project: "google" }).success).toBe(false);
  });

  it("respects enabledTools", () => {
    const config: ChatConfig = { ...chatConfig, enabledTools: ["downloadCv"] };
    expect(Object.keys(buildChatTools(config))).toEqual(["downloadCv"]);
  });
});

describe("source chips", () => {
  it("shows one chip per file, labelled with its title and linked to its section", () => {
    const chips = toChips([
      {
        path: "content/knowledge/roles/ocbc.md",
        heading: "OCBC Bank — Senior Software Engineer (AVP) > What I owned",
      },
      {
        path: "content/knowledge/roles/ocbc.md",
        heading: "OCBC Bank — Senior Software Engineer (AVP) > Team",
      },
      {
        path: "content/knowledge/facts.md",
        heading: "Adisha Madhushanka — Key facts > Work rights",
      },
      { path: "content/knowledge/unmapped.md", heading: "Something" },
    ]);
    expect(chips).toEqual([
      { path: "content/knowledge/roles/ocbc.md", label: "OCBC Bank", sectionId: "experience" },
      { path: "content/knowledge/facts.md", label: "Key facts", sectionId: "about" },
    ]);
  });
});
