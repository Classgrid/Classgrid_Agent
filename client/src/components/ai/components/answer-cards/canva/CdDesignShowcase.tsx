// One finished design shown big: cover, name, facts, and Edit in Canva / View
import React from 'react';
import { Eye } from 'lucide-react';
import { CdSurface } from './CdSurface';
import { CdTopBar } from './CdTopBar';
import { CdStack } from './CdStack';
import { CdDesignCover } from './CdDesignCover';
import { CdDesignTitleBlock } from './CdDesignTitleBlock';
import { cdDesignFacts } from './CdDesignFacts';
import { CdActionBar } from './CdActionBar';
import { CdOpenCanva } from './CdOpenCanva';
import { CdActionSecondary } from './CdActionSecondary';
import { CdCopyLink } from './CdCopyLink';
import { type CdDesignData, cdEditUrl, cdViewUrl } from './CdDesignGalleryItem';

export function CdDesignShowcase({ design, label = 'Your design' }: { design: CdDesignData; label?: string }) {
  const edit = cdEditUrl(design);
  const view = cdViewUrl(design);
  const w = design.thumbnail?.width, h = design.thumbnail?.height;
  const ratio = w && h ? (Math.abs(w / h - 1) < 0.05 ? 'square' : w / h < 1.5 ? '4/3' : '16/9') : '16/9';
  return (
    <CdSurface>
      <CdTopBar label={label} right={<CdCopyLink url={view || edit} />} />
      <CdStack>
        <CdDesignCover src={design.thumbnail?.url} alt={design.title} ratio={ratio} href={edit || view} />
        <CdDesignTitleBlock title={design.title} href={edit || view} facts={cdDesignFacts(design)} />
        <CdActionBar>
          <CdOpenCanva href={edit} />
          {view && <CdActionSecondary href={view} icon={<Eye className="h-3.5 w-3.5" />}>View</CdActionSecondary>}
        </CdActionBar>
      </CdStack>
    </CdSurface>
  );
}
