// An exported MP4 to watch in the chat
import React from 'react';

export function CdVideoPlayer({ url }: { url: string }) {
  return <video src={url} controls preload="metadata" className="block max-h-[360px] w-full rounded-xl bg-black" />;
}
