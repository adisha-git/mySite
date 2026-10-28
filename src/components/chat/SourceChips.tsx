import { FileText } from "lucide-react";
import { chatConfig } from "@/lib/chat/config";
import type { MessageSource } from "@/lib/chat/db/schema";

type Chip = { path: string; label: string; sectionId: string };

/** One chip per knowledge file, labelled with the file's title, linked to its page section. */
export function toChips(sources: readonly MessageSource[]): Chip[] {
  const chips = new Map<string, Chip>();
  for (const { path, heading } of sources) {
    if (chips.has(path)) continue;
    const section = chatConfig.site.sourceSections.find((s) => path.startsWith(s.pathPrefix));
    if (!section) continue;
    // "OCBC Bank — Senior Software Engineer (AVP) > What I owned" → "OCBC Bank"
    const label = section.label ?? heading.split(" > ")[0].split(" — ")[0].trim();
    chips.set(path, { path, label, sectionId: section.sectionId });
  }
  return [...chips.values()];
}

export function SourceChips({
  sources,
  onSelect,
}: {
  sources: readonly MessageSource[];
  onSelect: (sectionId: string) => void;
}) {
  const chips = toChips(sources);
  if (!chips.length) return null;
  return (
    <div className="mt-3">
      <p className="text-muted mb-1.5 font-mono text-[11px]">{"// sources"}</p>
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li key={chip.path}>
            <button
              type="button"
              onClick={() => onSelect(chip.sectionId)}
              className="border-line text-muted hover:border-accent hover:text-ink inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors"
            >
              <FileText aria-hidden="true" className="size-3" />
              {chip.label}
              <span className="sr-only">: show the {chip.sectionId} section</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
