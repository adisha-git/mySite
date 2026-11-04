// Everything site-specific lives here, so the rest of src/lib/chat/ can be
// reused on another site by swapping this file and facts.ts.

export type ChatToolName =
  "showFacts" | "captureLead" | "downloadCv" | "scrollToSection" | "openProject";

export type ChatStarter = {
  label: string;
  /** Sent as the visitor's message. Without it, the chip focuses the input with `placeholder`. */
  message?: string;
  placeholder?: string;
  /** "jd": the next message is a pasted job description, which may be longer. */
  mode?: "jd";
};

export type ChatConfig = {
  siteName: string;
  persona: {
    assistantName: string;
    subjectName: string;
    subjectPronoun: string;
    description: string;
    /** Site-specific answer guidance, added to the system prompt's rules. */
    extraRules?: readonly string[];
  };
  starters: readonly ChatStarter[];
  models: {
    chat: string;
    fitCheck: string;
    embedding: string;
    embeddingDimensions: number;
  };
  enabledTools: readonly ChatToolName[];
  theme: {
    background: string;
    accent: string;
    launcherLabel: string;
  };
  /** What the client-side tools and source chips can point at on this site. */
  site: {
    cvUrl: string;
    cvFileName: string;
    contactSectionId: string;
    sections: readonly { id: string; label: string }[];
    projects: readonly { slug: string; name: string; url: string }[];
    /**
     * Maps a knowledge file to the page section its source chip scrolls to (first match wins).
     * `label` names the chip; without it, the chip uses the file's title before " — ".
     */
    sourceSections: readonly { pathPrefix: string; sectionId: string; label?: string }[];
  };
  /** Shown in the panel. Chats are stored, so visitors are told. */
  privacyNote: string;
  leads: {
    /** Same choices as the site's contact form, so leads from both look alike. */
    topics: readonly [string, ...string[]];
    /** Sender on the domain verified in Resend. */
    emailFrom: string;
    /** Server env var holding the inbox that receives lead emails. */
    notifyEnv: string;
  };
};

export const chatConfig: ChatConfig = {
  siteName: "adishamadhushanka.com.au",
  persona: {
    assistantName: "Ask about Adisha",
    subjectName: "Adisha Madhushanka",
    subjectPronoun: "he",
    description:
      "Adisha's assistant on his website. It answers questions about his experience, projects and availability, speaking about him in the third person.",
    extraRules: [
      "For general questions about building websites or website development (for example what websites he builds, how he builds them, SEO or rendering on his sites, or web developer roles): lead with his modern web stack from the sources (Next.js and React front ends, headless or custom CMS architecture, rendering strategies such as server-side rendering, and SEO built into the architecture), then, where it's relevant, mention WordPress as one of the CMS options he uses. Put WordPress first only when the question asks about WordPress specifically.",
      "Only for questions about WordPress developer, website manager, or digital or marketing-focused web roles (or whether he'd suit one): start with his WordPress, website management, analytics and marketing-technology experience from the sources, then say how his Next.js, headless CMS, full-stack JavaScript and AI experience add to it.",
      "These ordering rules set the order of the answer only; they don't change the rules above about emphasis and ranking, and they use only what the sources say.",
      `His years of WordPress experience are in the "website-development" fact: never write the number of years in your own text, in any answer. Show the "website-development" fact card only when the question asks how long he has worked with WordPress. For every other question, including yes/no questions about the websites he builds or roles he'd suit, don't show that card: answer from the sources in your own words, without the years and without reusing the fact's wording: not "modern, SEO-friendly websites" and not "Next.js, React and headless CMS architecture", but the sources' own wording, such as "Next.js and React front ends with content from a headless or custom CMS".`,
    ],
  },
  starters: [
    { label: "Is he open to work?", message: "Is he open to work?" },
    { label: "Check fit against a JD", placeholder: "Paste the job description here…", mode: "jd" },
    { label: "How did he build this chat?", message: "How did he build this chat?" },
    { label: "Tell me about OCBC", message: "Tell me about his work at OCBC." },
  ],
  models: {
    chat: "claude-haiku-5-5",
    fitCheck: "claude-sonnet-5-5",
    embedding: "voyage-4-lite",
    embeddingDimensions: 1024,
  },
  enabledTools: ["showFacts", "captureLead", "downloadCv", "scrollToSection", "openProject"],
  theme: {
    background: "#070b12",
    accent: "#61dafb",
    launcherLabel: "~/ask-adisha $",
  },
  site: {
    cvUrl: "/Adisha-Madhushanka-CV.pdf",
    cvFileName: "Adisha-Madhushanka-CV.pdf",
    contactSectionId: "contact",
    sections: [
      { id: "about", label: "About" },
      { id: "ai", label: "AI" },
      { id: "work", label: "Projects" },
      { id: "experience", label: "Experience" },
      { id: "skills", label: "Skills" },
      { id: "contact", label: "Contact" },
    ],
    projects: [
      { slug: "tgs", name: "TGS (New Zealand)", url: "https://www.tgs.co.nz/" },
      { slug: "mindlogics", name: "MindLogics", url: "https://mindlogics.co.nz/" },
      { slug: "sri-aero", name: "Sri Aero", url: "https://www.sriaero.ca/" },
      {
        slug: "dhanesha",
        name: "Dhanesha Chemicals & Fertilisers",
        url: "https://www.dhaneshachemicalsandfertilisers.com/",
      },
    ],
    sourceSections: [
      { pathPrefix: "content/knowledge/roles/", sectionId: "experience" },
      {
        pathPrefix: "content/knowledge/projects/this-chat.md",
        sectionId: "ai",
        label: "This chat",
      },
      { pathPrefix: "content/knowledge/projects/", sectionId: "work" },
      { pathPrefix: "content/knowledge/facts.md", sectionId: "about", label: "Key facts" },
      { pathPrefix: "content/knowledge/stories.md", sectionId: "experience", label: "Stories" },
      { pathPrefix: "content/knowledge/how-i-work.md", sectionId: "about", label: "How he works" },
      {
        pathPrefix: "content/knowledge/modern-web-development.md",
        sectionId: "work",
        label: "Website development",
      },
      {
        pathPrefix: "content/knowledge/wordpress-and-cms.md",
        sectionId: "skills",
        label: "WordPress & CMS",
      },
      {
        pathPrefix: "content/knowledge/marketing-tech.md",
        sectionId: "skills",
        label: "Marketing tech",
      },
      { pathPrefix: "content/knowledge/boundaries.md", sectionId: "contact", label: "Contact" },
    ],
  },
  privacyNote: "Chats are stored to improve answers. Please don't share sensitive information.",
  leads: {
    topics: ["Full-time role", "Recruiter / agency", "Chatbot demo", "Other"],
    emailFrom: "Ask about Adisha <contact@adishamadhushanka.com.au>",
    notifyEnv: "LEAD_NOTIFY_EMAIL",
  },
};
