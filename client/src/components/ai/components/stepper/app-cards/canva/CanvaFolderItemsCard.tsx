// list_folder_items: what's inside a folder (subfolders as rows, designs and images as tiles)
import React from 'react';
import { Folder } from 'lucide-react';
import { AppCard, Carousel, Pill, ShortList } from '../shared';
import { CanvaEmptyState } from './CanvaEmptyState';
import { CanvaFolderRow } from './CanvaFolderRow';
import { CanvaImageTile } from './CanvaImageTile';
import { type CanvaDesign, CanvaDesignTile } from './CanvaDesignTile';

// ─── Folder contents ───
export function CanvaFolderItemsCard({ data }: { data: any }) {
  const items: any[] = data?.items || [];
  const folders = items.filter((i) => i.type === 'folder').map((i) => i.folder);
  const designs = items.filter((i) => i.type === 'design').map((i) => i.design);
  const images = items.filter((i) => i.type === 'image').map((i) => i.image);
  if (!items.length) return <CanvaEmptyState icon={Folder} text="This folder is empty" />;
  return (
    <AppCard brand="canva" title="Folder contents" right={<Pill tone="purple">{items.length} items</Pill>}>
      <div className="flex flex-col gap-3">
        {folders.length > 0 && <ShortList items={folders} first={4} render={(f: any) => <CanvaFolderRow key={f.id} folder={f} />} />}
        {designs.length > 0 && <Carousel>{designs.map((d: CanvaDesign) => <CanvaDesignTile key={d.id} design={d} />)}</Carousel>}
        {images.length > 0 && <Carousel itemClass="basis-[30%] sm:basis-[22%]">{images.map((im: any) => <CanvaImageTile key={im.id} image={im} />)}</Carousel>}
      </div>
    </AppCard>
  );
}
