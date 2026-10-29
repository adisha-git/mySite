/**
 * The model ends each answer with a marker naming the sources it used, e.g.
 * `[[sources: 1, 3]]` or `[[sources: none]]`. The ids are the 1-based
 * positions of the <source> blocks in the prompt. The server turns the marker
 * into source chips; the widget hides it. Safe to import in the browser.
 */

const MARKER = /\[\[\s*sources?\s*:([^\]]*)\]\]/gi;
// The model sometimes drops the brackets: a last line like "Sources: 1, 3" or "Sources: none".
const LOOSE_MARKER = /\n\s*sources?\s*:\s*((?:none|\d+(?:\s*,\s*\d+)*))\s*$/i;
// A marker still arriving mid-stream, e.g. "…answer.\n\n[[sour".
const PARTIAL_MARKER = /\s*\[(\[[^\]]*\]?)?$/;

/** True if `text` ends with a marker missing its brackets, which the visitor would otherwise see. */
export function hasLooseMarker(text: string): boolean {
  return LOOSE_MARKER.test(text);
}

/** The source ids cited anywhere in `text`, or null when the model wrote no marker. */
export function parseCitations(text: string): number[] | null {
  const markers = [...text.matchAll(MARKER)].map(([, list]) => list);
  const loose = LOOSE_MARKER.exec(text);
  if (loose) markers.push(loose[1]);
  if (!markers.length) return null;
  const ids = new Set<number>();
  for (const list of markers) {
    for (const id of list.match(/\d+/g) ?? []) ids.add(Number(id));
  }
  return [...ids];
}

/** Removes the marker (and a partly streamed one at the end) from the visible answer. */
export function stripCitations(text: string): string {
  return text.replace(MARKER, "").replace(LOOSE_MARKER, "").replace(PARTIAL_MARKER, "").trimEnd();
}

/** Keeps only the sources whose 1-based ids were cited, in prompt order. */
export function citedSources<T>(sources: readonly T[], ids: readonly number[]): T[] {
  const cited = new Set(ids);
  return sources.filter((_, i) => cited.has(i + 1));
}
