import { ArrowUpRight, CornerDownRight, Download } from "lucide-react";
import { stripCitations } from "@/lib/chat/citations";
import type { ChatUIMessage } from "@/lib/chat/tools";
import { FactCard } from "./FactCard";
import { FitCard } from "./FitCard";
import { LeadCard } from "./LeadCard";
import { Markdown } from "./Markdown";
import { SourceChips } from "./SourceChips";

type Part = ChatUIMessage["parts"][number];

const actionClass =
  "border-accent/50 text-accent-text hover:bg-accent/10 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors";

function ToolPart({
  part,
  metadata,
  onSection,
}: {
  part: Part;
  metadata: ChatUIMessage["metadata"];
  onSection: (id: string) => void;
}) {
  switch (part.type) {
    case "data-fit":
      return (
        <FitCard
          fit={part.data}
          conversationId={metadata?.conversationId}
          conversationToken={metadata?.conversationToken}
        />
      );
    case "tool-showFacts":
      if (part.state !== "output-available") return null;
      return <FactCard facts={part.output.facts} />;
    case "tool-captureLead":
      if (part.state !== "output-available") return null;
      return (
        <LeadCard
          draft={part.output.lead}
          conversationId={metadata?.conversationId}
          conversationToken={metadata?.conversationToken}
        />
      );
    case "tool-downloadCv":
      if (part.state !== "output-available") return null;
      return (
        <a href={part.output.url} download={part.output.fileName} className={actionClass}>
          <Download aria-hidden="true" className="size-4" />
          Download CV (PDF)
        </a>
      );
    case "tool-openProject":
      if (part.state !== "output-available") return null;
      // A link the visitor clicks: browsers block tabs opened without a click.
      return (
        <a href={part.output.url} target="_blank" rel="noopener noreferrer" className={actionClass}>
          Open {part.output.name}
          <ArrowUpRight aria-hidden="true" className="size-4" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      );
    case "tool-scrollToSection":
      if (part.state !== "output-available") return null;
      return (
        <button
          type="button"
          onClick={() => onSection(part.output.section)}
          className="text-muted hover:text-ink inline-flex items-center gap-1 font-mono text-xs"
        >
          <CornerDownRight aria-hidden="true" className="size-3" />
          Showing {part.output.label}
          <span className="sr-only">. Show it again</span>
        </button>
      );
    default:
      return null;
  }
}

export function MessageList({
  messages,
  thinking,
  onSection,
}: {
  messages: ChatUIMessage[];
  /** What to show while waiting, e.g. "thinking…"; null when not waiting. */
  thinking: string | null;
  onSection: (id: string) => void;
}) {
  return (
    <ol className="space-y-5">
      {messages.map((message) =>
        message.role === "user" ? (
          // The visitor's messages get a tinted, right-aligned bubble to tell them apart from replies.
          <li
            key={message.id}
            className="border-accent/30 bg-accent/10 ml-auto flex w-fit max-w-[85%] gap-2 rounded-xl rounded-br-sm border px-3 py-2 font-mono text-sm"
          >
            <span aria-hidden="true" className="text-accent-text select-none">
              $
            </span>
            <span className="sr-only">You: </span>
            <p className="text-ink min-w-0 break-words whitespace-pre-wrap">
              {message.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
            </p>
          </li>
        ) : (
          <li key={message.id} className="text-ink/90 text-[15px] leading-relaxed">
            <span className="sr-only">Assistant: </span>
            <div className="space-y-3">
              {message.parts.map((part, i) => {
                if (part.type !== "text")
                  return (
                    <ToolPart
                      key={i}
                      part={part}
                      metadata={message.metadata}
                      onSection={onSection}
                    />
                  );
                // The trailing [[sources: …]] marker becomes the chips below, not text.
                const text = stripCitations(part.text);
                return text ? <Markdown key={i} text={text} /> : null;
              })}
            </div>
            {message.metadata?.sources ? (
              <SourceChips sources={message.metadata.sources} onSelect={onSection} />
            ) : null}
          </li>
        ),
      )}
      {thinking ? (
        <li className="text-muted font-mono text-sm" role="status">
          <span className="motion-safe:animate-pulse">{thinking}</span>
        </li>
      ) : null}
    </ol>
  );
}
