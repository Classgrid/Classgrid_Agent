// A round avatar with the person's first letter
import React from 'react';

export function CdMessageAvatar({ name }: { name?: string }) {
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00C4CC] to-[#7D2AE8] text-[12.5px] font-semibold text-white">{(name || '?').trim().charAt(0).toUpperCase()}</span>;
}
