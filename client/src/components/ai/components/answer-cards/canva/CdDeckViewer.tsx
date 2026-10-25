// A finished deck to flip through: big slide, back / next, all slides, and full-screen present
import React, { useEffect, useState } from 'react';
import { CdSlideStage } from './CdSlideStage';
import { CdSlideControls } from './CdSlideControls';
import { CdSlideRail } from './CdSlideRail';
import { CdSlideDots } from './CdSlideDots';
import { CdPresentButton } from './CdPresentButton';
import { CdKeyboardHint } from './CdKeyboardHint';
import { CdSlideFullscreen } from './CdSlideFullscreen';

export function CdDeckViewer({ slides }: { slides: { src?: string }[] }) {
  const [at, setAt] = useState(0);
  const [full, setFull] = useState(false);
  const total = slides.length;
  useEffect(() => { if (at > total - 1) setAt(Math.max(0, total - 1)); }, [at, total]);
  if (!total) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <CdSlideStage src={slides[at]?.src} number={at + 1} onZoom={() => setFull(true)} />
      <CdSlideControls at={at + 1} total={total} onPrev={() => setAt((i) => Math.max(0, i - 1))} onNext={() => setAt((i) => Math.min(total - 1, i + 1))} right={<><CdKeyboardHint /><CdPresentButton onClick={() => setFull(true)} /></>} />
      {total > 1 && (total > 8 ? <CdSlideRail slides={slides} at={at} onPick={setAt} /> : <CdSlideDots total={total} at={at} onPick={setAt} />)}
      {full && <CdSlideFullscreen slides={slides} at={at} onAt={setAt} onClose={() => setFull(false)} />}
    </div>
  );
}
