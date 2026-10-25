// The display card's top bar: "Your Canva results" and how many things are in it
import React from 'react';
import { CdTopBar } from './CdTopBar';
import { CdStatusPill } from './CdStatusPill';

export function CdResultHeader({ label, count }: { label: string; count: number }) {
  return <CdTopBar label={label} right={<CdStatusPill count={count} word="result" />} />;
}
