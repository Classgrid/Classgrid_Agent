// The usual facts of a design: pages, shape, last edit
import React from 'react';
import { CdCountText } from './CdCountText';
import { CdDesignSizeTag } from './CdDesignSizeTag';
import { CdTimeText } from './CdTimeText';

export function cdDesignFacts(d: { page_count?: number; thumbnail?: { width?: number; height?: number }; updated_at?: number; created_at?: number }): React.ReactNode[] {
  return [
    d.page_count ? <CdCountText n={d.page_count} one="page" /> : null,
    <CdDesignSizeTag width={d.thumbnail?.width} height={d.thumbnail?.height} />,
    <CdTimeText value={d.updated_at || d.created_at} prefix="Edited" />,
  ];
}

export function CdDesignFacts({ design }: { design: { page_count?: number; thumbnail?: { width?: number; height?: number }; updated_at?: number; created_at?: number } }) {
  const facts = cdDesignFacts(design).filter(Boolean);
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500 dark:text-[#9a9a9a]">{facts.map((f, i) => <span key={i}>{f}</span>)}</div>;
}
