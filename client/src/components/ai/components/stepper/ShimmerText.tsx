// The moving shine the main "Thinking" label uses (CombinedReasoningBlock), for any step label while it runs.
import React from 'react';
import { cn } from '@/lib/utils';

export function ShimmerText({ active, className, children }: { active: boolean; className?: string; children: React.ReactNode }) {
  if (!active) return <span className={className}>{children}</span>;
  return (
    <>
      <span
        className={cn(className, 'bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-transparent')}
        // Inline colour wins over any text colour the caller passes (e.g. dark:text-…), which would hide the shine
        style={{ animation: 'shimmer 2.5s linear infinite', color: 'transparent', WebkitTextFillColor: 'transparent' }}
      >
        {children}
      </span>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </>
  );
}
