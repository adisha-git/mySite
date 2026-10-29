import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildEvent, track, trackChatStart } from "@/lib/analytics";

type TestWindow = { dataLayer?: unknown };
let win: TestWindow;

beforeEach(() => {
  win = {};
  vi.stubGlobal("window", win);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("event allowlist", () => {
  it("builds each event with only its allowlisted parameters", () => {
    expect(buildEvent("section_view", { section_name: "work" })).toEqual({
      event: "section_view",
      section_name: "work",
    });
    expect(buildEvent("project_click", { project_name: "tgs", link_type: "visit_site" })).toEqual({
      event: "project_click",
      project_name: "tgs",
      link_type: "visit_site",
    });
    expect(buildEvent("chat_start", {})).toEqual({ event: "chat_start" });
  });

  it("rejects unknown events, extra parameters and values off the list", () => {
    const loose = buildEvent as (event: string, params: Record<string, unknown>) => unknown;
    expect(loose("page_view", {})).toBeNull();
    expect(
      loose("generate_lead", { form_name: "contact_form", email: "sam@example.com" }),
    ).toBeNull();
    expect(loose("generate_lead", { form_name: "sam@example.com" })).toBeNull();
    expect(loose("cv_download_click", {})).toBeNull();
    expect(loose("chat_start", { conversation_id: "6f1c1b7e" })).toBeNull();
  });
});

describe("track", () => {
  it("pushes to the existing dataLayer and creates one if GTM hasn't yet", () => {
    track("cv_download_click", { placement: "hero" });
    expect(win.dataLayer).toEqual([{ event: "cv_download_click", placement: "hero" }]);

    const existing = [{ "gtm.start": 1 }];
    win.dataLayer = existing;
    track("chat_open", { placement: "floating_launcher" });
    expect(existing).toEqual([
      { "gtm.start": 1 },
      { event: "chat_open", placement: "floating_launcher" },
    ]);
  });

  it("drops events off the allowlist without pushing anything", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    (track as (event: string, params: Record<string, unknown>) => void)("generate_lead", {
      form_name: "contact_form",
      message: "Hi, I'm hiring",
    });
    expect(win.dataLayer).toBeUndefined();
  });

  it("never throws when the dataLayer is broken, so the click still works", () => {
    win.dataLayer = {
      push: () => {
        throw new Error("blocked");
      },
    };
    expect(() => track("generate_lead", { form_name: "contact_form" })).not.toThrow();
    win.dataLayer = Object.freeze([]);
    expect(() => track("generate_lead", { form_name: "contact_form" })).not.toThrow();
  });

  it("does nothing on the server", () => {
    vi.unstubAllGlobals();
    expect(() => track("chat_start", {})).not.toThrow();
  });
});

describe("chat_start", () => {
  it("fires once per accepted conversation and never sends its id", () => {
    const started = new Set<string>();
    trackChatStart(undefined, started); // the first send failed: no conversation yet
    trackChatStart("conv-1", started);
    trackChatStart("conv-1", started); // a rerender, remount or later message
    trackChatStart("conv-2", started); // a new conversation after a refresh
    expect(win.dataLayer).toEqual([{ event: "chat_start" }, { event: "chat_start" }]);
    expect(JSON.stringify(win.dataLayer)).not.toContain("conv-");
  });
});
