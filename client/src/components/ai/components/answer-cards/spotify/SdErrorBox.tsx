// A soft red box for something Spotify would not show
import React from 'react';
import { XCircle } from 'lucide-react';

export function SdErrorBox({ text }: { text: string }) {
  return <div className="flex items-start gap-2.5 rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-500/10"><XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /><div className="min-w-0 flex-1 break-words text-[13px] text-red-700 dark:text-red-300">{text}</div></div>;
}
