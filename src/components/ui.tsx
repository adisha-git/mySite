import type { AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-[background-color,color,border-color,transform,box-shadow] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-on-accent px-5 py-3 shadow-[0_1px_0_rgb(0_0_0/0.08)] hover:shadow-[0_6px_20px_-6px_var(--accent)] hover:brightness-105",
  secondary: "border border-ink/80 text-ink px-5 py-3 hover:bg-ink hover:text-paper",
  ghost:
    "text-ink underline decoration-accent decoration-1 underline-offset-[6px] hover:decoration-2 px-1 py-2",
};

export function buttonClass(variant: Variant = "primary", extra = ""): string {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant;
  children: ReactNode;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <a className={buttonClass(variant, className)} {...rest}>
      {children}
    </a>
  );
}

export function Tag({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`label border-line text-muted inline-flex items-center rounded-md border px-2.5 py-1 leading-none ${className}`}
    >
      {children}
    </span>
  );
}

interface SectionProps {
  id: string;
  index: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}

/** Section shell: accent hairline, numbered code-comment eyebrow stacked above a display heading. */
export function Section({ id, index, eyebrow, title, intro, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-16">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="from-accent/70 via-accent-2/30 h-px bg-linear-to-r to-transparent" />
        <div className="py-16 sm:py-24">
          <header className="mb-10 max-w-3xl md:mb-14">
            <p className="text-accent-text mb-4 font-mono text-sm">
              <span aria-hidden="true" className="text-muted">
                {"// "}
                {index}.{" "}
              </span>
              {eyebrow.toLowerCase()}
            </p>
            <h2
              id={`${id}-heading`}
              className="font-display text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance sm:text-5xl"
            >
              {title}
            </h2>
            {intro ? <p className="text-muted mt-5 text-lg text-pretty">{intro}</p> : null}
          </header>
          {children}
        </div>
      </div>
    </section>
  );
}
