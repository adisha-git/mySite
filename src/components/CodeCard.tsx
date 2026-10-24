import type { ReactNode } from "react";
import { profile } from "@/data/profile";

const kw = (t: string) => <span className="text-[var(--syn-kw)]">{t}</span>;
const type = (t: string) => <span className="text-[var(--syn-type)]">{t}</span>;
const str = (t: string) => <span className="text-[var(--syn-str)]">&quot;{t}&quot;</span>;
const num = (t: string) => <span className="text-[var(--syn-num)]">{t}</span>;
const punc = (t: string) => <span className="text-muted">{t}</span>;

function list(items: readonly string[]): ReactNode {
  return (
    <>
      {punc("[")}
      {items.map((item, i) => (
        <span key={item}>
          {str(item)}
          {i < items.length - 1 ? punc(", ") : null}
        </span>
      ))}
      {punc("]")}
    </>
  );
}

/** The profile as a TypeScript object, styled like an editor tab. Built from profile.ts. */
export function CodeCard() {
  const lines: ReactNode[] = [
    <span key="c" className="text-muted">
      {"// Hi! Here's the short version."}
    </span>,
    <>
      {kw("const")} engineer{punc(": ")}
      {type("Engineer")} {punc("= {")}
    </>,
    <>
      {"  "}name{punc(": ")}
      {str(profile.name)}
      {punc(",")}
    </>,
    <>
      {"  "}role{punc(": ")}
      {str(profile.title)}
      {punc(",")}
    </>,
    <>
      {"  "}experience{punc(": ")}
      {str(`${profile.experienceYears} years`)}
      {punc(",")}
    </>,
    <>
      {"  "}stack{punc(": ")}
      {list(profile.coreSkills)}
      {punc(",")}
    </>,
    <>
      {"  "}ai{punc(": ")}
      {list(profile.aiFocus)}
      {punc(",")}
    </>,
    <>
      {"  "}basedIn{punc(": ")}
      {str(profile.location.display)}
      {punc(",")}
    </>,
    <>
      {"  "}openTo{punc(": ")}
      {list(profile.relocation)}
      {punc(",")}
    </>,
    <>
      {"  "}lookingFor{punc(": ")}
      {str(profile.jobSearch.codeCard)}
      {punc(",")}
    </>,
    <>
      {"  "}openToWork{punc(": ")}
      {num("true")}
      {punc(",")}
    </>,
    <>
      {punc("};")}
      <span className="caret bg-accent ml-1 inline-block h-[1.1em] w-[7px] translate-y-[3px]" />
    </>,
  ];

  return (
    <figure className="border-line bg-surface/80 overflow-hidden rounded-xl border shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] backdrop-blur-sm">
      <figcaption className="sr-only">
        {`${profile.name}: ${profile.title}, ${profile.experienceYears} years. Core stack ${profile.coreSkills.join(", ")}. AI focus ${profile.aiFocus.join(", ")}. Based in ${profile.location.display}, open to ${profile.relocation.join(", ")}. Looking for ${profile.jobSearch.summary}.`}
      </figcaption>
      <div className="border-line flex items-center gap-2 border-b px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#FF5F57]" />
        <span className="size-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="size-2.5 rounded-full bg-[#28C840]" />
        <span className="border-line text-muted ml-3 rounded-md border px-2 py-0.5 font-mono text-[11px]">
          engineer.ts
        </span>
      </div>
      <pre
        aria-hidden="true"
        className="text-ink overflow-hidden p-4 font-mono text-[11.5px] leading-[1.75] whitespace-pre-wrap sm:p-5 sm:text-[13px]"
      >
        {lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[2ch_1fr] gap-4">
            <span className="text-muted text-right opacity-60 select-none">{i + 1}</span>
            <code className="pl-[2ch] [text-indent:-2ch]">{line}</code>
          </div>
        ))}
      </pre>
    </figure>
  );
}
