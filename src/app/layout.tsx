import { GoogleTagManager } from "@next/third-parties/google";
import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import { ChatLauncher } from "@/components/chat/ChatLauncher";
import { Providers } from "@/components/Providers";
import { chatConfig } from "@/lib/chat/config";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { profile } from "@/data/profile";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

// Used for labels and the hero code card, which is above the fold.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  applicationName: `${profile.name} — Portfolio`,
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  keywords: [
    "Adisha Madhushanka",
    "Senior Software Engineer",
    "Open to work",
    "Senior Frontend Engineer",
    "Senior Full-stack Engineer",
    "Frontend Engineer",
    "React developer",
    "Next.js developer",
    "TypeScript",
    "Node.js",
    "AWS",
    "Brisbane",
    "Sydney",
    "Melbourne",
    "Adelaide",
    "Australia",
    "Banking software",
    "AI-assisted development",
    "Agentic workflows",
    "RAG",
    "Retrieval-Augmented Generation",
    "LLM integration",
    "Claude Code",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: profile.name,
    title: siteTitle,
    description: siteDescription,
    locale: "en_AU",
    firstName: "Adisha",
    lastName: "Madhushanka",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#070B12",
};

// Google Tag Manager loads only where NEXT_PUBLIC_GTM_ID is set to a container ID
// (production), so local development and previews don't send analytics.
const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const hasGtm = Boolean(gtmId && /^GTM-[A-Z0-9]+$/.test(gtmId));

// Applies the saved theme (dark by default) before first paint to avoid a flash.
const themeScript = `(function(){try{var t=localStorage.getItem("theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en-AU"
      className={`${geist.variable} ${jetbrains.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {hasGtm ? <GoogleTagManager gtmId={gtmId!} /> : null}
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="bg-accent text-on-accent sr-only z-[100] rounded-full px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
        >
          Skip to content
        </a>
        <Providers>
          <Nav />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            {children}
          </main>
          <Footer />
          <ChatLauncher
            label={chatConfig.theme.launcherLabel}
            assistantName={chatConfig.persona.assistantName}
          />
        </Providers>
      </body>
    </html>
  );
}
