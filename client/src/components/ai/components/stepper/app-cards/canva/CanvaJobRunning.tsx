// A Canva job (export, upload, autofill, resize, import) that was still running when we stopped waiting
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { DoneLine } from '../shared';

// ─── Job still running ───
export function CanvaJobRunning({ icon: Icon, text, sub }: { icon: LucideIcon; text: string; sub?: string }) {
  return <DoneLine brand="canva" icon={<Icon className="h-[18px] w-[18px]" />} text={text} sub={sub} />;
}
