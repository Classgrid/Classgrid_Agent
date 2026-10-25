// One fillable field of a brand template (text, image or chart)
import React from 'react';
import { Image as ImageIcon, BarChart3, Type } from 'lucide-react';

const fieldIcon = (type?: string) => (type === 'image' ? ImageIcon : type === 'chart' ? BarChart3 : Type);

// ─── Field row ───
export function CanvaFieldRow({ name, type }: { name: string; type?: string }) {
  const Icon = fieldIcon(type);
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-[#2a2a2a] px-2.5 py-2">
      <Icon className="h-4 w-4 text-[#7D2AE8] dark:text-[#b586ff]" />
      <span className="text-[13px] text-slate-900 dark:text-white truncate">{name}</span>
      <span className="ml-auto text-[11.5px] text-slate-500 dark:text-[#9a9a9a]">{type}</span>
    </div>
  );
}
