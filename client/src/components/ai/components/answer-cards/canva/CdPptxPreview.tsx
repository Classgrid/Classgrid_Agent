// An exported PowerPoint to look through (Office's online viewer)
import React from 'react';

export function CdPptxPreview({ url }: { url: string }) {
  return <iframe src={'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(url)} title="PowerPoint" loading="lazy" className="h-[340px] w-full rounded-xl border border-slate-200 bg-white dark:border-[#2a2a2a]" />;
}
