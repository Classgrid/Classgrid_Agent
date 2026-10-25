// A calm empty state with an icon and one line
import React from 'react';
import { type LucideIcon } from 'lucide-react';

export function SdEmpty({ icon: Icon, text, sub }: { icon: LucideIcon; text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl bg-slate-50 px-4 py-6 text-center dark:bg-[#1c1c1c]">
      <Icon className="h-6 w-6 text-slate-300 dark:text-[#4a4a4a]" />
      <div className="text-[13.5px] font-medium text-slate-700 dark:text-[#d6d6d6]">{text}</div>
      {sub && <div className="text-[12px] text-slate-500 dark:text-[#9a9a9a]">{sub}</div>}
    </div>
  );
}
