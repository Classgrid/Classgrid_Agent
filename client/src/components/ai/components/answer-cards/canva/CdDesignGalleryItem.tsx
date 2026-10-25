// One design in a gallery: cover, name and last edit; opens it in Canva
import React from 'react';
import { CdDesignCover } from './CdDesignCover';
import { CdHeading } from './CdHeading';
import { CdCaption } from './CdCaption';
import { CdTimeText } from './CdTimeText';

export type CdDesignData = { id?: string; title?: string; thumbnail?: { url?: string; width?: number; height?: number }; urls?: { edit_url?: string; view_url?: string }; url?: string; page_count?: number; updated_at?: number; created_at?: number };
export const cdEditUrl = (d: CdDesignData) => d.urls?.edit_url || d.url;
export const cdViewUrl = (d: CdDesignData) => d.urls?.view_url;

export function CdDesignGalleryItem({ design }: { design: CdDesignData }) {
  const href = cdEditUrl(design) || cdViewUrl(design);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <CdDesignCover src={design.thumbnail?.url} alt={design.title} ratio="4/3" href={href} />
      <div className="min-w-0 px-0.5">
        <CdHeading size="sm" href={href}>{design.title || 'Untitled design'}</CdHeading>
        <CdCaption><CdTimeText value={design.updated_at || design.created_at} prefix="Edited" /></CdCaption>
      </div>
    </div>
  );
}
