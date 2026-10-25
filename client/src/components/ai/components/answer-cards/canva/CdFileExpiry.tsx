// A quiet note that Canva's download links stop working after 24 hours
import React from 'react';
import { Clock } from 'lucide-react';

export function CdFileExpiry() {
  return <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />Link works for 24 hours</span>;
}
