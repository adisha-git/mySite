import { describe, expect, it } from "vitest";
import { citedSources, parseCitations, stripCitations } from "@/lib/chat/citations";

describe("parseCitations", () => {
  it("reads the cited source ids", () => {
    expect(parseCitations("He led RM Frontend.\n\n[[sources: 1, 3]]")).toEqual([1, 3]);
  });

  it("returns an empty list for [[sources: none]]", () => {
    expect(parseCitations("I don't know.\n[[sources: none]]")).toEqual([]);
  });

  it("returns null when there is no marker", () => {
    expect(parseCitations("He led RM Frontend.")).toBeNull();
  });

  it("merges markers from several steps, without duplicates", () => {
    expect(parseCitations("[[sources: 2]] Here's his CV. [[Sources: 2,4]]")).toEqual([2, 4]);
  });
});

describe("stripCitations", () => {
  it("removes a complete marker", () => {
    expect(stripCitations("He led RM Frontend.\n\n[[sources: 1, 3]]")).toBe("He led RM Frontend.");
  });

  it.each(["[", "[[", "[[sour", "[[sources: 1", "[[sources: 1]"])(
    "hides a marker still streaming in (%s)",
    (partial) => {
      expect(stripCitations(`He led RM Frontend.\n\n${partial}`)).toBe("He led RM Frontend.");
    },
  );

  it("leaves Markdown links alone", () => {
    expect(stripCitations("See [his CV](/cv.pdf) and [the site")).toBe(
      "See [his CV](/cv.pdf) and [the site",
    );
  });
});

describe("citedSources", () => {
  it("keeps the cited sources by 1-based id, in prompt order, ignoring unknown ids", () => {
    expect(citedSources(["a", "b", "c"], [3, 1, 9])).toEqual(["a", "c"]);
  });
});
