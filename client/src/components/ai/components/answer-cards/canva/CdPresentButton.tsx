// "Present" opens the slides full screen
import React from 'react';
import { Presentation } from 'lucide-react';
import { CdActionIcon } from './CdActionIcon';

export function CdPresentButton({ onClick }: { onClick: () => void }) {
  return <CdActionIcon label="Present full screen" onClick={onClick}><Presentation className="h-4 w-4" /></CdActionIcon>;
}
