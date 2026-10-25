// One group inside a display card: a small title and its content
import React from 'react';
import { CdSectionTitle } from './CdSectionTitle';

export function CdSection({ title, right, children }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      {title && <CdSectionTitle right={right}>{title}</CdSectionTitle>}
      {children}
    </section>
  );
}
