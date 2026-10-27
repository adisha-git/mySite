/**
 * All personal content for the site lives here. Edit this file to update
 * text, projects, experience or skills — no component changes needed.
 */

export type ProjectStatus = "Live" | "In progress" | "Demo on request";

export type ProjectCategory = "Next.js" | "AWS" | "WordPress" | "Full-stack";

/** Where a project came from — shown on its card so the context is clear. */
export type ProjectOrigin = "saas" | "work" | "friend";

export interface Project {
  slug: string;
  name: string;
  description: string;
  origin: ProjectOrigin;
  /** Short line shown with the origin icon, e.g. "Built for a friend". */
  originLabel: string;
  /** Public URL. Omit for private projects — the card shows "Request a demo" instead. */
  url?: string;
  status: ProjectStatus;
  stack: string[];
  /** Which filter buttons this project appears under. */
  categories: ProjectCategory[];
  /** Path under /public. Omit to render a generated placeholder. */
  image?: string;
  imageAlt: string;
  /** Renders an illustrated chat-widget mock instead of a screenshot. */
  mock?: "chatbot";
}

export interface Experience {
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  summary: string;
  highlights: string[];
  tags: string[];
}

export interface SkillGroup {
  title: string;
  skills: string[];
}

export interface AiCapability {
  icon: "assist" | "rag" | "agents" | "cloud";
  title: string;
  description: string;
  tools: string[];
}

export interface QuickFact {
  /** Numeric facts count up; string facts render as-is. */
  value: number | string;
  suffix?: string;
  label: string;
  detail: string;
}

export const enquiryTypes = [
  "Full-time role",
  "Recruiter / agency",
  "Chatbot demo",
  "Other",
] as const;

export type EnquiryType = (typeof enquiryTypes)[number];

