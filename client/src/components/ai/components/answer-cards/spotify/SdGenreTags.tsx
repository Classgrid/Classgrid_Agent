// An artist's first few music styles
import React from 'react';
import { SdBadgeGroup } from './SdBadgeGroup';
import { SdGenreTag } from './SdGenreTag';

export function SdGenreTags({ genres, max = 3 }: { genres?: string[]; max?: number }) {
  if (!genres?.length) return null;
  return <SdBadgeGroup>{genres.slice(0, max).map((g) => <SdGenreTag key={g} genre={g} />)}</SdBadgeGroup>;
}
