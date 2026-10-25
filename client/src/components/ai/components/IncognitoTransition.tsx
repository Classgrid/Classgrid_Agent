// Incognito opening and closing animation (GSAP): a circle of the incognito background grows from the button that was
// pressed, the ghost pops in, blinks, and the word "Incognito" writes in letter by letter. While the screen is covered
// the chat behind switches (onCovered), then the cover clears: opening fades it away, closing folds it into the middle.
import React, { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

export type IncognitoRun = { kind: 'enter' | 'exit'; x: number; y: number; id: number };

const WORD = 'Incognito';

export function IncognitoTransition({ run, onCovered, onDone }: { run: IncognitoRun | null; onCovered: () => void; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const coveredRef = useRef(onCovered);
  const doneRef = useRef(onDone);
  coveredRef.current = onCovered;
  doneRef.current = onDone;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!run || !root) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      coveredRef.current();
      doneRef.current();
      return;
    }
    const { x, y } = run;
    const w = window.innerWidth, h = window.innerHeight;
    const radius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) + 24;
    const letters = wordRef.current ? Array.from(wordRef.current.children) : [];
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ onComplete: () => doneRef.current() });
      tl.set(root, { clipPath: `circle(0px at ${x}px ${y}px)`, autoAlpha: 1 })
        .set(ghostRef.current, { autoAlpha: 0, scale: 0.55, y: 16, rotate: run.kind === 'enter' ? -10 : 10, filter: 'blur(8px)' })
        .set(letters, { autoAlpha: 0, y: 12, filter: 'blur(6px)' })
        // Cover: the circle grows from the pressed button
        .to(root, { clipPath: `circle(${radius}px at ${x}px ${y}px)`, duration: 0.62, ease: 'power3.inOut' })
        // The ghost pops in with a little overshoot, the word writes in
        .to(ghostRef.current, { autoAlpha: 1, scale: 1, y: 0, rotate: 0, filter: 'blur(0px)', duration: 0.55, ease: 'back.out(1.9)' }, '-=0.28')
        .to(letters, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.4, stagger: 0.035, ease: 'power3.out' }, '-=0.38')
        .to(eyesRef.current, { scaleY: 0.08, duration: 0.07, yoyo: true, repeat: 1, transformOrigin: '50% 50%', ease: 'power1.inOut' }, '+=0.02')
        // Screen fully covered: switch the chat behind
        .add(() => coveredRef.current());

      if (run.kind === 'enter') {
        // Opening: the ghost lifts towards you and the cover dissolves into the incognito chat
        tl.to(ghostRef.current, { scale: 1.18, y: -6, autoAlpha: 0, filter: 'blur(6px)', duration: 0.42, ease: 'power2.in' }, '+=0.16')
          .to(letters, { autoAlpha: 0, y: -8, filter: 'blur(4px)', duration: 0.3, stagger: 0.02, ease: 'power2.in' }, '<')
          .to(root, { autoAlpha: 0, duration: 0.42, ease: 'power2.out' }, '-=0.2');
      } else {
        // Closing: the ghost floats up and vanishes, the letters fall away, the cover folds into the middle
        tl.to(ghostRef.current, { y: -26, scale: 0.85, autoAlpha: 0, filter: 'blur(8px)', duration: 0.45, ease: 'power2.in' }, '+=0.14')
          .to(letters, { autoAlpha: 0, y: 10, filter: 'blur(4px)', duration: 0.28, stagger: { each: 0.025, from: 'end' }, ease: 'power2.in' }, '<')
          .to(root, { clipPath: `circle(0px at ${w / 2}px ${h / 2}px)`, duration: 0.55, ease: 'power3.inOut' }, '-=0.18');
      }
    }, root);
    return () => ctx.revert();
  }, [run]);

  if (!run) return null;
  return (
    <div
      key={run.id}
      ref={rootRef}
      aria-hidden
      style={{ clipPath: `circle(0px at ${run.x}px ${run.y}px)`, visibility: 'hidden' }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-4 bg-white text-[#141413] dark:bg-[#0f0f0f] dark:text-white"
    >
      <svg ref={ghostRef} viewBox="0 0 24 24" className="h-16 w-16 will-change-transform">
        <path fill="currentColor" d="M12 3.5a7.5 7.5 0 0 0-7.5 7.5v10.2a.6.6 0 0 0 .96.48l1.87-1.4 1.97 1.48a.6.6 0 0 0 .72 0L12 20.28l1.98 1.48a.6.6 0 0 0 .72 0l1.97-1.48 1.87 1.4a.6.6 0 0 0 .96-.48V11A7.5 7.5 0 0 0 12 3.5Z" />
        <g ref={eyesRef}>
          <circle cx="9.4" cy="11" r="1.25" className="fill-white dark:fill-[#0f0f0f]" />
          <circle cx="14.6" cy="11" r="1.25" className="fill-white dark:fill-[#0f0f0f]" />
        </g>
      </svg>
      <div ref={wordRef} className="flex text-[22px] font-medium tracking-tight">
        {WORD.split('').map((ch, i) => <span key={i} className="inline-block will-change-transform">{ch}</span>)}
      </div>
    </div>
  );
}
