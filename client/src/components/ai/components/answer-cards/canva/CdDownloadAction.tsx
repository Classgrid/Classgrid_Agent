// The download icon for one file
import React from 'react';
import { Download } from 'lucide-react';
import { CdActionIcon } from './CdActionIcon';

export function CdDownloadAction({ url, name }: { url: string; name: string }) {
  return <CdActionIcon label={'Download ' + name} href={url} download><Download className="h-4 w-4" /></CdActionIcon>;
}
