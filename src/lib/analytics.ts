/**
 * Custom interaction events, pushed to the dataLayer of the Google Tag
 * Manager container the root layout loads (GA4 is configured inside GTM).
 *
 * Every event name, parameter and parameter value is on the allowlist below,
 * so nothing personal (names, emails, message text, job descriptions,
 * conversation IDs) can ever be sent. Tracking never throws: if the dataLayer
 * is missing or broken, the visitor's click still works. Where GTM isn't
 * loaded (local development, previews), events only queue up in the page.
 */

export const SECTION_NAMES = [
  "hero",
  "about",
  "ai",
  "work",
  "experience",
  "skills",
  "contact",
] as const;

/** Project slugs from the portfolio and the chat's project links. */
export const PROJECT_NAMES = [
  "ask-adisha",
  "chatbot",
  "tgs",
  "mindlogics",
  "sri-aero",
  "dhanesha",
] as const;

export const PROJECT_LINK_TYPES = [
  /** "Visit site" on a project card: opens the live site. */
  "visit_site",
  /** "Try the chat" on a project card. */
  "try_chat",
  /** "Request a demo" on a project card: opens the chat with a demo request. */
  "request_demo",
  /** A project link the chat showed in a reply. */
  "chat_project_link",
] as const;

export const CV_PLACEMENTS = [
  "nav",
  "nav_mobile_menu",
  "hero",
  "contact",
  "footer",
  "chat",
] as const;

export const CHAT_PLACEMENTS = [
  /** The floating "~/ask-adisha $" button. */
  "floating_launcher",
  /** "Ask the chat" in the AI section's "How this chat works" note. */
  "ai_section",
  /** "Try the chat" on the Ask about Adisha project card. */
  "project_try_chat",
  /** "Request a demo" on a project card. */
  "project_request_demo",
] as const;

export const FORM_NAMES = [
  "contact_form",
  /** The lead card the chat drafts when a visitor asks Adisha to get back to them. */
  "chat_lead",
  /** The lead card offered after a job-description fit check. */
  "chat_fit_check_lead",
] as const;

export type SectionName = (typeof SECTION_NAMES)[number];
export type ProjectName = (typeof PROJECT_NAMES)[number];
export type ProjectLinkType = (typeof PROJECT_LINK_TYPES)[number];
export type CvPlacement = (typeof CV_PLACEMENTS)[number];
export type ChatPlacement = (typeof CHAT_PLACEMENTS)[number];
export type FormName = (typeof FORM_NAMES)[number];

/** Each event's parameters and the values each one may take. */
const EVENTS = {
  section_view: { section_name: SECTION_NAMES },
  project_click: { project_name: PROJECT_NAMES, link_type: PROJECT_LINK_TYPES },
  cv_download_click: { placement: CV_PLACEMENTS },
  chat_open: { placement: CHAT_PLACEMENTS },
  chat_start: {},
  generate_lead: { form_name: FORM_NAMES },
} as const satisfies Record<string, Record<string, readonly string[]>>;

export type AnalyticsEvent = keyof typeof EVENTS;
export type EventParams<E extends AnalyticsEvent> = {
  -readonly [K in keyof (typeof EVENTS)[E]]: (typeof EVENTS)[E][K] extends readonly (infer V)[]
    ? V
    : never;
};

type DataLayerWindow = { dataLayer?: unknown[] };

/**
 * The payload for an event, or null if the event, a parameter or a value isn't
 * on the allowlist (types prevent that in this codebase; this guards at runtime).
 */
export function buildEvent<E extends AnalyticsEvent>(
  event: E,
  params: EventParams<E>,
): Record<string, string> | null {
  const allowed = EVENTS[event] as Record<string, readonly string[]> | undefined;
  if (!allowed) return null;
  const given = params as Record<string, unknown>;
  const keys = Object.keys(allowed);
  if (Object.keys(given).some((k) => !keys.includes(k))) return null;
  const payload: Record<string, string> = { event };
  for (const key of keys) {
    const value = given[key];
    if (typeof value !== "string" || !allowed[key].includes(value)) return null;
    payload[key] = value;
  }
  return payload;
}

/** Pushes an allowlisted event to the GTM dataLayer. Never throws. */
export function track<E extends AnalyticsEvent>(event: E, params: EventParams<E>): void {
  try {
    if (typeof window === "undefined") return;
    const payload = buildEvent(event, params);
    if (!payload) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`analytics: dropped "${event}", which isn't on the allowlist`);
      }
      return;
    }
    const w = window as unknown as DataLayerWindow;
    w.dataLayer = Array.isArray(w.dataLayer) ? w.dataLayer : [];
    w.dataLayer.push(payload);
  } catch {
    // Analytics must never break the page.
  }
}

/** Conversations already reported; the ids stay in memory and are never sent. */
const startedConversations = new Set<string>();

/**
 * chat_start, once per conversation. Call it with the conversation id the
 * server returns once it has accepted the first message, so failed sends and
 * retries never count, and remounts can't report a conversation twice.
 */
export function trackChatStart(
  conversationId: string | undefined,
  started: Set<string> = startedConversations,
): void {
  if (!conversationId || started.has(conversationId)) return;
  started.add(conversationId);
  track("chat_start", {});
}

/** Whether a string is one of the tracked project names (e.g. a slug from config). */
export function isProjectName(value: string): value is ProjectName {
  return (PROJECT_NAMES as readonly string[]).includes(value);
}
