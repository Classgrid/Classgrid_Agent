// The buttons of a display card side by side; never more than two
import React from 'react';

export function SdActionBar({ children }: { children: React.ReactNode }) {
  const buttons = React.Children.toArray(children).filter(Boolean).slice(0, 2);
  if (!buttons.length) return null;
  return <div className="flex flex-wrap items-center gap-2">{buttons}</div>;
}
