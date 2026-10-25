// One tag of an image
import React from 'react';
import { Tag } from 'lucide-react';

export function CdTag({ text }: { text: string }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11.5px] text-slate-600 dark:bg-[#262626] dark:text-[#b5b5b5]"><Tag className="h-3 w-3" />{text}</span>;
}
