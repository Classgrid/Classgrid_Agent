// A folder's cover: the first pictures inside it as a small mosaic
import React from 'react';
import { Folder } from 'lucide-react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';

export function CdFolderCover({ pictures }: { pictures: (string | undefined)[] }) {
  const pics = pictures.filter(Boolean).slice(0, 4) as string[];
  if (!pics.length) return <CdAspect ratio="16/9"><div className="flex h-full items-center justify-center text-slate-300 dark:text-[#4a4a4a]"><Folder className="h-8 w-8" /></div></CdAspect>;
  return (
    <CdAspect ratio="16/9">
      <div className={pics.length === 1 ? 'h-full' : 'grid h-full grid-cols-2 gap-0.5'}>
        {pics.map((p, i) => <div key={i} className="relative h-full min-h-0"><CdImage src={p} /></div>)}
      </div>
    </CdAspect>
  );
}
