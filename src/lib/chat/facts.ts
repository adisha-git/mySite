// Fixed facts are served word for word: the model asks for them by id with the
// showFacts tool, and the widget renders this text as a card. The model never
// writes them. Keep the text in sync with content/knowledge/facts.md.

export type Fact = {
  id: string;
  label: string;
  text: string;
};

export const facts: readonly Fact[] = [
  {
    id: "work-rights",
    label: "Work rights",
    text: "Adisha holds unrestricted Australian working rights. He does not need visa sponsorship to work in Australia.",
  },
  {
    id: "location",
    label: "Location",
    text: "Adisha is based in Brisbane, Queensland, Australia. He is only looking for roles in Australia.",
  },
  {
    id: "work-arrangement",
    label: "Work arrangement",
    text: "Adisha is open to remote, hybrid and fully on-site work.",
  },
  {
    id: "relocation",
    label: "Relocation",
    text: "Adisha is open to relocating to Melbourne, Sydney or Adelaide.",
  },
  {
    id: "role-types",
    label: "Role types",
    text: "Adisha is open to frontend, senior frontend, full-stack, staff engineer and AI engineer roles. He is open to both permanent and contract roles, in any industry.",
  },
  {
    id: "availability",
    label: "Availability",
    text: "Adisha is available to start immediately.",
  },
  {
    id: "experience",
    label: "Experience",
    text: "Adisha has 10+ years of experience delivering large-scale web applications across banking, aviation, telecommunications and enterprise environments.",
  },
  {
    id: "employers",
    label: "Employers",
    text: "Adisha's employers, most recent first: MindLogics Limited (January 2026 – August 2026); Oversea-Chinese Banking Corporation (OCBC), Singapore (March 2022 – January 2026); Singapore Airlines, through ITCAN Pte Ltd, Singapore (March 2020 – March 2022); DBS Bank, Singapore (October 2019 – March 2020); Innovative Software Engineering, Colombo, Sri Lanka (August 2018 – October 2019); Omobio, Colombo, Sri Lanka (June 2017 – August 2018); WAD International, Colombo, Sri Lanka (July 2015 – July 2016).",
  },
  {
    id: "education",
    label: "Education",
    text: "Adisha holds a BEng (Hons) in Software Engineering from the University of Westminster (2013 – 2017).",
  },
  {
    id: "contact",
    label: "Contact",
    text: "The best way to reach Adisha is by email at adisha.madhushanka@gmail.com, or through the contact form on adishamadhushanka.com.au. Adisha's phone number is 0477 160 524.",
  },
];

// Topics the assistant never answers itself; it points visitors to the contact form instead.
export const handoffTopics: readonly string[] = [
  "Salary and rate expectations",
  "References",
  "His LinkedIn profile, which is shared on request",
  "His family and personal life",
  "Anything else private",
];

/** The allowlist of fact ids the showFacts tool accepts. */
export const factIds = facts.map((f) => f.id) as [string, ...string[]];

/** The requested facts, verbatim from this file, in the order asked and without duplicates. */
export function getFacts(ids: readonly string[]): Fact[] {
  return [...new Set(ids)].flatMap((id) => facts.filter((f) => f.id === id));
}
