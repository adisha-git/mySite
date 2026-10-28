import { describe, expect, it } from "vitest";
import { reciprocalRankFusion } from "@/lib/chat/retrieve";

describe("reciprocalRankFusion", () => {
  it("ranks an id found by both searches above one ranked first by only one", () => {
    const vector = ["a", "b", "c"];
    const text = ["d", "b", "e"];
    expect(reciprocalRankFusion([vector, text])[0]).toBe("b");
  });

  it("returns every id once, best first", () => {
    const fused = reciprocalRankFusion([
      ["a", "b"],
      ["b", "c"],
    ]);
    expect(fused).toEqual(["b", "a", "c"]);
  });

  it("handles an empty list", () => {
    expect(reciprocalRankFusion([["a"], []])).toEqual(["a"]);
  });
});
