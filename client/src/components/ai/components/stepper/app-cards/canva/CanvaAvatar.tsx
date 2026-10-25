// A round first-letter picture for a person: small for comments, big (Canva gradient) for the account
import React from 'react';

// ─── Avatar ───
export function CanvaAvatar({ name, big }: { name?: string; big?: boolean }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  if (big) return <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#00C4CC] to-[#7D2AE8] text-white text-[18px] font-semibold">{initial}</div>;
  return <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7D2AE8]/15 text-[12px] font-semibold text-[#6a1fd0] dark:text-[#b586ff]">{initial}</div>;
}
