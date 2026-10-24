import { About } from "@/components/About";
import { AiSection } from "@/components/AiSection";
import { Contact } from "@/components/Contact";
import { Experience } from "@/components/Experience";
import { Hero } from "@/components/Hero";
import { Skills } from "@/components/Skills";
import { StackMarquee } from "@/components/StackMarquee";
import { Section } from "@/components/ui";
import { Work } from "@/components/Work";
import { hasLinkedIn, profile } from "@/data/profile";
import { siteUrl } from "@/lib/site";

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  jobTitle: profile.title,
  email: `mailto:${profile.email}`,
  url: siteUrl,
  image: `${siteUrl}/opengraph-image`,
  address: {
    "@type": "PostalAddress",
    addressLocality: profile.location.city,
    addressRegion: profile.location.region,
    addressCountry: profile.location.country,
  },
  alumniOf: { "@type": "CollegeOrUniversity", name: profile.education.institution },
  sameAs: hasLinkedIn ? [profile.linkedin] : [],
  knowsAbout: [
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "AWS",
    "React Native",
    "Redux",
    "Microservices",
    "Retrieval-Augmented Generation",
    "AI-assisted software development",
    "Agentic AI workflows",
    "LLM integration",
    "Claude Code",
    "AWS Bedrock",
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <StackMarquee />
      <About />
      <AiSection />
      <Section
        id="work"
        index="03"
        eyebrow="Projects"
        title="Things I’ve built — for work, for friends, for fun."
        intro="A SaaS I'm building, a couple of sites from my time at MindLogics, and sites I've built for friends' businesses — mostly for fun, and a chance to try new tools end to end."
      >
        <Work projects={profile.projects} />
      </Section>
      <Section
        id="experience"
        index="04"
        eyebrow="Experience"
        title="10+ years across banking, aviation and telecom."
      >
        <Experience jobs={profile.experience} education={profile.education} />
      </Section>
      <Skills />
      <Contact />
    </>
  );
}
