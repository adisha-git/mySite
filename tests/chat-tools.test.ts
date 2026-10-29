import { describe, expect, it } from "vitest";
import { toChips } from "@/components/chat/SourceChips";
import { chatConfig, type ChatConfig } from "@/lib/chat/config";
import { facts } from "@/lib/chat/facts";
import { activeToolsFor, buildChatTools } from "@/lib/chat/tools";

const run = (t: { execute?: unknown } | undefined, input: unknown) =>
  (t!.execute as (i: unknown, o: unknown) => Promise<unknown>)(input, {
    toolCallId: "t1",
    messages: [],
  });

describe("buildChatTools", () => {
  const tools = buildChatTools(chatConfig);

  it("offers fact cards, lead capture and the three client actions", () => {
    expect(Object.keys(tools).sort()).toEqual([
      "captureLead",
      "downloadCv",
      "openProject",
      "scrollToSection",
      "showFacts",
    ]);
  });

  describe("showFacts", () => {
    const parse = (v: unknown) =>
      (
        tools.showFacts!.inputSchema as { safeParse: (v: unknown) => { success: boolean } }
      ).safeParse(v);

    it("returns each requested fact verbatim from facts.ts, once, in the order asked", async () => {
      const output = (await run(tools.showFacts, {
        ids: ["location", "work-rights", "location"],
      })) as {
        facts: { id: string; text: string }[];
      };
      expect(output.facts.map((f) => f.id)).toEqual(["location", "work-rights"]);
      for (const f of output.facts) expect(f.text).toBe(facts.find((x) => x.id === f.id)!.text);
    });

    it("only accepts fact ids on the allowlist", () => {
      expect(parse({ ids: ["education"] }).success).toBe(true);
      expect(parse({ ids: ["salary"] }).success).toBe(false);
      expect(parse({ ids: ["location", "__proto__"] }).success).toBe(false);
      expect(parse({ ids: [] }).success).toBe(false);
    });
  });

  it("captureLead only drafts the lead: nothing is saved or sent until the visitor confirms", async () => {
    const output = await run(tools.captureLead, {
      name: "Sam Lee",
      email: "sam@example.com",
      topic: "Recruiter / agency",
    });
    expect(output).toMatchObject({
      status: "awaiting-confirmation",
      lead: {
        name: "Sam Lee",
        email: "sam@example.com",
        company: "",
        topic: "Recruiter / agency",
        note: "",
      },
    });
  });

  it("captureLead only accepts the contact form's topics", () => {
    const parse = (
      tools.captureLead!.inputSchema as { safeParse: (v: unknown) => { success: boolean } }
    ).safeParse;
    expect(parse({ name: "Sam", email: "sam@example.com", topic: "Chatbot demo" }).success).toBe(
      true,
    );
    expect(parse({ name: "Sam", email: "sam@example.com", topic: "Sales pitch" }).success).toBe(
      false,
    );
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

describe("site actions only when asked", () => {
  const tools = buildChatTools(chatConfig);
  const offered = (message: string) => activeToolsFor(message, tools);

  it("doesn't offer to open a project when the visitor only asks about it", () => {
    for (const message of [
      "What is the Dhanesha site?",
      "Tell me about Sri Aero.",
      "What did he build at MindLogics?",
    ]) {
      expect(offered(message)).not.toContain("openProject");
      expect(offered(message)).not.toContain("downloadCv");
    }
  });

  it("offers the action the visitor asks for", () => {
    expect(offered("Can I see the Sri Aero site he built?")).toContain("openProject");
    expect(offered("Can I get a copy of his CV?")).toContain("downloadCv");
    expect(offered("Show me his experience on the page")).toContain("scrollToSection");
  });

  it("always offers fact cards and lead capture", () => {
    expect(offered("Where is he based?")).toEqual(
      expect.arrayContaining(["showFacts", "captureLead"]),
    );
  });
});
