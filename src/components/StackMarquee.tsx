import { profile } from "@/data/profile";
import { skillIcons } from "./skill-icons";

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-3 pr-3" aria-hidden={hidden || undefined}>
      {profile.stackMarquee.map((name) => {
        const Icon = skillIcons[name];
        return (
          <li
            key={name}
            className="border-line bg-surface/60 text-ink/85 flex items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm whitespace-nowrap"
          >
            {Icon ? <Icon aria-hidden="true" className="text-accent-text size-4" /> : null}
            {name}
          </li>
        );
      })}
    </ul>
  );
}

/** Infinite strip of stack logos between the hero and About. Pauses on hover; static with reduced motion. */
export function StackMarquee() {
  return (
    <section aria-label="Tech stack" className="border-line border-y py-6">
      <div className="mx-auto mb-4 max-w-[1200px] px-5 sm:px-8">
        <p className="text-muted font-mono text-sm">
          <span aria-hidden="true">{"// "}</span>stack I ship with
        </p>
      </div>
      <div className="marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
        <div className="marquee-track flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}
