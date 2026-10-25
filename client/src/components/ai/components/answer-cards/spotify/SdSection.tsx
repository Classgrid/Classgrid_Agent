// One group inside a display card: a small title and its content
import React from 'react';
import { SdSectionTitle } from './SdSectionTitle';

export function SdSection({ title, right, children }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return <section className="flex flex-col gap-2.5">{title && <SdSectionTitle right={right}>{title}</SdSectionTitle>}{children}</section>;
}
