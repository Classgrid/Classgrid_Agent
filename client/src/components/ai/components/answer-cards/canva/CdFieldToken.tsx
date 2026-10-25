// One fillable field of a template (text, image or chart)
import React from 'react';
import { BarChart3, Image as ImageIcon, Type } from 'lucide-react';

export function CdFieldToken({ name, type }: { name: string; type?: string }) {
  const Icon = type === 'image' ? ImageIcon : type === 'chart' ? BarChart3 : Type;
  return <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-[12.5px] text-slate-700 dark:border-[#2a2a2a] dark:text-[#d6d6d6]"><Icon className="h-3.5 w-3.5 text-[#7D2AE8] dark:text-[#c39bff]" />{name}</span>;
}
