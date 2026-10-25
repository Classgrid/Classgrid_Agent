// All fillable fields of a template
import React from 'react';
import { CdFieldToken } from './CdFieldToken';

export function CdFieldMap({ dataset }: { dataset: Record<string, any> }) {
  const fields = Object.entries(dataset || {});
  if (!fields.length) return null;
  return <div className="flex flex-wrap gap-1.5">{fields.map(([name, f]) => <CdFieldToken key={name} name={name} type={f?.type} />)}</div>;
}
