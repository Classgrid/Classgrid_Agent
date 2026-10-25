// A song's album in a list (hidden on small screens)
import React from 'react';

export function SdTrackAlbum({ album }: { album?: string }) {
  if (!album) return null;
  return <span className="hidden truncate sm:inline">{album}</span>;
}
