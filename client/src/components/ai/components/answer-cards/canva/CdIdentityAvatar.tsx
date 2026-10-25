// The Canva account's round avatar
import React from 'react';

export function CdIdentityAvatar({ name }: { name?: string }) {
  return <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#00C4CC] to-[#7D2AE8] text-[18px] font-semibold text-white">{(name || 'C').charAt(0).toUpperCase()}</span>;
}
