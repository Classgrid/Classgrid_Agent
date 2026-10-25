// A folder shown as a finished collection: cover mosaic, name, where it is, what is inside
import React from 'react';
import { CdFolderCover } from './CdFolderCover';
import { CdFolderTitle } from './CdFolderTitle';
import { CdFolderPath } from './CdFolderPath';
import { CdFolderStats } from './CdFolderStats';
import { CdFolderContents } from './CdFolderContents';
import { CdDivider } from './CdDivider';

export function CdFolderShowcase({ folder, items }: { folder: { name?: string }; items: any[] }) {
  const pictures = items.map((i) => (i?.design || i?.image)?.thumbnail?.url);
  return (
    <div className="flex flex-col gap-3">
      <CdFolderCover pictures={pictures} />
      <div className="flex flex-col gap-1"><CdFolderTitle name={folder.name} /><CdFolderPath name={folder.name} /><CdFolderStats items={items} /></div>
      {items.length > 0 && <><CdDivider /><CdFolderContents items={items} /></>}
    </div>
  );
}
