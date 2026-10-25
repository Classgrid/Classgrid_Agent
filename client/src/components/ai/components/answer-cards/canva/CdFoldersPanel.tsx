// The folders and what is inside them
import React from 'react';
import { CdFolderShowcase } from './CdFolderShowcase';
import { CdDivider } from './CdDivider';

export function CdFoldersPanel({ folders }: { folders: { folder: { name?: string }; items: any[] }[] }) {
  return <div className="flex flex-col gap-4">{folders.map((f, i) => <React.Fragment key={i}>{i > 0 && <CdDivider />}<CdFolderShowcase folder={f.folder} items={f.items} /></React.Fragment>)}</div>;
}
