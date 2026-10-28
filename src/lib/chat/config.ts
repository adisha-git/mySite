// Everything site-specific lives here, so the rest of src/lib/chat/ can be
// reused on another site by swapping this file and facts.ts.

export type ChatToolName = "captureLead" | "downloadCv" | "scrollToSection" | "openProject";

export type ChatConfig = {
  siteName: string;
  persona: {
    assistantName: string;
    subjectName: string;
    subjectPronoun: string;
    description: string;
  };
  starters: readonly string[];
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
};

export const chatConfig: ChatConfig = {
  siteName: "adishamadhushanka.com.au",
  persona: {
    assistantName: "Ask about Adisha",
    subjectName: "Adisha Madhushanka",
    subjectPronoun: "he",
    description:
      "Adisha's assistant on his portfolio site. It answers questions about his experience, projects and availability, speaking about him in the third person.",
  },
  starters: [
    "Is he open to work?",
    "Check fit against a JD",
    "How did he build this chat?",
    "Tell me about OCBC",
  ],
  models: {
    chat: "claude-haiku-5-5",
    fitCheck: "claude-sonnet-5-5",
    embedding: "voyage-4-lite",
    embeddingDimensions: 1024,
  },
  enabledTools: ["captureLead", "downloadCv", "scrollToSection", "openProject"],
  theme: {
    background: "#070b12",
    accent: "#61dafb",
    launcherLabel: "~/ask-adisha $",
  },
};
