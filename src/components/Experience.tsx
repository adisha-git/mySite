"use client";

import { AnimatePresence, m, useScroll, useSpring } from "framer-motion";
import { ChevronDown, GraduationCap } from "lucide-react";
import { useId, useRef, useState } from "react";
import type { Experience as ExperienceEntry } from "@/data/profile";
import { Tag } from "./ui";

function Entry({ job }: { job: ExperienceEntry }) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  const details = (
    <>
      <ul className="text-ink/85 mt-4 space-y-2 text-[15px] leading-relaxed">
        {job.highlights.map((h) => (
          <li key={h} className="flex gap-3">
            <span aria-hidden="true" className="bg-accent mt-[0.7em] h-px w-3 shrink-0" />
            {h}
          </li>
        ))}
      </ul>
      <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Technologies">
        {job.tags.map((t) => (
          <li key={t}>
            <Tag>{t}</Tag>
          </li>
        ))}
      </ul>
    </>
  );

  return (
    <m.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid gap-2 pb-14 pl-10 last:pb-0 md:grid-cols-12 md:gap-8 md:pl-0"
    >
      {/* Node on the line */}
      <span
        aria-hidden="true"
        className="border-accent bg-paper absolute top-1.5 left-0 size-[15px] rounded-full border-2 md:left-[calc(25%-7.5px)]"
      />

      <div className="md:col-span-3 md:pr-10 md:text-right">
        <p className="label text-accent-text">
          {job.start} — {job.end}
        </p>
        <p className="text-muted mt-1 text-sm">{job.location}</p>
      </div>

      <div className="md:col-span-9 md:pl-6">
        <h3 className="font-display text-2xl leading-tight font-semibold tracking-tight">
          {job.role}
        </h3>
        <p className="text-ink mt-1 font-medium">{job.company}</p>
        <p className="text-muted mt-3 leading-relaxed">{job.summary}</p>

        {/* Desktop: always visible */}
        <div className="hidden md:block">{details}</div>

        {/* Mobile: collapsible */}
        <div className="md:hidden">
          <AnimatePresence initial={false}>
            {expanded ? (
              <m.div
                id={panelId}
                key="details"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                {details}
              </m.div>
            ) : null}
          </AnimatePresence>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={panelId}
            onClick={() => setExpanded((e) => !e)}
            className="text-ink decoration-accent mt-3 inline-flex items-center gap-1 py-1 text-sm font-medium underline underline-offset-[6px]"
          >
            {expanded ? "Show less" : "Show more"}
            <ChevronDown
              aria-hidden="true"
              className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            />
            <span className="sr-only">
              {" "}
              about {job.role} at {job.company}
            </span>
          </button>
        </div>
      </div>
    </m.li>
  );
}

interface ExperienceProps {
  jobs: readonly ExperienceEntry[];
  education: { degree: string; institution: string; years: string };
}

export function Experience({ jobs, education }: ExperienceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 75%", "end 60%"] });
  const scaleY = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  return (
    <>
      <div ref={ref} className="relative">
        {/* Track + line that draws as you scroll */}
        <div
          aria-hidden="true"
          className="bg-line absolute top-2 bottom-0 left-[7px] w-px md:left-1/4"
        />
        <m.div
          aria-hidden="true"
          style={{ scaleY }}
          className="bg-accent absolute top-2 bottom-0 left-[7px] w-px origin-top motion-reduce:![transform:none] md:left-1/4"
        />
        <ol>
          {jobs.map((job) => (
            <Entry key={`${job.company}-${job.start}`} job={job} />
          ))}
        </ol>
      </div>

      <div className="mt-16 md:grid md:grid-cols-12 md:gap-8">
        <div className="border-line bg-surface flex items-start gap-4 rounded-2xl border p-6 md:col-span-9 md:col-start-4">
          <span className="border-accent text-accent-text flex size-11 shrink-0 items-center justify-center rounded-full border">
            <GraduationCap aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 className="label text-muted">Education</h3>
            <p className="font-display mt-2 text-xl font-semibold">{education.degree}</p>
            <p className="text-muted mt-1">
              {education.institution} · {education.years}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
