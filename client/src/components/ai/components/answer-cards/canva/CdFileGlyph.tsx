// A file icon in a colored square that matches the file type
import React from 'react';
import { File, FileCode, FileImage, FileSpreadsheet, FileText, Film, Presentation, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const KINDS: { test: RegExp; icon: LucideIcon; tint: string }[] = [
  { test: /pdf/, icon: FileText, tint: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  { test: /pptx?|presentation/, icon: Presentation, tint: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  { test: /png|jpe?g|gif|webp|image/, icon: FileImage, tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  { test: /mp4|mov|webm|video/, icon: Film, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  { test: /csv|xlsx?/, icon: FileSpreadsheet, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  { test: /html/, icon: FileCode, tint: 'bg-slate-500/10 text-slate-700 dark:text-slate-300' },
];

export function CdFileGlyph({ kind, size = 'md' }: { kind?: string; size?: 'sm' | 'md' }) {
  const k = String(kind || '').toLowerCase();
  const hit = KINDS.find((x) => x.test.test(k));
  const Icon = hit?.icon ?? File;
  return <span className={cn('inline-flex shrink-0 items-center justify-center rounded-lg', hit?.tint ?? 'bg-slate-100 text-slate-600 dark:bg-[#232323] dark:text-[#c9c9c9]', size === 'sm' ? 'h-7 w-7' : 'h-10 w-10')}><Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5'} /></span>;
}
