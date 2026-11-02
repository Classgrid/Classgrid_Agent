// Chat step for publish_page: "Published <title>" and a small card with an Open button.
import React from 'react';
import { ExternalLink, Globe, Lock, PanelsTopLeft } from 'lucide-react';
import { Spinner } from '@/components/marketing_ui/spinner';
import { ShimmerText } from './ShimmerText';

type Step = { id: string; tool: string; status?: string; args?: any; result?: string };

export function PublishedPageStep({ step }: { step: Step }) {
  const loading = step.status === 'loading';
  const result = String(step.result || '');
  const failed = step.status === 'error' || /^FAILED/i.test(result);
  const pageId = result.match(/\/p\/([a-f0-9]{24})\b/i)?.[1] || '';
  const title = result.match(/^Published "([^"]*)"/)?.[1] || String(step.args?.title || 'page');
  const version = Number(result.match(/\(version (\d+)/)?.[1] || 0);
  const shared = /anyone signed in with the link/i.test(result);
  const updated = version > 1;

  return (
    <div className="relative z-10 flex flex-col">
      <div className="flex items-center gap-3 p-1 pr-3 -ml-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-[#4a4a4a]" />
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[14px] text-slate-500 dark:text-[#8a8a8a]">
          <PanelsTopLeft className="size-3.5 shrink-0" />
          <ShimmerText active={loading} className="shrink-0">
            {loading ? 'Publishing page' : failed ? "Couldn't publish page" : updated ? 'Updated' : 'Published'}
          </ShimmerText>
          {!loading && !failed && <span className="font-medium text-foreground/90 truncate">{title}</span>}
          {loading && <Spinner className="size-3.5 shrink-0" />}
        </div>
      </div>
      {failed && result && <div className="ml-10 -mt-1 mb-1 text-xs text-red-600 dark:text-red-500">{result.replace(/^FAILED( to publish the page)?:\s*/i, '')}</div>}
      {!loading && !failed && pageId && (
        <div className="ml-10 mt-1 mb-2 flex max-w-[440px] items-center gap-3 overflow-hidden rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-[#262626] dark:text-[#c9c9c9]">
            <PanelsTopLeft className="h-[18px] w-[18px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{title}</span>
            <span className="flex items-center gap-1 truncate text-[12px] text-slate-500 dark:text-[#9a9a9a]">
              {shared ? <Globe className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
              {shared ? 'Anyone with the link' : 'Only you'}{version > 1 ? ` · Version ${version}` : ''}
            </span>
          </span>
          <a href={`/p/${pageId}`} target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 text-[12.5px] font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-200 transition-colors">
            <ExternalLink className="h-3.5 w-3.5" />Open
          </a>
        </div>
      )}
    </div>
  );
}
