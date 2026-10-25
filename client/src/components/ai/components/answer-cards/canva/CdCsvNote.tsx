// A short note under a CSV export (charts and tables as rows)
import React from 'react';
import { Sheet } from 'lucide-react';

export function CdCsvNote() {
  return <div className="flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-[#9a9a9a]"><Sheet className="h-4 w-4" />The table data from your design, ready for Excel or Google Sheets.</div>;
}
