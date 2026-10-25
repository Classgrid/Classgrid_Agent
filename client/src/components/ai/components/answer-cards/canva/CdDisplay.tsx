// Everything Canva made in this answer, shown to look at and use: designs, slides, files, images, folders, comments
import React, { useState } from 'react';
import { CdSurface } from './CdSurface';
import { CdResultHeader } from './CdResultHeader';
import { CdStack } from './CdStack';
import { CdResultTabs } from './CdResultTabs';
import { CdHighlightStrip } from './CdHighlightStrip';
import { CdDesignsPanel } from './CdDesignsPanel';
import { CdFilesPanel } from './CdFilesPanel';
import { CdImagesPanel } from './CdImagesPanel';
import { CdFoldersPanel } from './CdFoldersPanel';
import { CdDiscussion } from './CdDiscussion';
import { CdTemplateShelf } from './CdTemplateShelf';
import { CdFieldMap } from './CdFieldMap';
import { CdIdentity } from './CdIdentity';
import { CdSection } from './CdSection';
import { CdPlanNotice } from './CdPlanNotice';
import { CdErrorBox } from './CdErrorBox';
import { CdEmpty } from './CdEmpty';
import { CdBoundary } from './CdBoundary';
import { LayoutTemplate } from 'lucide-react';
import { type CdDesignData } from './CdDesignGalleryItem';
import { type CdAssetData } from './CdAssetTile';

export type CanvaDisplayData = {
  profile?: any;
  designs: CdDesignData[];
  decks: { designId?: string; slides: { src?: string }[] }[];
  exports: { format: string; urls: string[] }[];
  assets: CdAssetData[];
  folders: { folder: { name?: string }; items: any[] }[];
  discussions: { thread?: any; replies: any[] }[];
  templates: any[];
  datasets: Record<string, any>[];
  errors: string[];
  highlight?: string;
};

export function CdDisplay({ data }: { data: CanvaDisplayData }) {
  const tabs = [
    { id: 'designs', label: 'Designs', count: data.designs.length + (data.designs.length ? 0 : data.decks.length) },
    { id: 'files', label: 'Files', count: data.exports.length },
    { id: 'images', label: 'Images', count: data.assets.length },
    { id: 'folders', label: 'Folders', count: data.folders.length },
    { id: 'comments', label: 'Comments', count: data.discussions.length },
    { id: 'templates', label: 'Templates', count: data.templates.length + data.datasets.length },
  ];
  const first = tabs.find((t) => t.count > 0)?.id ?? 'designs';
  const [tab, setTab] = useState(first);
  const total = tabs.reduce((n, t) => n + t.count, 0);
  const planErrors = data.errors.filter((e) => /quota|premium|plan|upgrade/i.test(e));
  const otherErrors = data.errors.filter((e) => !planErrors.includes(e));
  if (!total && !data.profile && !data.errors.length) return null;
  const active = tabs.find((t) => t.id === tab && t.count > 0) ? tab : first;
  return (
    <CdBoundary>
      <CdSurface>
        <CdResultHeader label="Your Canva results" count={total} />
        <CdStack>
          <CdHighlightStrip text={data.highlight} />
          {data.profile && total === 0 && <CdIdentity profile={data.profile} />}
          <CdResultTabs tabs={tabs} active={active} onPick={setTab} />
          {active === 'designs' && (data.designs.length > 0 || data.decks.length > 0) && <CdDesignsPanel designs={data.designs} decks={data.decks} />}
          {active === 'files' && data.exports.length > 0 && <CdFilesPanel exports={data.exports} />}
          {active === 'images' && data.assets.length > 0 && <CdImagesPanel assets={data.assets} />}
          {active === 'folders' && data.folders.length > 0 && <CdFoldersPanel folders={data.folders} />}
          {active === 'comments' && data.discussions.length > 0 && <div className="flex flex-col gap-4">{data.discussions.map((d, i) => <CdDiscussion key={i} thread={d.thread} replies={d.replies} />)}</div>}
          {active === 'templates' && (data.templates.length > 0 || data.datasets.length > 0) && (
            <div className="flex flex-col gap-4">
              {data.templates.length > 0 && <CdTemplateShelf templates={data.templates} />}
              {data.datasets.map((ds, i) => <CdSection key={i} title="Fields you can fill"><CdFieldMap dataset={ds} /></CdSection>)}
            </div>
          )}
          {total === 0 && !data.profile && !data.errors.length && <CdEmpty icon={LayoutTemplate} text="Nothing to show yet" />}
          {planErrors.slice(0, 1).map((e, i) => <CdPlanNotice key={'p' + i} text={e} />)}
          {otherErrors.slice(0, 2).map((e, i) => <CdErrorBox key={'e' + i} text={e} />)}
        </CdStack>
      </CdSurface>
    </CdBoundary>
  );
}
