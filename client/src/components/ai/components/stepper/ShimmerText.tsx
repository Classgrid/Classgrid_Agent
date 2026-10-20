// The running look of the main "Thinking 2s" label (CombinedReasoningBlock) for any step label:
// the moving shine plus a live seconds counter.
// The shine keeps going on every step until the whole reply is finished (StepWorkingContext); the seconds counter
// only runs while that step itself is working. "Thought" is not a ShimmerText, so it still stops on its own.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/** True while the AI is still working on this reply (steps running or the answer still being written) */
export const StepWorkingContext = createContext(false);

export function ShimmerText({ active, className, children, timer = true }: { active: boolean; className?: string; children: React.ReactNode; timer?: boolean }) {
  const replyWorking = useContext(StepWorkingContext);
  const shine = active || replyWorking;
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    setSeconds(0);
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!shine) return <span className={className}>{children}</span>;
  return (
    <>
      <span
        className={cn(className, 'bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-transparent')}
        // Inline colour wins over any text colour the caller passes (e.g. dark:text-…), which would hide the shine
        style={{ animation: 'shimmer 2.5s linear infinite', color: 'transparent', WebkitTextFillColor: 'transparent' }}
      >
        {children}
      </span>
      {timer && active && <span className="shrink-0 text-sm font-normal text-muted-foreground tabular-nums">{seconds}s</span>}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </>
  );
}