export const profile = {
  name: "Adisha Madhushanka",
  firstName: "Adisha",
  initials: "AM",
  title: "Senior Software Engineer",
  tagline: "Secure, high-scale web applications — built with care.",
  /** Used in the hero code card. Update the matching wording in oneLiner, about and quickFacts too. */
  experienceYears: "10+",
  oneLiner:
    "10+ years building secure, high-scale web applications for banking, aviation and telecommunications — React, Next.js, TypeScript, Node.js and AWS.",

  location: {
    city: "Brisbane",
    region: "QLD",
    country: "AU",
    display: "Brisbane, QLD",
  },
  relocation: ["Sydney", "Melbourne", "Adelaide"],
  workRights: "Unrestricted Australian working rights",
  availability: "Open to senior engineering roles",

  email: "adisha.madhushanka@gmail.com",
  // TODO: replace with your LinkedIn profile URL, e.g. https://www.linkedin.com/in/your-handle/
  linkedin: "TODO_LINKEDIN_URL",
  phone: "+61 477 160 524",
  /** Keep false to avoid publishing your phone number. */
  showPhone: false,

  cv: {
    href: "/Adisha-Madhushanka-CV.pdf",
    fileName: "Adisha-Madhushanka-CV.pdf",
  },

  /** What kind of role you're after — shown in the hero, code card and Contact section. */
  jobSearch: {
    summary: "a senior frontend or full-stack role",
    roles: [
      "Senior Software Engineer",
      "Senior Frontend Engineer (React / Next.js)",
      "Senior Full-stack Engineer",
    ],
    codeCard: "Senior Frontend / Full-stack role",
  },

  about: [
    "I'm a senior software engineer with more than ten years of experience building web and mobile products that people rely on every day — from digital banking at OCBC and DBS, to Singapore Airlines' Manage Booking platform, to Dialog Axiata's MyDialog app used by millions in Sri Lanka.",
    "I've led frontend architecture across multiple product teams, set the patterns other engineers build on, and spent a lot of time mentoring junior and mid-level developers through code review and pairing.",
    "Today I work with modern AI-assisted and agentic development — Claude Code, GitHub Copilot, AI coding agents and RAG — to ship faster without lowering the bar on security, accessibility or code quality.",
    "I'm now looking for my next full-time role: a senior frontend or full-stack position on a product team that values quality, ownership and good engineering practice — in Brisbane, or relocating to Sydney, Melbourne or Adelaide.",
  ],

  /** Shown in the hero's code card as `ai: [...]`. */
  aiFocus: ["Claude Code", "Agentic workflows", "RAG"],

  /** "Currently" line in the hero, linking to the AI section. */
  heroNow: "Now building with Claude Code, agentic workflows and RAG.",

  ai: {
    heading: "AI-assisted engineering, with the same bar for quality.",
    intro:
      "I use AI coding tools every day to move faster, and I build LLM features into products — grounded in real data, evaluated, and shipped with the security and review standards I learned in banking.",
    capabilities: [
      {
        icon: "assist",
        title: "AI-assisted development",
        description:
          "Claude Code, GitHub Copilot and AI coding agents across the whole loop: solution design, code generation, refactoring, debugging, automated tests and technical documentation.",
        tools: ["Claude Code", "GitHub Copilot", "AI coding agents"],
      },
      {
        icon: "rag",
        title: "Retrieval-Augmented Generation",
        description:
          "RAG solutions that ground LLM answers in your own content — prompt development, contextual information retrieval and systematic response evaluation.",
        tools: ["RAG", "Prompt engineering", "Response evaluation"],
      },
      {
        icon: "agents",
        title: "Agentic workflows & LLM integration",
        description:
          "Multi-step agentic workflows and LLM features integrated into React and Next.js products, behind secure, JWT-authenticated APIs.",
        tools: ["LLM integration", "Agentic workflows", "Next.js", "Redis", "JWT"],
      },
      {
        icon: "cloud",
        title: "AI on AWS",
        description:
          "Managed foundation models and ML services on AWS, alongside the serverless and container infrastructure I already build on.",
        tools: ["AWS Bedrock", "SageMaker", "Lambda", "ECS"],
      },
    ] satisfies AiCapability[],
    ragSteps: [
      { title: "Ingest", detail: "Chunk and embed source content" },
      { title: "Retrieve", detail: "Find the most relevant context" },
      { title: "Augment", detail: "Build a grounded, well-scoped prompt" },
      { title: "Generate", detail: "LLM answers from that context" },
      { title: "Evaluate", detail: "Check accuracy and iterate" },
    ],
    principles: [
      "AI speeds up the work — code review, tests and security standards stay exactly the same.",
      "Answers grounded in your data, not the model's guesses.",
      "Evaluation before rollout, so quality is measured rather than assumed.",
    ],
  },

  quickFacts: [
    { value: 10, suffix: "+", label: "Years experience", detail: "Since 2015" },
    {
      value: 5,
      label: "Industries",
      detail: "Banking, aviation, telecom, healthcare, enterprise",
    },
    {
      value: "Millions",
      label: "Users served",
      detail: "Singapore Airlines Manage Booking, MyDialog app",
    },
    {
      value: 3,
      label: "Countries",
      detail: "Sri Lanka, Singapore, Australia / NZ clients",
    },
  ] satisfies QuickFact[],

  projects: [
    {
      slug: "chatbot",
      name: "AI Lead-Capture Chatbot",
      description:
        "My own SaaS in the making: an embeddable AI chatbot that businesses drop onto their website to engage visitors and capture qualified leads.",
      origin: "saas",
      originLabel: "My SaaS · in development",
      status: "Demo on request",
      stack: ["React", "JavaScript", "Node.js", "Express.js", "PostgreSQL"],
      categories: ["Full-stack"],
      imageAlt:
        "Illustration of a chat widget greeting a website visitor and asking for their email.",
      mock: "chatbot",
    },
    {
      slug: "tgs",
      name: "TGS (New Zealand)",
      description:
        "Tour-booking website for Taniwha Guiding Services, a New Zealand operator offering multilingual guided day tours and transfers.",
      origin: "work",
      originLabel: "Client work at MindLogics",
      url: "https://www.tgs.co.nz/",
      status: "Live",
      stack: ["Next.js", "React", "AWS Lambda", "Amazon CloudFront"],
      categories: ["Next.js", "AWS"],
      image: "/projects/tgs.webp",
      imageAlt:
        "Taniwha Guiding Services homepage with a Milford Sound landscape and the headline “Unveiling New Zealand’s Wonders”.",
    },
    {
      slug: "mindlogics",
      name: "MindLogics",
      description:
        "Company website for MindLogics, the New Zealand software agency I worked at — services, studio and client stories.",
      origin: "work",
      originLabel: "Built at MindLogics",
      url: "https://mindlogics.co.nz/",
      status: "Live",
      stack: ["Next.js", "React", "AWS Lambda", "Amazon CloudFront"],
      categories: ["Next.js", "AWS"],
      image: "/projects/mindlogics.webp",
      imageAlt:
        "MindLogics homepage on a dark green background with the headline “Software, with purpose.”",
    },
    {
      slug: "sri-aero",
      name: "Sri Aero",
      description:
        "Site for a friend's mobile aircraft-detailing business in Calgary — services, fleet and quote requests, with hand-built SVG motion.",
      origin: "friend",
      originLabel: "Built for a friend",
      url: "https://www.sriaero.ca/",
      status: "Live",
      stack: [
        "Next.js",
        "React",
        "TypeScript",
        "Tailwind CSS",
        "Framer Motion",
        "SVG animation",
        "JSON-LD SEO",
        "Vercel",
      ],
      categories: ["Next.js"],
      image: "/projects/sri-aero.webp",
      imageAlt:
        "Sri Aero homepage: a private jet at sunset with the headline “Aviation-grade detailing, delivered to your hangar.”",
    },
    {
      slug: "dhanesha",
      name: "Dhanesha Chemicals & Fertilisers",
      description:
        "Fast, SEO-focused catalogue site for a friend's fertiliser and agri-chemicals supply business in Sri Lanka.",
      origin: "friend",
      originLabel: "Built for a friend",
      url: "https://www.dhaneshachemicalsandfertilisers.com/",
      status: "In progress",
      stack: ["Next.js", "React", "TypeScript", "Tailwind CSS", "JSON-LD SEO", "Vercel"],
      categories: ["Next.js"],
      image: "/projects/dhanesha.webp",
      imageAlt:
        "Dhanesha Chemicals & Fertilisers homepage over a green paddy field, with product and wholesale calls to action.",
    },
    {
      slug: "heykitty",
      name: "HeyKitty",
      description:
        "Playful WordPress storefront for a friend's cat products brand — a fun one to design.",
      origin: "friend",
      originLabel: "Built for a friend",
      url: "https://heykitty.net/",
      status: "Live",
      stack: ["WordPress", "PHP", "cPanel"],
      categories: ["WordPress"],
      image: "/projects/heykitty.webp",
      imageAlt:
        "HeyKitty homepage in pink with a kitten on a blanket and the headline “Everything for Happy Cats”.",
    },
  ] satisfies Project[],

  experience: [
    {
      role: "Senior Software Engineer",
      company: "MindLogics Limited",
      location: "New Zealand / Australia",
      start: "Jan 2026",
      end: "Aug 2026",
      summary: "Built and maintained scalable React and Next.js applications for agency clients.",
      highlights: [
        "Built reusable React components and integrated frontends with RESTful APIs.",
        "Applied AI-assisted workflows with Claude Code, GitHub Copilot and AI coding agents for design, refactoring, testing and documentation.",
        "Developed AI-enabled solutions using LLMs, agentic workflows and retrieval-augmented generation (RAG).",
      ],
      tags: [
        "React",
        "React Native",
        "Next.js",
        "TypeScript",
        "RAG",
        "LLM integration",
        "Redis",
        "JWT",
        "CI/CD",
      ],
    },
    {
      role: "Senior Software Engineer (AVP)",
      company: "OCBC Bank",
      location: "Singapore",
      start: "Mar 2022",
      end: "Jan 2026",
      summary:
        "Led frontend architecture across multiple product teams for retail and corporate banking.",
      highlights: [
        "Owned frontend architecture and technical decisions across multiple retail and corporate banking teams.",
        "Built React applications integrated with Java Spring Boot microservices in a secure, high-availability environment.",
        "Mentored junior and mid-level engineers through structured code reviews and architectural guidance.",
      ],
      tags: [
        "React",
        "JavaScript",
        "Java",
        "Spring Boot",
        "Docker",
        "OpenShift",
        "Jenkins",
        "PostgreSQL",
        "Redis",
      ],
    },
    {
      role: "Senior Software Engineer (React)",
      company: "Singapore Airlines (via ITCAN)",
      location: "Singapore",
      start: "Mar 2020",
      end: "Mar 2022",
      summary:
        "Built the Manage Booking platform serving millions of customer transactions a year.",
      highlights: [
        "Designed and developed the Manage Booking frontend, used across global markets.",
        "Architected strongly typed, reusable React component libraries shared across teams.",
        "Implemented Redux state management for complex, multi-step booking flows.",
      ],
      tags: ["React", "Redux", "AWS", "Node.js", "Material UI"],
    },
    {
      role: "React JS Developer",
      company: "DBS Bank",
      location: "Singapore",
      start: "Oct 2019",
      end: "Mar 2020",
      summary: "Worked on the DBS digibank platform for web and mobile.",
      highlights: [
        "Built account management, fund transfer and bill payment features for digibank.",
        "Designed Redux store architecture and reducer composition for financial workflows.",
        "Delivered web and React Native applications within agile sprint cycles.",
      ],
      tags: ["React", "React Native", "Redux", "TypeScript"],
    },
    {
      role: "Software Engineer",
      company: "Innovative Software Engineering",
      location: "Colombo, Sri Lanka",
      start: "Aug 2018",
      end: "Oct 2019",
      summary: "Delivered enterprise React applications across healthcare and manufacturing.",
      highlights: [
        "Built CareView, a UK NHS integrated care record, with Keycloak auth and GDPR-compliant data handling.",
        "Developed frontend modules for the GPF ERP covering production and inventory tracking.",
        "Designed component libraries optimised with code splitting and lazy loading.",
      ],
      tags: ["React", "Next.js", "Redux", "Node.js", "Keycloak", "AWS"],
    },
    {
      role: "Software Engineer",
      company: "Omobio",
      location: "Colombo, Sri Lanka",
      start: "Jun 2017",
      end: "Aug 2018",
      summary: "Built React Native apps for Dialog Axiata used by millions of customers.",
      highlights: [
        "Contributed to MyDialog, letting customers manage 350+ telecom services from their phone.",
        "Helped design and build the O2A Retailer onboarding app, replacing paper-based processes.",
        "Built Appium test automation for cross-platform release stability.",
      ],
      tags: ["React Native", "React", "Redux", "Appium"],
    },
    {
      role: "Associate Software Engineer",
      company: "WAD International",
      location: "Colombo, Sri Lanka",
      start: "Jul 2015",
      end: "Jul 2016",
      summary: "Built WordPress and Drupal sites for corporate and hospitality clients.",
      highlights: ["Developed responsive, cross-browser WordPress sites and custom PHP plugins."],
      tags: ["WordPress", "PHP", "JavaScript", "Bootstrap"],
    },
  ] satisfies Experience[],

  education: {
    degree: "BEng (Hons) Software Engineering",
    institution: "University of Westminster",
    years: "2013 – 2017",
  },

  /** Logos in the scrolling strip under the hero. Names must match keys in components/skill-icons.ts to get an icon. */
  stackMarquee: [
    "React",
    "Next.js",
    "TypeScript",
    "Node.js",
    "AWS",
    "React Native",
    "Redux",
    "Tailwind CSS",
    "Express.js",
    "PostgreSQL",
    "MongoDB",
    "Redis",
    "Docker",
    "Jenkins",
    "Claude Code",
    "GitHub Copilot",
    "Firebase",
    "Vercel",
    "Jest",
  ],

  /** Shown larger and outlined in the accent colour in the Skills section. */
  coreSkills: ["React", "Next.js", "TypeScript", "Node.js", "AWS"],

  skills: [
    {
      title: "Languages",
      skills: ["JavaScript", "TypeScript", "HTML", "CSS", "SASS", "Python", "SQL"],
    },
    {
      title: "Frontend",
      skills: [
        "React",
        "Next.js",
        "React Native",
        "Redux",
        "Context API",
        "Tailwind CSS",
        "Material UI",
        "Bootstrap",
      ],
    },
    {
      title: "Backend",
      skills: ["Node.js", "Express.js", "REST APIs", "Microservices", "JWT auth"],
    },
    {
      title: "AI & Agentic Development",
      skills: [
        "Claude Code",
        "GitHub Copilot",
        "AI coding agents",
        "RAG",
        "Prompt engineering",
        "LLM integration",
        "AWS Bedrock",
        "SageMaker",
      ],
    },
    {
      title: "Cloud — AWS",
      skills: [
        "AWS",
        "ECS",
        "Lambda",
        "API Gateway",
        "Step Functions",
        "RDS",
        "VPC",
        "SNS",
        "Amplify",
        "CloudFront",
        "CodePipeline",
        "CloudWatch",
      ],
    },
    { title: "Cloud — Google", skills: ["Firebase", "Cloud Functions"] },
    {
      title: "Databases",
      skills: ["PostgreSQL", "MongoDB", "MySQL", "MSSQL", "Redis"],
    },
    {
      title: "DevOps & Tooling",
      skills: [
        "Docker",
        "Docker Compose",
        "Jenkins",
        "Bitbucket Pipelines",
        "Git",
        "Webpack",
        "Vercel",
      ],
    },
    { title: "Testing", skills: ["Jest", "Mocha", "Appium"] },
    { title: "CMS", skills: ["WordPress", "Strapi", "Drupal"] },
    {
      title: "Mobile Delivery",
      skills: ["App Store Connect", "TestFlight", "Google Play Console", "App Center"],
    },
    {
      title: "Ways of Working",
      skills: ["Agile (Scrum / Kanban)", "Code reviews", "Mentoring", "Jira", "Confluence"],
    },
  ] satisfies SkillGroup[],

  contact: {
    heading: "Hiring? Let's talk.",
    intro:
      "I'm looking for my next full-time senior engineering role. If you're a hiring manager or recruiter with a role that fits, I'd love to hear from you — I usually reply within one business day.",
  },
};

export const navLinks = [
  { id: "about", label: "About" },
  { id: "ai", label: "AI" },
  { id: "work", label: "Work" },
  { id: "experience", label: "Experience" },
  { id: "skills", label: "Skills" },
  { id: "contact", label: "Contact" },
] as const;

export type SectionId = (typeof navLinks)[number]["id"];

/** True once a real LinkedIn URL has been set above. */
export const hasLinkedIn = profile.linkedin.startsWith("http");
