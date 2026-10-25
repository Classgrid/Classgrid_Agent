// One comment or reply in a discussion; replies sit indented under the first comment
import React from 'react';
import { cn } from '@/lib/utils';
import { CdMessageAvatar } from './CdMessageAvatar';
import { CdMessageMeta } from './CdMessageMeta';
import { CdMessageBody } from './CdMessageBody';

export function CdMessage({ name, when, text, reply }: { name?: string; when?: number; text?: string; reply?: boolean }) {
  return (
    <div className={cn('flex gap-2.5', reply && 'ml-10')}>
      <CdMessageAvatar name={name} />
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-slate-50 px-3 py-2 dark:bg-[#1f1f1f]"><CdMessageMeta name={name} when={when} /><CdMessageBody text={text} /></div>
    </div>
  );
}
