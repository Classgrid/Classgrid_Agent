// "Public" or "Private" for a playlist
import React from 'react';
import { Globe, Lock } from 'lucide-react';
import { SdBadge } from './SdBadge';

export function SdPrivacyTag({ isPublic }: { isPublic?: boolean }) {
  if (typeof isPublic !== 'boolean') return null;
  return isPublic ? <SdBadge icon={<Globe className="h-3 w-3" />}>Public</SdBadge> : <SdBadge icon={<Lock className="h-3 w-3" />}>Private</SdBadge>;
}
