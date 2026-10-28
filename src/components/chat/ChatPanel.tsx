"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ArrowUp, RotateCcw, Square, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { chatConfig, type ChatStarter } from "@/lib/chat/config";
import { MAX_JD_CHARS, MAX_MESSAGE_CHARS, MAX_MESSAGES } from "@/lib/chat/limits";
import type { ChatUIMessage } from "@/lib/chat/tools";
import { MessageList } from "./MessageList";
import { isSmallScreen, scrollToSection } from "./navigate";
import { StarterChips } from "./StarterChips";
import { useTurnstile } from "./useTurnstile";

const DEFAULT_PLACEHOLDER = `Ask about ${chatConfig.persona.subjectName.split(" ")[0]}…`;
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The server sends the conversation id and a signed token with each answer;
 * later requests send both back instead of a new bot check.
 */
function conversationOf(messages: ChatUIMessage[]) {
  const metadata = messages.findLast((m) => m.metadata?.conversationToken)?.metadata;
  return metadata
    ? { conversationId: metadata.conversationId, conversationToken: metadata.conversationToken }
    : {};
}

/** Route errors arrive as the JSON body ({ error }); everything else gets a generic line. */
function errorText(error: Error) {
  try {
    const body = JSON.parse(error.message) as { error?: unknown };
    if (typeof body.error === "string") return body.error;
  } catch {
    // Not a JSON error body.
  }
  return "Something went wrong. Please try again.";
}

