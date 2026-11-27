// The sums behind a video artifact's viewer (VideoArtifactView.tsx): times as words ("0:21", "31.8s") and the scene
// strip under the video (each scene a tile as wide as it is long, where a time is on the strip and which time a
// place on the strip is). Plain functions with no imports, so videoMath.test.mjs runs them with node --test.

export type SceneIn = { title: string; start: number; end?: number; thumb?: string };
/** A scene on the strip: its times, and where its tile is (in pixels from the strip's left). */
export type SceneTile = { index: number; title: string; thumb: string; start: number; end: number; left: number; width: number };
export type StripLayout = { tiles: SceneTile[]; width: number; seconds: number };

const num = (n: unknown, fallback = 0) => (typeof n === "number" && Number.isFinite(n) ? n : fallback);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** A time as a clock: 0:21, 2:09, 1:02:03. */
export function formatClock(seconds: number): string {
  const all = Math.max(0, Math.floor(num(seconds)));
  const h = Math.floor(all / 3600);
  const m = Math.floor((all % 3600) / 60);
  const s = String(all % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** How long a scene or a video is: 21s, 31.8s, or 2:09 when it is a minute or more. */
export function formatLength(seconds: number): string {
  const s = Math.max(0, num(seconds));
  if (s >= 59.95) return formatClock(Math.round(s));
  const tenths = Math.round(s * 10) / 10;
  return `${Number.isInteger(tenths) ? tenths.toFixed(0) : tenths.toFixed(1)}s`;
}

/** "0:21", or "0:21 to 0:35" for a stretch of time. */
export function formatSpan(time: number, timeEnd?: number | null): string {
  return typeof timeEnd === "number" && timeEnd > time + 0.05 ? `${formatClock(time)} to ${formatClock(timeEnd)}` : formatClock(time);
}

/**
 * The scenes in order, each with an end (the next scene's start, or the video's end), none outside the video.
 * No scenes: the whole video is one scene.
 */
export function cleanScenes(scenes: SceneIn[] | null | undefined, seconds: number): { title: string; thumb: string; start: number; end: number }[] {
  const total = Math.max(0, num(seconds));
  const sorted = (scenes || [])
    .map((s) => ({ title: String(s?.title || ""), thumb: String(s?.thumb || ""), start: clamp(num(s?.start), 0, total), end: num(s?.end, NaN) }))
    .filter((s) => s.start < total || total === 0)
    .sort((a, b) => a.start - b.start);
  if (!sorted.length) return [{ title: "", thumb: "", start: 0, end: total }];
  sorted[0]!.start = 0;
  const out = sorted.map((s, i) => {
    const next = i + 1 < sorted.length ? sorted[i + 1]!.start : total;
    const end = Number.isFinite(s.end) && s.end > s.start && s.end <= next ? s.end : next;
    return { ...s, end };
  });
  // (two scenes at the same time: the first has no length and goes)
  return out.filter((s, i) => s.end > s.start || (i === out.length - 1 && out.length === 1));
}

/**
 * The tiles of the strip. Each is `perSecond` pixels wide for each second of its scene (at least `minWidth`), with
 * `gap` pixels between them. When the strip is wider than all the tiles (`fitWidth`), the tiles grow to fill it.
 */
export function stripLayout(
  scenes: SceneIn[] | null | undefined,
  seconds: number,
  { perSecond = 3, minWidth = 24, gap = 4, fitWidth = 0 }: { perSecond?: number; minWidth?: number; gap?: number; fitWidth?: number } = {},
): StripLayout {
  const total = Math.max(0, num(seconds));
  const list = cleanScenes(scenes, total);
  const gaps = gap * Math.max(0, list.length - 1);
  const fit = total > 0 && fitWidth > gaps ? (fitWidth - gaps) / total : 0;
  const rate = Math.max(perSecond, fit);
  let left = 0;
  const tiles = list.map((s, index) => {
    const width = Math.max(minWidth, (s.end - s.start) * rate);
    const tile = { index, title: s.title, thumb: s.thumb, start: s.start, end: s.end, left, width };
    left += width + gap;
    return tile;
  });
  return { tiles, width: Math.max(0, left - gap), seconds: total };
}

/** The tile a time is in (the last one at and after the end). */
export function tileAt(layout: StripLayout, time: number): SceneTile | undefined {
  const t = num(time);
  return layout.tiles.find((tile, i) => t < tile.end || i === layout.tiles.length - 1);
}

/** Where a time is on the strip, in pixels from its left. */
export function timeToX(layout: StripLayout, time: number): number {
  const tile = tileAt(layout, time);
  if (!tile) return 0;
  const length = tile.end - tile.start;
  const part = length > 0 ? clamp((num(time) - tile.start) / length, 0, 1) : 0;
  return tile.left + part * tile.width;
}

/** Which time a place on the strip is (a place between two tiles is where the next scene starts). */
export function xToTime(layout: StripLayout, x: number): number {
  const { tiles } = layout;
  if (!tiles.length) return 0;
  const px = num(x);
  if (px <= 0) return tiles[0]!.start;
  for (const tile of tiles) {
    if (px < tile.left) return tile.start;
    if (px <= tile.left + tile.width) {
      const part = tile.width > 0 ? (px - tile.left) / tile.width : 0;
      return tile.start + part * (tile.end - tile.start);
    }
  }
  return tiles[tiles.length - 1]!.end;
}

/** A box drawn on the video, from two corners (each 0 to 1 of the frame). */
export function boxFrom(x0: number, y0: number, x1: number, y1: number) {
  const a = clamp(Math.min(x0, x1), 0, 1);
  const b = clamp(Math.min(y0, y1), 0, 1);
  return { x: a, y: b, w: clamp(Math.max(x0, x1), 0, 1) - a, h: clamp(Math.max(y0, y1), 0, 1) - b };
}

/** The biggest size with the video's shape that fits in a box. */
export function fitSize(boxWidth: number, boxHeight: number, width: number, height: number) {
  const w = num(width) > 0 ? width : 16;
  const h = num(height) > 0 ? height : 9;
  const scale = Math.max(0, Math.min(num(boxWidth) / w, num(boxHeight) / h));
  return { width: Math.floor(w * scale), height: Math.floor(h * scale) };
}
