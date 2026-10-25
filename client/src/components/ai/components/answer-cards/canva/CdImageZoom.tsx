// Full-screen picture view with back / next and Esc to close
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { CdLightboxNav } from './CdLightboxNav';

export function CdImageZoom({ images, at, onAt, onClose }: { images: { src: string; alt?: string }[]; at: number; onAt: (i: number) => void; onClose: () => void }) {
  const img = images[at];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && at > 0) onAt(at - 1);
      if (e.key === 'ArrowRight' && at < images.length - 1) onAt(at + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [at, images.length, onAt, onClose]);
  if (!img) return null;
  return (
    <div role="dialog" aria-label="Picture" onClick={onClose} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 cursor-zoom-out">
      <img src={img.src} alt={img.alt ?? ''} className="max-h-full max-w-full rounded-lg object-contain shadow-2xl" />
      {images.length > 1 && <CdLightboxNav canPrev={at > 0} canNext={at < images.length - 1} onPrev={() => onAt(at - 1)} onNext={() => onAt(at + 1)} />}
      <button type="button" aria-label="Close" onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 cursor-pointer"><X className="h-5 w-5" /></button>
    </div>
  );
}
