import { profile } from "@/data/profile";
import { SkillCloud } from "./SkillCloud";
import { Section } from "./ui";

export function Skills() {
  return (
    <Section
      id="skills"
      index="05"
      eyebrow="Skills"
      title="The tools I reach for."
      intro={
        <>
          Core stack highlighted in <span className="text-accent-text">cyan</span> — React, Next.js,
          TypeScript, Node.js and AWS.
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {profile.skills.map((group) => (
          <div
            key={group.title}
            className="border-line bg-surface/70 hover:border-accent/40 rounded-xl border p-5 transition-colors sm:p-6"
          >
            <h3 className="mb-4 flex items-baseline justify-between gap-3 font-mono text-[13px]">
              <span className="text-ink">{group.title}</span>
              <span className="text-muted" aria-hidden="true">
                [{group.skills.length}]
              </span>
            </h3>
            <SkillCloud skills={group.skills} core={profile.coreSkills} />
          </div>
        ))}
      </div>
    </Section>
  );
}
