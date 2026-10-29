import type { ChatPlacement } from "@/lib/analytics";

export const OPEN_CHAT_EVENT = "chat:open";

export interface OpenChatDetail {
  /** Which button opened the chat, reported with chat_open. */
  placement: ChatPlacement;
  /** Sent as the visitor's first message once the panel is ready. */
  message?: string;
}

/** Opens the chat panel from anywhere on the page, optionally sending a message. */
export function openChat(detail: OpenChatDetail) {
  window.dispatchEvent(new CustomEvent<OpenChatDetail>(OPEN_CHAT_EVENT, { detail }));
}
