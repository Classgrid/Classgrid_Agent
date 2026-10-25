// The comment's words
import React from 'react';

export function CdMessageBody({ text }: { text?: string }) {
  return <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-slate-700 dark:text-[#d6d6d6]">{text}</div>;
}
