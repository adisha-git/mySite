"use client";

import { m } from "framer-motion";
import { skillIcons } from "./skill-icons";

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035 } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

export function SkillCloud({
  skills,
  core,
}: {
  skills: readonly string[];
  core: readonly string[];
}) {
  return (
    <m.ul
      variants={list}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      className="flex flex-wrap gap-2"
    >
      {skills.map((skill) => {
        const Icon = skillIcons[skill];
        const isCore = core.includes(skill);
        return (
          <m.li
            key={skill}
            variants={item}
            className={`inline-flex items-center gap-2 rounded-lg border ${
              isCore
                ? "border-accent text-ink bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 py-1.5 text-sm font-medium"
                : "border-line text-ink/85 px-2.5 py-1 text-[13px]"
            }`}
          >
            {Icon ? (
              <Icon
                aria-hidden="true"
                className={isCore ? "text-accent-text size-4" : "text-muted size-3.5"}
              />
            ) : null}
            {skill}
            {isCore ? <span className="sr-only"> (core skill)</span> : null}
          </m.li>
        );
      })}
    </m.ul>
  );
}
