// Badges side by side, wrapping onto a new line when needed
import React from 'react';

export function CdBadgeGroup({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return <div className="flex flex-wrap items-center gap-1.5">{items}</div>;
}
