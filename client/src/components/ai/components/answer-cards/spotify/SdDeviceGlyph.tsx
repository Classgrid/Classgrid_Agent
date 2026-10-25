// An icon for the kind of device (phone, computer, speaker, TV, car)
import React from 'react';
import { Car, Laptop, Monitor, Smartphone, Speaker, Tablet, Tv } from 'lucide-react';

export function SdDeviceGlyph({ type, active }: { type?: string; active?: boolean }) {
  const t = String(type || '').toLowerCase();
  const Icon = t === 'smartphone' ? Smartphone : t === 'computer' ? Laptop : t === 'tablet' ? Tablet : t === 'tv' || t === 'castvideo' ? Tv : t === 'automobile' ? Car : t === 'speaker' || t === 'castaudio' || t === 'avr' ? Speaker : Monitor;
  return <span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ' + (active ? 'bg-[#1DB954]/15 text-[#13843c] dark:text-[#1ed760]' : 'bg-slate-100 text-slate-500 dark:bg-[#262626] dark:text-[#9a9a9a]')}><Icon className="h-5 w-5" /></span>;
}