export function ChatPanel({
  open,
  onClose,
  pendingMessage,
  onPendingSent,
}: {
  open: boolean;
  onClose: () => void;
  pendingMessage: string | null;
  onPendingSent: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const handledTools = useRef(new Set<string>());
  const [input, setInput] = useState("");
  const [placeholder, setPlaceholder] = useState(DEFAULT_PLACEHOLDER);
  // A pasted job description may be longer than a normal message.
  const [jdMode, setJdMode] = useState(false);
  const lastMode = useRef<"chat" | "jd">("chat");
  const sentBotCheck = useRef(false);

  const turnstile = useTurnstile(turnstileRef, open);
  const { take: takeToken, reset: resetBotCheck } = turnstile;

  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, body }) => ({
          body: { ...body, ...conversationOf(messages), messages },
        }),
      }),
    [],
  );
  const { messages, sendMessage, status, stop, error, regenerate } = useChat<ChatUIMessage>({
    transport,
    // Tokens are single-use: if the request that used one failed, fetch a new one for the retry.
    onError: () => {
      if (sentBotCheck.current) resetBotCheck();
    },
  });

  const busy = status === "submitted" || status === "streaming";
  const atLimit = messages.length + 1 > MAX_MESSAGES;
  const needsBotCheck = !conversationOf(messages).conversationId;
  const botCheckReady = !needsBotCheck || turnstile.state === "ready";

  /** Per-request fields: the mode, plus a bot-check token for a conversation's first message. */
  const requestOptions = useCallback(
    (mode: "chat" | "jd") => {
      const turnstileToken = needsBotCheck ? (takeToken() ?? undefined) : undefined;
      sentBotCheck.current = Boolean(turnstileToken);
      lastMode.current = mode;
      return { body: { mode, turnstileToken } };
    },
    [needsBotCheck, takeToken],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || atLimit || !botCheckReady) return;
      void sendMessage({ text: trimmed }, requestOptions(jdMode ? "jd" : "chat"));
      setInput("");
      setPlaceholder(DEFAULT_PLACEHOLDER);
      setJdMode(false);
      // A starter chip disappears once clicked; keep focus inside the dialog.
      inputRef.current?.focus();
    },
    [busy, atLimit, botCheckReady, jdMode, sendMessage, requestOptions],
  );

  // On a phone the panel covers the page, so close it before scrolling there.
  const goToSection = useCallback(
    (id: string) => {
      if (isSmallScreen()) onClose();
      scrollToSection(id);
    },
    [onClose],
  );

  // A message from elsewhere on the page (e.g. "Request a demo").
  useEffect(() => {
    if (!pendingMessage || busy || !botCheckReady) return;
    if (!atLimit) void sendMessage({ text: pendingMessage }, requestOptions("chat"));
    onPendingSent();
  }, [pendingMessage, busy, botCheckReady, atLimit, sendMessage, requestOptions, onPendingSent]);

  // Run scrollToSection once, when its result arrives.
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (part.type !== "tool-scrollToSection" || part.state !== "output-available") continue;
        if (handledTools.current.has(part.toolCallId)) continue;
        handledTools.current.add(part.toolCallId);
        goToSection(part.output.section);
      }
    }
  }, [messages, goToSection]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  // Full-screen on phones: stop the page behind from scrolling.
  useEffect(() => {
    if (!open || !isSmallScreen()) return;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previous;
    };
  }, [open]);

  // Listen on the document, so Esc and the focus trap still work if focus
  // lands outside the panel (e.g. after the element it was on disappears).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  function onStarter(starter: ChatStarter) {
    if (starter.message) {
      send(starter.message);
      return;
    }
    setPlaceholder(starter.placeholder ?? DEFAULT_PLACEHOLDER);
    setJdMode(starter.mode === "jd");
    inputRef.current?.focus();
  }

  const maxChars = jdMode ? MAX_JD_CHARS : MAX_MESSAGE_CHARS;
  const remaining = maxChars - input.length;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-title"
      className={`${open ? "flex" : "hidden"} bg-paper border-line fixed inset-0 z-[70] flex-col sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(640px,calc(100dvh-3rem))] sm:w-[400px] sm:rounded-xl sm:border sm:shadow-2xl sm:shadow-black/40`}
    >
      <header className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 id="chat-title" className="text-accent-text truncate font-mono text-sm">
            {chatConfig.theme.launcherLabel}
          </h2>
          <p className="text-muted text-xs">{chatConfig.persona.assistantName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="text-muted hover:text-ink hover:bg-surface rounded-md p-2 transition-colors"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </header>

      {/* Announce each answer once, not every streamed word. */}
      <p className="sr-only" role="status">
        {busy ? "Answering…" : status === "ready" && messages.length ? "Answer ready." : ""}
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <p className="text-muted text-sm">
              Ask about {chatConfig.persona.subjectName.split(" ")[0]}&apos;s experience, projects
              or availability. Answers come only from what he&apos;s written about his work.
            </p>
            <StarterChips onSelect={onStarter} />
          </div>
        ) : (
          <MessageList
            messages={messages}
            thinking={status === "submitted"}
            onSection={goToSection}
          />
        )}
        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm"
          >
            <p>{errorText(error)}</p>
            <button
              type="button"
              onClick={() => void regenerate(requestOptions(lastMode.current))}
              disabled={!botCheckReady}
              className="text-accent-text mt-2 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Retry
            </button>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-line border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Cloudflare shows the bot check here only if it needs the visitor to interact. */}
        <div ref={turnstileRef} className="empty:hidden [&:has(iframe)]:mb-2" />
        {needsBotCheck && turnstile.state === "error" ? (
          <p role="alert" className="mb-2 text-xs text-red-400">
            The bot check couldn&apos;t load. Please refresh the page, or use the contact form.
          </p>
        ) : null}
        {atLimit ? (
          <p className="text-muted text-sm">
            This chat has reached its limit.{" "}
            <button
              type="button"
              onClick={() => goToSection(chatConfig.site.contactSectionId)}
              className="text-accent-text underline underline-offset-4"
            >
              Use the contact form
            </button>{" "}
            to reach {chatConfig.persona.subjectName.split(" ")[0]} directly.
          </p>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <label htmlFor="chat-input" className="sr-only">
              Your question
            </label>
            <textarea
              id="chat-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Enter sends; Shift+Enter adds a new line.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={placeholder}
              maxLength={maxChars}
              rows={jdMode ? 6 : 1}
              aria-describedby={remaining < 200 ? "chat-remaining" : undefined}
              className="bg-surface border-line text-ink placeholder:text-muted focus:border-accent max-h-40 min-h-11 flex-1 resize-none rounded-lg border px-3 py-2.5 text-base outline-none sm:text-sm"
            />
            {busy ? (
              <button
                type="button"
                onClick={() => void stop()}
                aria-label="Stop generating"
                className="border-line text-ink hover:border-accent flex size-11 shrink-0 items-center justify-center rounded-lg border transition-colors"
              >
                <Square aria-hidden="true" className="size-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                aria-label="Send"
                disabled={!input.trim() || !botCheckReady}
                className="bg-accent text-on-accent flex size-11 shrink-0 items-center justify-center rounded-lg transition-opacity disabled:opacity-40"
              >
                <ArrowUp aria-hidden="true" className="size-5" />
              </button>
            )}
          </form>
        )}
        {remaining < 200 && !atLimit ? (
          <p id="chat-remaining" className="text-muted mt-1 text-xs">
            {remaining} characters left
          </p>
        ) : null}
        <p className="text-muted mt-2 text-[11px] leading-snug">{chatConfig.privacyNote}</p>
      </div>
    </div>
  );
}
