"use client";

import { AnimatePresence, m } from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  Heart,
  MessageSquare,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { Project, ProjectCategory, ProjectOrigin, ProjectStatus } from "@/data/profile";
import { openChat } from "./chat/open-chat";
import { ProjectVisual } from "./ProjectVisual";
import { buttonClass } from "./ui";

type Filter = "All" | ProjectCategory;

const filters: Filter[] = ["All", "AI", "Next.js", "AWS", "Full-stack"];

const originIcons: Record<ProjectOrigin, LucideIcon> = {
  site: Bot,
  saas: Rocket,
  work: Briefcase,
  friend: Heart,
};

const statusStyles: Record<ProjectStatus, string> = {
  Live: "bg-emerald-600",
  "In progress": "bg-amber-500",
  "Demo on request": "bg-sky-500",
};

function ProjectCard({ project }: { project: Project }) {
  const OriginIcon = originIcons[project.origin];
  return (
    <article className="group border-line bg-surface relative flex h-full flex-col rounded-2xl border p-3 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] hover:shadow-[0_24px_60px_-30px_var(--accent)]">
      <ProjectVisual project={project} />
      <div className="flex flex-1 flex-col px-2 pt-5 pb-2">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-accent-text inline-flex items-center gap-1.5 font-mono text-xs">
            <OriginIcon aria-hidden="true" className="size-3.5" />
            {project.originLabel}
          </p>
          <p className="label text-muted inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${statusStyles[project.status]}`}
            />
            <span className="sr-only">Status: </span>
            {project.status}
          </p>
        </div>
        <h3 className="font-display mt-2 text-2xl leading-tight font-semibold tracking-tight">
          {project.name}
        </h3>
        <p className="text-muted mt-2 text-[15px] leading-relaxed">{project.description}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tech stack">
          {project.stack.map((tech) => (
            <li
              key={tech}
              className="label border-line text-muted rounded-md border px-2 py-1 !text-[10px] leading-none"
            >
              {tech}
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-6">
          {project.url ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink decoration-accent inline-flex items-center gap-1 text-sm font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2"
            >
              Visit site
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
              <span className="sr-only">: {project.name} (opens in a new tab)</span>
            </a>
          ) : project.tryChat ? (
            <button
              type="button"
              className={buttonClass("primary", "!px-4 !py-2")}
              onClick={() => openChat()}
            >
              <MessageSquare aria-hidden="true" className="size-4" />
              Try the chat
            </button>
          ) : (
            <button
              type="button"
              className={buttonClass("primary", "!px-4 !py-2")}
              onClick={() => openChat({ message: `I'd like a demo of the ${project.name}.` })}
            >
              <MessageSquare aria-hidden="true" className="size-4" />
              Request a demo
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function Work({ projects }: { projects: readonly Project[] }) {
  const [filter, setFilter] = useState<Filter>("All");
  const visible =
    filter === "All" ? projects : projects.filter((p) => p.categories.includes(filter));

  return (
    <>
      <div role="group" aria-label="Filter projects" className="mb-10 flex flex-wrap gap-2">
        {filters.map((f) => {
          const pressed = f === filter;
          const count =
            f === "All" ? projects.length : projects.filter((p) => p.categories.includes(f)).length;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={pressed}
              onClick={() => setFilter(f)}
              className={`label rounded-md border px-3.5 py-2 transition-colors ${
                pressed
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-muted hover:border-accent hover:text-ink"
              }`}
            >
              {f}
              <span className="ml-1.5 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {visible.length} {visible.length === 1 ? "project" : "projects"}
      </p>

      <m.ul layout className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((project, i) => (
            <m.li
              key={project.slug}
              layout
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <ProjectCard project={project} />
            </m.li>
          ))}
        </AnimatePresence>
      </m.ul>
    </>
  );
}
