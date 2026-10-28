import { describe, expect, it } from "vitest";
import { buildLeadEmail, fallbackSummary, findJobDescription } from "@/lib/chat/lead-email";

const lead = {
  name: "Sam <b>Lee</b>",
  email: "sam@example.com",
  company: "",
  topic: "Chatbot demo" as const,
  note: "Wants a demo.",
};

describe("lead email", () => {
  it("escapes visitor input in the HTML body", () => {
    const { html, subject } = buildLeadEmail(lead, {
      summary: ["Wants a chatbot demo."],
      jobDescription: null,
      receivedAt: new Date("2026-10-28T00:00:00Z"),
    });
    expect(html).toContain("Sam &lt;b&gt;Lee&lt;/b&gt;");
    expect(html).not.toContain("<b>Lee</b>");
    expect(subject).toBe("[Chat lead · Chatbot demo] Sam <b>Lee</b>");
  });

  it("only treats a user message longer than a normal one as a job description", () => {
    expect(findJobDescription([{ role: "user", content: "short question" }])).toBeNull();
    const jd = "x".repeat(2500);
    expect(
      findJobDescription([
        { role: "user", content: jd },
        { role: "assistant", content: "y".repeat(3000) },
      ]),
    ).toBe(jd);
  });

  it("falls back to the visitor's last questions without the model", () => {
    expect(
      fallbackSummary([
        { role: "user", content: "One?" },
        { role: "assistant", content: "Answer." },
        { role: "user", content: "Two?" },
      ]),
    ).toEqual(["Asked: One?", "Asked: Two?"]);
  });
});
