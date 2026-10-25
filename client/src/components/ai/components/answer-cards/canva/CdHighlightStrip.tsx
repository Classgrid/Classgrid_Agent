// A one-line banner for the newest result ("New design ready", "PDF ready")
import React from 'react';
import { Sparkles } from 'lucide-react';

export function CdHighlightStrip({ text }: { text?: string }) {
  if (!text) return null;
  return <div className="flex items-center gap-2 rounded-xl bg-[#7D2AE8]/[0.07] px-3 py-2 text-[12.5px] font-medium text-[#6a1fd0] dark:bg-[#7D2AE8]/15 dark:text-[#c39bff]"><Sparkles className="h-3.5 w-3.5" />{text}</div>;
}
