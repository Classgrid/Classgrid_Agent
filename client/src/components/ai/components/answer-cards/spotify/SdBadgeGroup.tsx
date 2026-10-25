// Badges side by side, wrapping when needed
import React from 'react';

export function SdBadgeGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return <div className="flex flex-wrap items-center gap-1.5">{items}</div>;
}
