const SMALL_SCREEN = "(max-width: 639px)";

/** True when the panel is full-screen, so it hides the page behind it. */
export function isSmallScreen() {
  return window.matchMedia(SMALL_SCREEN).matches;
}

export function scrollToSection(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
