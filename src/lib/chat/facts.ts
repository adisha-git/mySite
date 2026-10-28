// Fixed facts are served word for word. The model may quote them but never
// rephrase them. Keep the text in sync with content/knowledge/facts.md.

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
    id: "contact",
    label: "Contact",
    text: "The best way to reach Adisha is by email at adisha.madhushanka@gmail.com, or through the contact form on adishamadhushanka.com.au. Adisha's phone number is 0477 160 524.",
  },
];

// Topics the assistant never answers itself; it offers to pass them to Adisha.
export const handoffTopics: readonly string[] = [
  "Salary and rate expectations",
  "References",
  "His LinkedIn profile, which is shared on request",
];
