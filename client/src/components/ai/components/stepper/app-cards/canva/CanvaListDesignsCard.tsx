// list_designs: the user's designs (or the ones matching a search) as a carousel
import React from 'react';
import { CanvaDesignsCarousel } from './CanvaDesignsCarousel';

// ─── List designs ───
export function CanvaListDesignsCard({ args, data }: { args: any; data: any }) {
  return <CanvaDesignsCarousel designs={data?.items || []} title={args?.query ? `Designs for "${args.query}"` : 'Your designs'} more={!!data?.continuation} />;
}
