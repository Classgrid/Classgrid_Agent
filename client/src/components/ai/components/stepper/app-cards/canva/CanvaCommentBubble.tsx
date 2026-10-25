// One comment or reply: who wrote it, when, and the text
import React from 'react';
import { fmtWhen } from '../shared';
import { CanvaAvatar } from './CanvaAvatar';

// ─── Comment bubble ───
export function CanvaCommentBubble({ author, text, when }: { author?: string; text?: string; when?: number }) {
  return (
    <div className="flex gap-2.5">
      <CanvaAvatar name={author} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-[13px] font-medium text-slate-900 dark:text-white truncate">{author || 'Someone'}</span>
          {when && <span className="text-[11px] text-slate-400 dark:text-[#7d7d7d]">{fmtWhen(when)}</span>}
        </div>
        <div className="text-[13.5px] text-slate-700 dark:text-[#d6d6d6] whitespace-pre-wrap break-words">{text}</div>
      </div>
    </div>
  );
}
