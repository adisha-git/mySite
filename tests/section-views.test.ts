import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSectionViews, DWELL_MS, qualifies, type Box } from "@/lib/section-views";

const VIEWPORT = 800;

/** A page with sections at fixed positions; `scroll` moves them all. */
function setup(
  layout: Record<string, { top: number; height: number }>,
  viewed = new Set<string>(),
) {
  let scrollY = 0;
  let visible = true;
  const views: string[] = [];
  const env = {
    measure: (name: string): Box | null => {
      const s = layout[name];
      return s ? { top: s.top - scrollY, bottom: s.top - scrollY + s.height } : null;
    },
    viewportHeight: () => VIEWPORT,
    isDocumentVisible: () => visible,
    onView: (name: string) => views.push(name),
    setTimer: (cb: () => void, ms: number) => setTimeout(cb, ms),
    clearTimer: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
  const tracker = createSectionViews(Object.keys(layout), viewed, env);
  return {
    tracker,
    views,
    viewed,
    scrollTo(y: number) {
      scrollY = y;
      tracker.evaluate();
    },
    setVisible(v: boolean) {
      visible = v;
      tracker.evaluate();
    },
  };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("qualifies", () => {
  it("needs half of a short section on screen", () => {
    expect(qualifies({ top: 600, bottom: 1000 }, VIEWPORT)).toBe(true); // 200 of 400 visible
    expect(qualifies({ top: 620, bottom: 1020 }, VIEWPORT)).toBe(false); // 180 of 400
  });

  it("needs half the viewport for a section taller than the screen", () => {
    // A 3,000px section can never be 50% visible on an 800px phone screen.
    expect(qualifies({ top: 400, bottom: 3400 }, VIEWPORT)).toBe(true); // 400 = 50% of 800
    expect(qualifies({ top: 401, bottom: 3401 }, VIEWPORT)).toBe(false);
    expect(qualifies({ top: -2000, bottom: 1000 }, VIEWPORT)).toBe(true); // fills the screen
  });

  it("ignores sections off screen or with no height", () => {
    expect(qualifies({ top: 900, bottom: 1300 }, VIEWPORT)).toBe(false);
    expect(qualifies({ top: -500, bottom: -100 }, VIEWPORT)).toBe(false);
    expect(qualifies({ top: 100, bottom: 100 }, VIEWPORT)).toBe(false);
  });
});

describe("section views", () => {
  const layout = {
    hero: { top: 0, height: 700 },
    about: { top: 700, height: 600 },
    work: { top: 1300, height: 3000 },
  };

  it("fires only after a full second of continuous visibility", () => {
    const page = setup(layout);
    page.scrollTo(0);
    vi.advanceTimersByTime(DWELL_MS - 1);
    expect(page.views).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(page.views).toEqual(["hero"]);
  });

  it("restarts the second when the section leaves the screen", () => {
    const page = setup(layout);
    page.scrollTo(1000); // about: 600 of 600 visible
    vi.advanceTimersByTime(900);
    page.scrollTo(2000); // about scrolled away
    vi.advanceTimersByTime(200);
    page.scrollTo(1000);
    vi.advanceTimersByTime(900);
    expect(page.views).not.toContain("about");
    vi.advanceTimersByTime(100);
    expect(page.views).toContain("about");
  });

  it("counts a section taller than the screen once half the viewport shows it", () => {
    const page = setup(layout);
    page.scrollTo(1300 - VIEWPORT / 2); // work fills the bottom half of the screen
    vi.advanceTimersByTime(DWELL_MS);
    expect(page.views).toContain("work");
  });

  it("doesn't count while the tab is hidden, and starts over when it's back", () => {
    const page = setup(layout);
    page.scrollTo(0);
    vi.advanceTimersByTime(500);
    page.setVisible(false);
    vi.advanceTimersByTime(5000);
    expect(page.views).toEqual([]);
    page.setVisible(true);
    vi.advanceTimersByTime(DWELL_MS - 1);
    expect(page.views).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(page.views).toEqual(["hero"]);
  });

  it("fires each section once per page visit, even across rerenders and remounts", () => {
    const viewed = new Set<string>();
    const first = setup(layout, viewed);
    first.scrollTo(0);
    vi.advanceTimersByTime(DWELL_MS);
    first.scrollTo(0); // scrolling and re-evaluating again
    vi.advanceTimersByTime(DWELL_MS * 3);
    first.tracker.dispose();

    // The component remounts with the same page-visit set.
    const second = setup(layout, viewed);
    second.scrollTo(0);
    vi.advanceTimersByTime(DWELL_MS * 3);
    expect([...first.views, ...second.views]).toEqual(["hero"]);
  });

  it("double-checks when the second is up, in case layout moved without a scroll", () => {
    let top = 0;
    const views: string[] = [];
    const tracker = createSectionViews(["hero"], new Set(), {
      measure: () => ({ top, bottom: top + 700 }),
      viewportHeight: () => VIEWPORT,
      isDocumentVisible: () => true,
      onView: (name) => views.push(name),
      setTimer: (cb, ms) => setTimeout(cb, ms),
      clearTimer: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
    });
    tracker.evaluate();
    top = -2000; // pushed off screen by a layout change, with no scroll event
    vi.advanceTimersByTime(DWELL_MS);
    expect(views).toEqual([]);
  });

  it("clears pending timers when disposed", () => {
    const page = setup(layout);
    page.scrollTo(0);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    page.tracker.dispose();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(DWELL_MS * 2);
    expect(page.views).toEqual([]);
  });
});
