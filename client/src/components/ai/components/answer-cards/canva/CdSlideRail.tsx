// All slides as small pictures in one wrapping row
import React from 'react';
import { CdSlideRailItem } from './CdSlideRailItem';

export function CdSlideRail({ slides, at, onPick }: { slides: { src?: string }[]; at: number; onPick: (i: number) => void }) {
  return <div className="flex flex-wrap gap-2">{slides.map((s, i) => <CdSlideRailItem key={i} src={s.src} number={i + 1} active={at === i} onClick={() => onPick(i)} />)}</div>;
}
