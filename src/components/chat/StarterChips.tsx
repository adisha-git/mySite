import { chatConfig, type ChatStarter } from "@/lib/chat/config";

export function StarterChips({ onSelect }: { onSelect: (starter: ChatStarter) => void }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Suggested questions">
      {chatConfig.starters.map((starter) => (
        <li key={starter.label}>
          <button
            type="button"
            onClick={() => onSelect(starter)}
            className="border-line text-ink hover:border-accent hover:bg-accent/10 rounded-full border px-3 py-1.5 text-left text-sm transition-colors"
          >
            {starter.label}
          </button>
        </li>
      ))}
    </ul>
  );
}
