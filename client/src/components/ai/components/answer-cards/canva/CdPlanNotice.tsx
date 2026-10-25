// A calm note when a Canva feature needs a paid plan, with the upgrade link
import React from 'react';
import { Crown } from 'lucide-react';

export function CdPlanNotice({ text }: { text: string }) {
  const link = text.match(/Upgrade link:\s*(https?:\/\/\S+)/)?.[1];
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-500/10">
      <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="text-[13px] text-amber-800 dark:text-amber-300">This needs a paid Canva plan.{link && <a href={link} target="_blank" rel="noopener noreferrer" className="ml-1.5 font-medium underline">See plans</a>}</div>
    </div>
  );
}
