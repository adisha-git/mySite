import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import { FaAws } from "react-icons/fa6";
import {
  SiClaude,
  SiDocker,
  SiGithubcopilot,
  SiNextdotjs,
  SiNodedotjs,
  SiPostgresql,
  SiReact,
  SiTypescript,
} from "react-icons/si";

interface Floater {
  Icon: IconType;
  top: string;
  left: string;
  size: number;
  duration: number;
  delay: number;
  /** Only shown from lg up; the rest appear from md. Phones get no logos so the headline stays clear. */
  desktopOnly?: boolean;
}

// Hand-placed so logos sit around the edges and behind the code card, away from the headline.
const floaters: Floater[] = [
  { Icon: SiReact, top: "14%", left: "58%", size: 34, duration: 8, delay: 0 },
  { Icon: SiNextdotjs, top: "12%", left: "84%", size: 30, duration: 9, delay: 1.2 },
  { Icon: SiTypescript, top: "34%", left: "93%", size: 26, duration: 7, delay: 0.6 },
  { Icon: SiNodedotjs, top: "72%", left: "90%", size: 30, duration: 10, delay: 2 },
  { Icon: FaAws, top: "80%", left: "70%", size: 34, duration: 8.5, delay: 0.3, desktopOnly: true },
  {
    Icon: SiDocker,
    top: "62%",
    left: "52%",
    size: 28,
    duration: 9.5,
    delay: 1.6,
    desktopOnly: true,
  },
  {
    Icon: SiPostgresql,
    top: "24%",
    left: "72%",
    size: 22,
    duration: 7.5,
    delay: 2.4,
    desktopOnly: true,
  },
  {
    Icon: SiClaude,
    top: "58%",
    left: "96%",
    size: 24,
    duration: 8.5,
    delay: 1.9,
    desktopOnly: true,
  },
  {
    Icon: SiGithubcopilot,
    top: "18%",
    left: "96%",
    size: 22,
    duration: 9,
    delay: 0.4,
    desktopOnly: true,
  },
];

/** Decorative hero background: grid, glows, a slowly turning React orbit and floating stack logos. */
export function TechBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="hero-glow absolute inset-0" />
      <div className="hero-grid absolute inset-0" />

      {/* React-style orbit rings */}
      <svg
        viewBox="-50 -50 100 100"
        className="spin-slow text-accent absolute top-[8%] -right-[18%] size-[560px] opacity-[0.10] sm:-right-[8%] sm:size-[720px] lg:top-[2%] lg:right-[-6%]"
      >
        <g fill="none" stroke="currentColor" strokeWidth="0.35">
          <ellipse rx="46" ry="17" />
          <ellipse rx="46" ry="17" transform="rotate(60)" />
          <ellipse rx="46" ry="17" transform="rotate(120)" />
        </g>
        <circle r="4" fill="currentColor" />
      </svg>

      {floaters.map(({ Icon, top, left, size, duration, delay, desktopOnly }, i) => (
        <span
          key={i}
          className={`float text-muted absolute hidden opacity-40 ${desktopOnly ? "lg:block" : "md:block"}`}
          style={
            {
              top,
              left,
              "--d": `${duration}s`,
              "--delay": `-${delay}s`,
            } as CSSProperties
          }
        >
          <Icon style={{ width: size, height: size }} />
        </span>
      ))}
    </div>
  );
}
