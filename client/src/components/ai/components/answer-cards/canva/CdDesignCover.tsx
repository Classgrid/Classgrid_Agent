// A design's cover picture in a fixed shape (opens the design when it has a link)
import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import { CdAspect } from './CdAspect';
import { CdImage } from './CdImage';

export function CdDesignCover({ src, alt, ratio = '16/9', href }: { src?: string; alt?: string; ratio?: '16/9' | '4/3' | 'square'; href?: string }) {
  const box = <CdAspect ratio={ratio}><CdImage src={src} alt={alt} icon={LayoutTemplate} fit="contain" /></CdAspect>;
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className="block transition-opacity hover:opacity-95">{box}</a> : box;
}
