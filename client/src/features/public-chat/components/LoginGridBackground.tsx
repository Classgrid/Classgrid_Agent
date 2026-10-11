import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

// Soft blocks behind the login card, starting 3 on each side: squares and rectangles that never disappear —
// each keeps gliding to a new free area of the screen (top, bottom, left, right, crossing behind the card) while growing or shrinking (small, medium, big).
// Colours follow the logo (green, orange) plus a light neutral. Still when the user prefers reduced motion.
const SNAP = 40; // targets snap to a hidden 40px grid so edges line up
// Three clear size levels; every glide switches to a different level so the blocks visibly grow and shrink
const LEVELS = { small: [1, 2], medium: [3, 4], big: [6, 7, 8] } as const;
type Level = keyof typeof LEVELS;
const LEVEL_NAMES = Object.keys(LEVELS) as Level[];

type Tone = "green-soft" | "orange-soft" | "neutral" | "green-solid" | "orange-solid";

const TONE_CLASS: Record<Tone, string> = {
  "green-soft": "bg-emerald-500/[0.12] dark:bg-emerald-400/[0.10]",
  "orange-soft": "bg-orange-500/[0.12] dark:bg-orange-400/[0.10]",
  neutral: "bg-stone-900/[0.045] dark:bg-white/[0.05]",
  "green-solid": "bg-emerald-500 dark:bg-emerald-500/90",
  "orange-solid": "bg-orange-500 dark:bg-orange-500/90",
};

type Side = "left" | "right";
// 3 blocks on each side of the card
const BLOCKS: { side: Side; tone: Tone }[] = [
  { side: "left", tone: "orange-solid" }, { side: "left", tone: "green-soft" }, { side: "left", tone: "orange-soft" },
  { side: "right", tone: "green-solid" }, { side: "right", tone: "orange-soft" }, { side: "right", tone: "green-soft" },
];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;

type Target = { x: number; y: number; w: number; h: number; level: Level; duration: number };

// The screen is split 3x3; the middle area (behind the card) is skipped. Every glide sends a block to a random
// spot inside an area no other block is heading to, so the blocks stay spread over the whole screen and never bunch up.
const AREAS = [0, 1, 2, 3, 5, 6, 7, 8]; // 3x3 index (row * 3 + col), without 4 = centre
const taken = new Map<number, number>(); // block id -> area it is heading to

function randomTarget(blockId: number, startSide: Side | undefined, solid: boolean, prevLevel?: Level): Target {
  const vw = window.innerWidth, vh = window.innerHeight;
  // A different size level from last time (solid blocks never go big, so a bright block never dominates)
  const allowed = LEVEL_NAMES.filter((l) => l !== prevLevel && !(solid && l === "big"));
  const level = pick(allowed);
  const w = pick([...LEVELS[level]]) * SNAP;
  const h = pick([...LEVELS[level]]) * SNAP; // width and height picked separately: squares and rectangles
  const busy = new Set([...taken].filter(([id]) => id !== blockId).map(([, area]) => area));
  let free = AREAS.filter((a) => !busy.has(a) && a !== taken.get(blockId)); // a new area each time, so it travels
  if (startSide) free = free.filter((a) => (startSide === "left" ? a % 3 === 0 : a % 3 === 2)); // start beside the card
  const area = pick(free.length ? free : AREAS);
  taken.set(blockId, area);
  const col = area % 3, row = Math.floor(area / 3);
  // Random spot inside that area (its centre point is somewhere in the area; blocks may run past the screen edge)
  const cx = ((col + Math.random()) * vw) / 3, cy = ((row + Math.random()) * vh) / 3;
  const x = Math.round((cx - w / 2) / SNAP) * SNAP;
  const y = Math.round((cy - h / 2) / SNAP) * SNAP;
  return { x, y, w, h, level, duration: 4 + Math.random() * 3 }; // 4-7 s per glide
}

function Block({ id, side, tone, still }: { id: number; side: Side; tone: Tone; still: boolean }) {
  const solid = tone.endsWith("solid");
  const [target, setTarget] = useState<Target>(() => randomTarget(id, side, solid));
  return (
    <motion.div
      className={`absolute left-0 top-0 ${TONE_CLASS[tone]}`}
      initial={{ opacity: 0, x: target.x, y: target.y, width: target.w, height: target.h }}
      animate={{ opacity: 1, x: target.x, y: target.y, width: target.w, height: target.h }}
      transition={{ duration: target.duration, ease: "easeInOut", opacity: { duration: 1.2 } }}
      // As soon as one glide ends, start the next — the blocks never stop or hide
      onAnimationComplete={() => { if (!still) setTarget((t) => randomTarget(id, undefined, solid, t.level)); }}
    />
  );
}

export function LoginGridBackground() {
  const reduced = useReducedMotion();
  // Rendered only in the browser (positions use the window size)
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#fafaf8] dark:bg-[#0b0b0b]">
      {ready && BLOCKS.map((b, i) => <Block key={i} id={i} side={b.side} tone={b.tone} still={!!reduced} />)}
    </div>
  );
}
