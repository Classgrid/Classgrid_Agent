// The finished designs: a deck viewer when its slides are known, a showcase for one, a gallery for many
import React from 'react';
import { CdDesignShowcase } from './CdDesignShowcase';
import { CdDesignGallery } from './CdDesignGallery';
import { CdDeckViewer } from './CdDeckViewer';
import { CdSection } from './CdSection';
import { type CdDesignData } from './CdDesignGalleryItem';

export function CdDesignsPanel({ designs, decks }: { designs: CdDesignData[]; decks: { designId?: string; slides: { src?: string }[] }[] }) {
  const main = designs[0];
  const deck = decks.find((d) => d.designId && d.designId === main?.id) || decks[0];
  return (
    <div className="flex flex-col gap-4">
      {deck && deck.slides.length > 0 && <CdSection title="Slides"><CdDeckViewer slides={deck.slides} /></CdSection>}
      {designs.length === 1 && main && <CdDesignShowcase design={main} label="Design" />}
      {designs.length > 1 && <CdSection title="Designs"><CdDesignGallery designs={designs} /></CdSection>}
    </div>
  );
}
