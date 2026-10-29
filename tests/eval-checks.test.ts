import { describe, expect, it } from "vitest";
import { facts } from "@/lib/chat/facts";
import {
  checkAnswer,
  questionSchema,
  repeats,
  unsupportedAbsolutes,
  type CardFact,
} from "../evals/checks";

const card = (id: string): CardFact => {
  const f = facts.find((x) => x.id === id)!;
  return { id: f.id, label: f.label, text: f.text };
};
const question = (fields: Record<string, unknown>) =>
  questionSchema.parse({ id: "q", category: "facts", question: "?", ...fields });

describe("eval checks for fixed facts", () => {
  const relocation = question({
    facts: ["relocation"],
    must: ["Adisha is open to relocating to Melbourne, Sydney or Adelaide."],
  });

  it("passes a short lead-in followed by the fact card", () => {
    expect(
      checkAnswer(relocation, {
        text: "Yes.\n\n[[sources: none]]",
        tools: ["showFacts"],
        facts: [card("relocation")],
      }),
    ).toEqual([]);
  });

  it("fails a paraphrased fact written by the model instead of a card", () => {
    const failures = checkAnswer(relocation, {
      text: "Yes. Adisha is open to relocating to Sydney, as well as Melbourne and Adelaide.\n\n[[sources: 1]]",
      tools: [],
      facts: [],
    });
    expect(failures).toContain('fact "relocation" not shown as a card');
    expect(failures).toContain('text writes out fact "relocation"');
    expect(failures).toContain(
      'missing "Adisha is open to relocating to Melbourne, Sydney or Adelaide."',
    );
  });

  it("fails a paraphrase even when it reuses most of the fact's words", () => {
    const contract = question({ facts: ["role-types"] });
    const failures = checkAnswer(contract, {
      text: "Yes. Adisha is open to both permanent and contract roles, in any industry.",
      tools: [],
      facts: [],
    });
    expect(failures).toContain('fact "role-types" not shown as a card');
    expect(failures).toContain('text writes out fact "role-types"');
  });

  it("fails a lead-in that the card would have to finish", () => {
    const experience = question({ facts: ["experience"] });
    const failures = checkAnswer(experience, {
      text: "Yes, he has",
      tools: ["showFacts"],
      facts: [card("experience")],
    });
    expect(failures).toContain('text alongside the fact card isn\'t a lead-in: "Yes, he has"');
  });

  it("fails any text beside a fact card other than the lead-in", () => {
    const failures = checkAnswer(relocation, {
      text: "Yes, he would consider it.\n\n[[sources: none]]",
      tools: ["showFacts"],
      facts: [card("relocation")],
    });
    expect(failures).toContain(
      'text alongside the fact card isn\'t a lead-in: "Yes, he would consider it."',
    );
  });

  it("allows one employer's dates but fails writing out the employer list", () => {
    const q = question({ category: "experience" });
    expect(
      checkAnswer(q, {
        text: "He worked at DBS Bank, Singapore (October 2019 – March 2020) on the digital banking platform.",
        tools: [],
        facts: [],
      }),
    ).toEqual([]);
    expect(
      checkAnswer(q, {
        text: "No. His employers are MindLogics Limited, Oversea-Chinese Banking Corporation (OCBC), Singapore Airlines through ITCAN Pte Ltd, DBS Bank and others.",
        tools: ["showFacts"],
        facts: [card("employers")],
      }),
    ).toContain('text writes out fact "employers"');
  });

  it("fails text that repeats the fact shown in the card", () => {
    const remote = question({ facts: ["work-arrangement"] });
    const failures = checkAnswer(remote, {
      text: "Yes, he is open to remote, hybrid and fully on-site work.",
      tools: ["showFacts"],
      facts: [card("work-arrangement")],
    });
    expect(failures).toContain('text writes out fact "work-arrangement"');
  });

  it("fails a card whose text differs from facts.ts", () => {
    const failures = checkAnswer(relocation, {
      text: "Yes.",
      tools: ["showFacts"],
      facts: [{ ...card("relocation"), text: "Adisha is open to relocating anywhere." }],
    });
    expect(failures).toContain('fact card "relocation" doesn\'t match facts.ts');
  });

  it("finds repeated sentences and stuttered phrases", () => {
    expect(repeats("Adisha has Adisha has 10+ years.")).toContain("Adisha has");
    expect(
      repeats("He is based in Brisbane, Queensland. He is based in Brisbane, Queensland."),
    ).toHaveLength(1);
  });
});

describe("eval checks for overstatement", () => {
  it("fails an absolute word the sources don't use", () => {
    const reference =
      "If the page rendered first, the label didn't update when the status came back.";
    expect(unsupportedAbsolutes("The label never updated.", reference)).toEqual(["never"]);
    expect(unsupportedAbsolutes("The label didn't update.", reference)).toEqual([]);
    expect(unsupportedAbsolutes("He never misses a review.", "He never skips reviews.")).toEqual(
      [],
    );
  });

  it("reports it as a failure when checking an answer against its sources", () => {
    const q = question({ category: "behavioural" });
    expect(
      checkAnswer(
        q,
        { text: "He mainly works in React.\n\n[[sources: 1]]", tools: [], facts: [] },
        { reference: "He works in React and Angular." },
      ),
    ).toContain('says "mainly", which its sources don\'t');
  });
});

describe("eval checks for qualifiers", () => {
  const q = question({
    category: "projects",
    keep: [{ when: "80%", must: "relevant component" }],
  });

  it("fails a detail that drops the source's qualifier", () => {
    expect(
      checkAnswer(q, { text: "Coverage gates: 80% at Singapore Airlines.", tools: [], facts: [] }),
    ).toContain('mentions "80%" without its qualifier "relevant component"');
  });

  it("passes the detail with its qualifier, or an answer that doesn't mention it", () => {
    const scoped = "Coverage gates: 80% for the relevant component at Singapore Airlines.";
    expect(checkAnswer(q, { text: scoped, tools: [], facts: [] })).toEqual([]);
    expect(checkAnswer(q, { text: "He uses Jest.", tools: [], facts: [] })).toEqual([]);
  });

  it("fails a ranking of his stories the sources don't make", () => {
    expect(unsupportedAbsolutes("His clearest example is at ISE.", "At ISE, he chose…")).toEqual([
      "clearest",
    ]);
  });
});

describe("eval checks for site actions", () => {
  it("fails an action nobody asked for", () => {
    const q = question({ category: "projects", notTools: ["openProject"] });
    expect(
      checkAnswer(q, {
        text: "HeyKitty is a WordPress storefront.",
        tools: ["openProject"],
        facts: [],
      }),
    ).toContain("unrequested tool openProject called");
  });
});
