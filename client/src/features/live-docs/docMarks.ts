// Where a comment sits in the doc. A comment keeps the words it was made on (its quote); here those words are found
// again in the doc as it is shown, so the place can be tinted and the writer's photo pinned beside it. Nothing in the
// doc's own elements is changed: the tint uses the browser's highlight ranges (where the browser has them).

/** The place of `quote` inside `root` as a range, or null when the words are no longer there. */
export function quoteRange(root: HTMLElement, quote: string): Range | null {
  const wanted = quote.replace(/\s+/g, "");
  if (!wanted) return null;
  // Every letter of the doc with no spaces, and where each one is (its text node and place in it): a selection's
  // words come with line breaks the doc's own text nodes don't have, so spaces are left out on both sides
  const nodes: Text[] = [];
  const places: number[] = [];
  let all = "";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const text = node.data;
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text[i]!)) continue;
      all += text[i];
      nodes.push(node);
      places.push(i);
    }
  }
  const at = all.indexOf(wanted);
  if (at === -1) return null;
  const last = at + wanted.length - 1;
  const range = document.createRange();
  range.setStart(nodes[at]!, places[at]!);
  range.setEnd(nodes[last]!, places[last]! + 1);
  return range;
}

type HighlightRegistry = { set: (name: string, highlight: unknown) => void; delete: (name: string) => void };
const registry = (): HighlightRegistry | null => (typeof CSS !== "undefined" && (CSS as any).highlights && (window as any).Highlight ? ((CSS as any).highlights as HighlightRegistry) : null);

/** Tints `ranges` under `name` (an empty list takes the tint off). Does nothing in a browser without highlights. */
export function tint(name: string, ranges: Range[]) {
  const all = registry();
  if (!all) return;
  if (ranges.length === 0) all.delete(name);
  else all.set(name, new (window as any).Highlight(...ranges));
}

export const MARK = "cg-doc-comment";
export const MARK_ACTIVE = "cg-doc-comment-active";
/** The tints' colours (a soft sky tint that reads on the light and on the dark page). */
export const MARK_STYLE = `::highlight(${MARK}){background-color:rgba(14,165,233,.2)}::highlight(${MARK_ACTIVE}){background-color:rgba(14,165,233,.42)}`;

/** The block (paragraph, heading, list item, table cell...) a click landed in, for a comment on that block. */
export function blockAt(target: EventTarget | null, root: HTMLElement): HTMLElement | null {
  const el = target instanceof Element ? target.closest("p, li, h1, h2, h3, h4, h5, h6, td, th, blockquote, pre") : null;
  return el instanceof HTMLElement && root.contains(el) ? el : null;
}
