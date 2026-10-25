// Everything in a folder: subfolders first, then designs and images as a grid
import React, { useState } from 'react';
import { CdGrid } from './CdGrid';
import { CdFolderItem } from './CdFolderItem';
import { CdShowMore } from './CdShowMore';

export function CdFolderContents({ items }: { items: any[] }) {
  const [open, setOpen] = useState(false);
  const folders = items.filter((i) => i?.type === 'folder');
  const rest = items.filter((i) => i?.type !== 'folder');
  const shown = open ? rest : rest.slice(0, 6);
  return (
    <div className="flex flex-col gap-2.5">
      {folders.length > 0 && <div className="grid grid-cols-2 gap-2">{folders.slice(0, 6).map((f, i) => <CdFolderItem key={'f' + i} item={f} />)}</div>}
      {rest.length > 0 && <CdGrid cols={3}>{shown.map((it, i) => <CdFolderItem key={i} item={it} />)}</CdGrid>}
      <CdShowMore hidden={rest.length - 6} open={open} onToggle={() => setOpen((o) => !o)} />
    </div>
  );
}
