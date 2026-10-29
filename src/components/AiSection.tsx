import { Bot, Check, CloudCog, FileSearch, Workflow, type LucideIcon } from "lucide-react";
import { profile, type AiCapability } from "@/data/profile";
import { ChatNote } from "./ChatNote";
import { Reveal } from "./Reveal";
import { Section, Tag } from "./ui";

const icons: Record<AiCapability["icon"], LucideIcon> = {
  assist: Bot,
  rag: FileSearch,
  agents: Workflow,
  cloud: CloudCog,
};

export function AiSection() {
  const { ai } = profile;
  return (
    <Section
      id="ai"
      index="02"
      eyebrow="AI & agentic development"
      title={ai.heading}
      intro={ai.intro}
    >
      <ul className="grid gap-5 md:grid-cols-2">
        {ai.capabilities.map((cap, i) => {
          const Icon = icons[cap.icon];
          return (
            <Reveal
              as="li"
              key={cap.title}
              delay={(i % 2) * 0.08}
              className="border-line bg-surface flex flex-col rounded-2xl border p-6 sm:p-8"
            >
              <span className="border-accent text-accent-text flex size-11 items-center justify-center rounded-full border">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="font-display mt-5 text-2xl leading-tight font-semibold tracking-tight">
                {cap.title}
              </h3>
              <p className="text-muted mt-3 leading-relaxed">{cap.description}</p>
              <ul className="mt-auto flex flex-wrap gap-1.5 pt-5" aria-label="Tools">
                {cap.tools.map((tool) => (
                  <li key={tool}>
                    <Tag>{tool}</Tag>
                  </li>
                ))}
              </ul>
            </Reveal>
          );
        })}
      </ul>

      <Reveal className="mt-16">
        <h3 className="label text-muted mb-6">How a RAG feature comes together</h3>
        <ol className="relative grid gap-6 md:grid-cols-5 md:gap-4">
          {/* Connector: vertical on mobile, horizontal on desktop */}
          <span
            aria-hidden="true"
            className="bg-line absolute top-2 bottom-2 left-[15px] w-px md:top-[15px] md:right-[10%] md:bottom-auto md:left-[10%] md:h-px md:w-auto"
          />
          {ai.ragSteps.map((step, i) => (
            <li
              key={step.title}
              className="relative flex gap-4 md:flex-col md:items-center md:gap-3 md:text-center"
            >
              <span className="border-accent bg-paper text-accent-text relative flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-xs">
                {i + 1}
              </span>
              <div>
                <p className="font-display text-lg leading-tight font-semibold">{step.title}</p>
                <p className="text-muted mt-1 text-sm leading-snug">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Reveal>

      <Reveal className="mt-10">
        <ChatNote />
      </Reveal>

      <Reveal className="border-line mt-16 grid gap-4 border-t pt-8 md:grid-cols-3 md:gap-8">
        {ai.principles.map((p) => (
          <p key={p} className="text-ink/85 flex gap-3 leading-relaxed">
            <Check aria-hidden="true" className="text-accent-text mt-1 size-4 shrink-0" />
            {p}
          </p>
        ))}
      </Reveal>
    </Section>
  );
}
