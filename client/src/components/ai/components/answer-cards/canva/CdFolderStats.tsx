// How many designs, folders and images a folder holds
import React from 'react';
import { CdFactLine } from './CdFactLine';
import { CdCountText } from './CdCountText';

export function CdFolderStats({ items }: { items: { type?: string }[] }) {
  const n = (t: string) => items.filter((i) => i.type === t).length;
  return <CdFactLine items={[n('design') ? <CdCountText n={n('design')} one="design" /> : null, n('folder') ? <CdCountText n={n('folder')} one="folder" /> : null, n('image') ? <CdCountText n={n('image')} one="image" /> : null]} />;
}
