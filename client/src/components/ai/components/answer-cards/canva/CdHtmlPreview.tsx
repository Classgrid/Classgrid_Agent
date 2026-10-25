// An exported web page shown in a frame
import React from 'react';

export function CdHtmlPreview({ url }: { url: string }) {
  return <iframe src={url} title="Web page" loading="lazy" sandbox="allow-scripts" className="h-[380px] w-full rounded-xl border border-slate-200 bg-white dark:border-[#2a2a2a]" />;
}
