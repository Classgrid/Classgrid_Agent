// A song's artists in a list
import React from 'react';

export function SdTrackArtists({ artists }: { artists?: string }) {
  if (!artists) return null;
  return <span className="truncate">{artists}</span>;
}
