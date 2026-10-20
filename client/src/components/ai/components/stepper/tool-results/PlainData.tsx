// Any tool data as plain label / value rows, like claude.ai shows tool responses.
// Objects → rows; nested objects → a small titled section; lists of records → a simple table.
import React, { useState } from 'react';
import { formatDate, humanizeKey, isDateLike, maskSecretsInText } from './primitives';

const URL_RE = /^https?:\/\/\S+$/i;

function Text({ value }: { value: any }) {
  if (value === null || value === undefined || value === '') return <span>None</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  if (typeof value === 'number') return <span>{value.toLocaleString()}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return <span>None</span>;
    return <span>{value.map((v) => (v && typeof v === 'object' ? JSON.stringify(v) : String(v))).join(', ')}</span>;
  }
  if (typeof value === 'object') return <span className="break-all">{JSON.stringify(value)}</span>;
  const s = String(value);
  if (s === '••••••') return <span className="text-slate-400 dark:text-[#7d7d7d]">Hidden</span>;
  if (URL_RE.test(s.trim())) {
    return (
      <a href={s.trim()} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="break-all hover:underline">
        {maskSecretsInText(s.trim())}
      </a>
    );
  }
  if (isDateLike(s)) return <span>{formatDate(s)}</span>;
  return <span className="whitespace-pre-wrap break-words">{s}</span>;
}

const isRecord = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
const isRecordList = (v: any) => Array.isArray(v) && v.length > 0 && v.every(isRecord);

function Rows({ data, depth }: { data: Record<string, any>; depth: number }) {
  const [all, setAll] = useState(false);
  const entries = Object.entries(data);
  const simple = entries.filter(([, v]) => !(isRecord(v) && depth < 3) && !isRecordList(v));
  const sections = entries.filter(([, v]) => (isRecord(v) && depth < 3) || isRecordList(v));
  const shown = all ? simple : simple.slice(0, 20);
  return (
    <div className="flex flex-col">
      {shown.length > 0 && (
        <div className="grid grid-cols-[minmax(96px,150px)_1fr] gap-x-5 gap-y-[5px] text-[13.5px] leading-[1.5]">
          {shown.map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="text-slate-400 dark:text-[#7d7d7d] break-words">{humanizeKey(k)}</span>
              <span className="text-slate-800 dark:text-[#e2e2e2] min-w-0"><Text value={v} /></span>
            </React.Fragment>
          ))}
        </div>
      )}
      {simple.length > 20 && <More all={all} total={simple.length} onClick={() => setAll((a) => !a)} />}
      {sections.map(([k, v]) => (
        <div key={k} className="mt-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-3 text-[13px] text-slate-500 dark:text-[#9a9a9a]">
            <span>{humanizeKey(k)}</span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-[#333]" />
          </div>
          {isRecordList(v) ? <Table rows={v} /> : <Rows data={v} depth={depth + 1} />}
        </div>
      ))}
    </div>
  );
}

/** Columns: the fields most rows have (up to 5), skipping long nested values */
function pickColumns(rows: any[]) {
  const counts = new Map<string, number>();
  rows.slice(0, 40).forEach((r) => Object.entries(r).forEach(([k, v]) => {
    if (v !== null && v !== '' && typeof v !== 'object') counts.set(k, (counts.get(k) ?? 0) + 1);
  }));
  const keys = [...counts.keys()];
  const idLike = (k: string) => /^(_id|id|uuid)$/i.test(k);
  const useful = keys.filter((k) => !idLike(k));
  return (useful.length ? useful : keys).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)).slice(0, 5);
}

function Table({ rows }: { rows: any[] }) {
  const [all, setAll] = useState(false);
  const cols = pickColumns(rows);
  if (cols.length === 0) return <Text value={rows} />;
  const shown = all ? rows : rows.slice(0, 10);
  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto [scrollbar-width:thin]">
        <table className="w-full text-[13px] leading-[1.45] border-collapse">
          <thead>
            <tr>
              {cols.map((c) => <th key={c} className="py-1 pr-4 text-left font-normal text-slate-400 dark:text-[#7d7d7d] whitespace-nowrap">{humanizeKey(c)}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-t border-slate-200/80 dark:border-[#303030]">
                {cols.map((c) => (
                  <td key={c} className="py-1 pr-4 align-top text-slate-800 dark:text-[#e2e2e2] max-w-[280px]">
                    <span className="break-words"><Text value={r[c]} /></span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 10 && <More all={all} total={rows.length} onClick={() => setAll((a) => !a)} />}
    </div>
  );
}

function More({ all, total, onClick }: { all: boolean; total: number; onClick: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className="self-start mt-1.5 text-[12.5px] text-slate-500 hover:text-slate-800 dark:text-[#8a8a8a] dark:hover:text-white cursor-pointer">
      {all ? 'Show less' : `Show all ${total}`}
    </button>
  );
}

export function PlainData({ data }: { data: any }) {
  if (isRecordList(data)) return <Table rows={data} />;
  if (isRecord(data)) return <Rows data={data} depth={0} />;
  return <div className="text-[13.5px] text-slate-800 dark:text-[#e2e2e2]"><Text value={data} /></div>;
}
