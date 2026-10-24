import { profile } from "@/data/profile";
import { QuickFacts } from "./QuickFacts";
import { Reveal } from "./Reveal";
import { Section } from "./ui";

export function About() {
  return (
    <Section
      id="about"
      index="01"
      eyebrow="About"
      title={
        <>
          Building software people trust, <span className="text-gradient">at scale</span>.
        </>
      }
    >
      <div className="grid gap-12 md:grid-cols-12">
        <Reveal className="space-y-5 text-lg leading-relaxed md:col-span-12 lg:col-span-7">
          {profile.about.map((paragraph, i) => (
            <p key={i} className={i === 0 ? "text-ink" : "text-ink/85"}>
              {paragraph}
            </p>
          ))}
        </Reveal>
        <Reveal delay={0.1} className="md:col-span-12 lg:col-span-5">
          <h3 className="label text-muted mb-4">Quick facts</h3>
          <QuickFacts facts={profile.quickFacts} />
        </Reveal>
      </div>
    </Section>
  );
}
