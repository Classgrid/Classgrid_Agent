// "Edit in Canva" main button for a design
import React from 'react';
import { PenLine } from 'lucide-react';
import { CdActionPrimary } from './CdActionPrimary';

export function CdOpenCanva({ href, label = 'Edit in Canva' }: { href?: string; label?: string }) {
  if (!href) return null;
  return <CdActionPrimary href={href} icon={<PenLine className="h-3.5 w-3.5" />}>{label}</CdActionPrimary>;
}
