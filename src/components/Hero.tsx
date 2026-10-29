import { ArrowDown, ArrowRight, Mail, MessageSquare, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { FaLinkedinIn } from "react-icons/fa6";
import { hasLinkedIn, profile } from "@/data/profile";
import { CodeCard } from "./CodeCard";
import { DownloadCvLink } from "./DownloadCvLink";
import { TechBackdrop } from "./TechBackdrop";
import { ButtonLink } from "./ui";

// The gradient goes on each word (via className), not a parent: background-clip: text
// doesn't paint through children that are animating their own transform/filter.
function Words({
  text,
  offset = 0,
  className = "",
}: {
  text: string;
  offset?: number;
  className?: string;
}) {
  return text.split(" ").map((word, i) => (
    <span
      key={`${word}-${i}`}
      className={`reveal-word ${className}`}
      style={{ "--i": i + offset } as CSSProperties}
    >
      {word}
      {" "}
    </span>
  ));
}

const badges = [
  { icon: "📍", text: `Based in ${profile.location.display}` },
  { icon: "✅", text: profile.workRights },
  { icon: "🟢", text: profile.availability },
];

export function Hero() {
  const [first, ...rest] = profile.name.split(" ");
  return (
    <section id="top" aria-labelledby="hero-heading" className="relative isolate overflow-hidden">
      <TechBackdrop />

      <div className="mx-auto grid max-w-[1200px] gap-x-10 gap-y-5 px-5 pt-28 pb-20 sm:px-8 sm:pt-36 sm:pb-28 lg:grid-cols-12">
        {/* Name spans the full width so it fits on one line. */}
        <div className="lg:col-span-12">
          <p className="text-accent-text mb-6 font-mono text-sm">
            <span className="text-muted">~/portfolio</span> ${" "}
            <span className="text-ink">whoami</span>
          </p>

          <h1 id="hero-heading">
            <span className="font-display block text-[clamp(1.75rem,8.4vw,5.75rem)] leading-[1.02] font-semibold tracking-[-0.04em] whitespace-nowrap">
              <Words text={first} />
              <Words text={rest.join(" ")} offset={1} className="text-gradient" />
            </span>
          </h1>
        </div>

        {/* Title, pitch and CTAs; the code card is vertically centred against this column. */}
        <div className="lg:col-span-7">
          <p className="text-muted font-mono text-base tracking-tight sm:text-lg">
            <span aria-hidden="true">
              <Words text={`<${profile.title.replace(/ /g, "")} />`} offset={2} />
            </span>
            <span className="sr-only">{profile.title}</span>
          </p>

          <div
            aria-hidden="true"
            className="draw-line from-accent to-accent-2 mt-7 h-0.5 w-40 bg-linear-to-r sm:w-64"
          />

          <p className="text-ink/90 mt-8 max-w-2xl text-lg leading-relaxed text-pretty sm:text-xl">
            {profile.oneLiner}
          </p>
          <p className="mt-4">
            <a
              href="#ai"
              className="group text-accent-text decoration-accent text-[15px] font-medium underline-offset-4 hover:underline"
            >
              <Sparkles aria-hidden="true" className="mr-2 inline size-4 align-[-2px]" />
              {profile.heroNow}
              <ArrowRight
                aria-hidden="true"
                className="ml-1.5 inline size-4 align-[-3px] transition-transform group-hover:translate-x-0.5"
              />
            </a>
          </p>

          <ul className="mt-7 flex flex-wrap gap-2" aria-label="Status">
            {badges.map(({ icon, text }) => (
              <li
                key={text}
                className="border-line bg-surface/70 text-ink inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs backdrop-blur-sm sm:text-[13px]"
              >
                <span aria-hidden="true">{icon}</span>
                {text}
              </li>
            ))}
          </ul>

          <p className="border-accent text-ink mt-6 border-l-2 pl-4 text-base">
            Looking for <strong className="font-semibold">{profile.jobSearch.summary}</strong> in{" "}
            {profile.location.city} — and open to relocating to{" "}
            <strong className="font-semibold">
              {profile.relocation.slice(0, -1).join(", ")} or {profile.relocation.at(-1)}
            </strong>
            .
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <ButtonLink href="#work">
              View my work
              <ArrowDown aria-hidden="true" className="size-4" />
            </ButtonLink>
            <DownloadCvLink placement="hero" variant="secondary" />
          </div>

          <div className="text-muted mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
            <a
              href="#contact"
              className="text-ink decoration-accent inline-flex items-center gap-2 py-2 font-medium underline underline-offset-[6px] hover:decoration-2"
            >
              <MessageSquare aria-hidden="true" className="size-4" />
              Contact me
            </a>
            <a
              href={`mailto:${profile.email}`}
              className="hover:text-ink inline-flex items-center gap-2 py-2 transition-colors"
            >
              <Mail aria-hidden="true" className="size-4" />
              Email
            </a>
            {hasLinkedIn ? (
              <a
                href={profile.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-ink inline-flex items-center gap-2 py-2 transition-colors"
              >
                <FaLinkedinIn aria-hidden="true" className="size-4" />
                LinkedIn<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-8 lg:col-span-5 lg:mt-0 lg:self-center">
          <CodeCard />
        </div>
      </div>
    </section>
  );
}
