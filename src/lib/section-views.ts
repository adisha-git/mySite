/**
 * Decides when a homepage section counts as viewed: at least half of the
 * smaller of the section's height and the viewport's height is on screen,
 * continuously for DWELL_MS, while the document is visible. The 50% of the
 * viewport rule lets sections taller than the screen count on phones.
 *
 * Kept free of React and the DOM so its timing can be tested; the
 * SectionViewTracker component feeds it measurements and events.
 */

export const DWELL_MS = 1000;
export const VISIBLE_FRACTION = 0.5;

export type Box = { top: number; bottom: number };

export type SectionViewEnv = {
  /** Current position of each section relative to the viewport, or null if it's gone. */
  measure: (name: string) => Box | null;
  viewportHeight: () => number;
  isDocumentVisible: () => boolean;
  onView: (name: string) => void;
  setTimer: (callback: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
};

/** True when enough of `box` is on screen for it to count as being viewed. */
export function qualifies(box: Box, viewportHeight: number): boolean {
  const height = box.bottom - box.top;
  if (height <= 0 || viewportHeight <= 0) return false;
  const visible = Math.min(box.bottom, viewportHeight) - Math.max(box.top, 0);
  return visible > 0 && visible >= VISIBLE_FRACTION * Math.min(height, viewportHeight);
}

/**
 * `viewed` is shared and outlives the tracker, so a section counts once per
 * page visit even if the component rerenders or remounts.
 */
export function createSectionViews(
  names: readonly string[],
  viewed: Set<string>,
  env: SectionViewEnv,
) {
  const timers = new Map<string, unknown>();

  const stopTimer = (name: string) => {
    const handle = timers.get(name);
    if (handle === undefined) return;
    env.clearTimer(handle);
    timers.delete(name);
  };

  const isQualifying = (name: string) => {
    if (!env.isDocumentVisible()) return false;
    const box = env.measure(name);
    return box !== null && qualifies(box, env.viewportHeight());
  };

  /** Re-checks every section; call on scroll, resize, visibility change and start. */
  function evaluate() {
    for (const name of names) {
      if (viewed.has(name)) {
        stopTimer(name);
        continue;
      }
      if (!isQualifying(name)) {
        // The dwell has to be continuous: any gap starts it again.
        stopTimer(name);
        continue;
      }
      if (timers.has(name)) continue;
      timers.set(
        name,
        env.setTimer(() => {
          timers.delete(name);
          // Confirm it's still in view: layout can change without a scroll event.
          if (viewed.has(name) || !isQualifying(name)) return;
          viewed.add(name);
          env.onView(name);
        }, DWELL_MS),
      );
    }
  }

  function dispose() {
    for (const name of [...timers.keys()]) stopTimer(name);
  }

  return { evaluate, dispose };
}
