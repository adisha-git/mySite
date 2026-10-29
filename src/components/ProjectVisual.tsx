import Image from "next/image";
import type { Project } from "@/data/profile";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function ChatbotMock() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#0B1220_0%,#0F1B2E_60%,#1E3A5F_100%)]">
      {/* Faux website behind the widget */}
      <div aria-hidden="true" className="absolute inset-0 p-[6%] opacity-50">
        <div className="h-2.5 w-1/3 rounded bg-white/25" />
        <div className="mt-3 h-6 w-2/3 rounded bg-white/15" />
        <div className="mt-2 h-6 w-1/2 rounded bg-white/15" />
        <div className="mt-5 h-2 w-3/5 rounded bg-white/10" />
        <div className="mt-2 h-2 w-1/2 rounded bg-white/10" />
      </div>
      <div className="absolute right-[5%] bottom-[7%] w-[56%] max-w-[260px] overflow-hidden rounded-xl bg-[#F6F8FB] text-[#0B1220] shadow-2xl shadow-black/40">
        <div className="flex items-center gap-2 bg-[#0E7490] px-3 py-2">
          <span className="size-2 rounded-full bg-[#61DAFB]" />
          <span className="text-[10px] font-semibold tracking-wide text-white">
            Assistant · online
          </span>
        </div>
        <div className="space-y-1.5 p-2.5 text-[9px] leading-snug sm:text-[10px]">
          <p className="w-[85%] rounded-lg rounded-tl-sm bg-white px-2 py-1.5 shadow-sm">
            Hi 👋 Looking for a quote? I can help.
          </p>
          <p className="ml-auto w-[70%] rounded-lg rounded-tr-sm bg-[#0B1220] px-2 py-1.5 text-[#F6F8FB]">
            Yes — for 20 users.
          </p>
          <p className="w-[85%] rounded-lg rounded-tl-sm bg-white px-2 py-1.5 shadow-sm">
            Great! What&apos;s the best email to send it to?
          </p>
          <div className="mt-1 flex items-center gap-1.5 rounded-md border border-[#E2E8F0] bg-white px-2 py-1 text-[#526071]">
            <span className="flex-1">name@company.com</span>
            <span className="rounded bg-[#0E7490] px-1.5 py-0.5 text-[8px] font-semibold text-white">
              Send
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** This site's own chat, drawn like the real widget: a question, an answer and its sources. */
function AskAdishaMock() {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(135deg,#070B12_0%,#0B1220_55%,#0E2A3A_100%)]">
      {/* Faux page behind the panel */}
      <div aria-hidden="true" className="absolute inset-0 p-[6%] opacity-40">
        <div className="h-2.5 w-1/4 rounded bg-white/25" />
        <div className="mt-3 h-6 w-1/2 rounded bg-white/15" />
        <div className="mt-2 h-6 w-2/5 rounded bg-white/15" />
        <div className="mt-5 h-2 w-2/5 rounded bg-white/10" />
      </div>
      <div className="absolute top-[6%] right-[5%] bottom-[6%] w-[62%] max-w-[290px] overflow-hidden rounded-xl border border-white/10 bg-[#070B12] font-sans text-[#E6EDF3] shadow-2xl shadow-black/50">
        <div className="border-b border-white/10 px-3 py-2">
          <p className="font-mono text-[10px] text-[#61DAFB]">~/ask-adisha $</p>
          <p className="text-[8px] text-[#8B98A9]">Ask about Adisha</p>
        </div>
        <div className="space-y-1.5 p-2.5 text-[9px] leading-snug sm:text-[10px]">
          <p className="ml-auto w-fit max-w-[85%] rounded-lg rounded-br-sm border border-[#61DAFB]/30 bg-[#61DAFB]/10 px-2 py-1 font-mono">
            <span className="text-[#61DAFB]">$</span> What did he do at OCBC?
          </p>
          <p>
            He led frontend architecture for an internal banking app and mentored its engineers.
          </p>
          <div>
            <p className="font-mono text-[8px] text-[#8B98A9]">{"// sources"}</p>
            <div className="mt-1 flex gap-1">
              <span className="rounded border border-white/15 px-1.5 py-0.5 text-[8px] text-[#8B98A9]">
                OCBC Bank
              </span>
              <span className="rounded border border-white/15 px-1.5 py-0.5 text-[8px] text-[#8B98A9]">
                How he works
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Screenshot inside a minimal browser frame, or a fallback visual. */
export function ProjectVisual({ project }: { project: Project }) {
  const host = project.url
    ? new URL(project.url).host.replace(/^www\./, "")
    : project.tryChat
      ? "adishamadhushanka.com.au"
      : "demo.chatbot";
  return (
    <div className="border-line bg-surface overflow-hidden rounded-xl border">
      <div className="border-line flex items-center gap-1.5 border-b px-3 py-2">
        <span aria-hidden="true" className="bg-line size-2 rounded-full" />
        <span aria-hidden="true" className="bg-line size-2 rounded-full" />
        <span aria-hidden="true" className="bg-line size-2 rounded-full" />
        <span className="bg-paper text-muted ml-2 truncate rounded-md px-2 py-0.5 font-mono text-[10px]">
          {host}
        </span>
      </div>
      <div className="relative aspect-[16/10] overflow-hidden">
        <div className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]">
          {project.mock ? (
            <div role="img" aria-label={project.imageAlt} className="absolute inset-0">
              {project.mock === "chatbot" ? <ChatbotMock /> : <AskAdishaMock />}
            </div>
          ) : project.image ? (
            <Image
              src={project.image}
              alt={project.imageAlt}
              fill
              sizes="(min-width: 1200px) 380px, (min-width: 768px) 50vw, 100vw"
              className="object-cover object-top"
            />
          ) : (
            // TODO: no screenshot yet — run `npm run screenshots` or add one under public/projects/.
            <div
              role="img"
              aria-label={project.imageAlt}
              className="absolute inset-0 flex items-center justify-center bg-[linear-gradient(135deg,#0B1220,#1E3A5F_55%,#0E7490)]"
            >
              <span className="font-display text-6xl font-semibold text-[#F6F8FB]/90">
                {initials(project.name)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
