"use client";

import { useEffect } from "react";
import { track, type SectionName } from "@/lib/analytics";
import { createSectionViews } from "@/lib/section-views";

/** Homepage sections by element id, with the stable name each is reported as. */
const SECTIONS: readonly { id: string; name: SectionName }[] = [
  { id: "top", name: "hero" },
  { id: "about", name: "about" },
  { id: "ai", name: "ai" },
  { id: "work", name: "work" },
  { id: "experience", name: "experience" },
  { id: "skills", name: "skills" },
  { id: "contact", name: "contact" },
];

// Module scope, so a rerender or remount of the tracker never reports a section twice.
const viewed = new Set<string>();

/** Sends section_view once per section per page visit. Renders nothing. */
export function SectionViewTracker() {
  useEffect(() => {
    const ids = new Map(SECTIONS.map((s) => [s.name as string, s.id]));
    const views = createSectionViews(
      SECTIONS.map((s) => s.name),
      viewed,
      {
        measure: (name) => {
          const el = document.getElementById(ids.get(name) ?? "");
          if (!el) return null;
          const { top, bottom } = el.getBoundingClientRect();
          return { top, bottom };
        },
        viewportHeight: () => window.innerHeight,
        isDocumentVisible: () => document.visibilityState === "visible",
        onView: (name) => track("section_view", { section_name: name as SectionName }),
        setTimer: (callback, ms) => window.setTimeout(callback, ms),
        clearTimer: (handle) => window.clearTimeout(handle as number),
      },
    );

    // Scroll and resize can fire many times a frame; check at most once per frame.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        views.evaluate();
      });
    };

    views.evaluate();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", views.evaluate);
    // Layout can move sections without a scroll (images loading, the project filter).
    const resizes = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
    resizes?.observe(document.body);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", views.evaluate);
      resizes?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      views.dispose();
    };
  }, []);

  return null;
}
