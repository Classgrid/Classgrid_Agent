// The account's country as a flag and its code ("🇮🇳 IN")
import React from 'react';
import { SdBadge } from './SdBadge';

export function SdCountryTag({ country }: { country?: string }) {
  const code = String(country || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return null;
  const flag = String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return <SdBadge><span aria-hidden>{flag}</span>{code}</SdBadge>;
}
