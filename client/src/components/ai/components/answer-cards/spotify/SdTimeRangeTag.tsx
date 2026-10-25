// The time a top list covers: last 4 weeks, last 6 months or about a year
import React from 'react';
import { CalendarClock } from 'lucide-react';
import { SdBadge } from './SdBadge';

const LABELS: Record<string, string> = { short_term: 'Last 4 weeks', medium_term: 'Last 6 months', long_term: 'Last year' };

export function SdTimeRangeTag({ range }: { range?: string }) {
  const label = range ? LABELS[range] : undefined;
  if (!label) return null;
  return <SdBadge icon={<CalendarClock className="h-3 w-3" />}>{label}</SdBadge>;
}
