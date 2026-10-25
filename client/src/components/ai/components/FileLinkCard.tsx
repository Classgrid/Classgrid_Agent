// Links in the AI's answer shown as cards instead of plain blue links: one card per kind of file (PDF, PowerPoint,
// Word, Excel, CSV, image, GIF, video, audio, ZIP, code…) and per kind of app link (Canva, Spotify, YouTube, GitHub,
// Google Docs/Sheets/Slides/Forms/Drive, Figma, Notion, live websites, Google Maps). Built only from <span>s and
// phrasing elements (img, iframe, video, audio), because a link sits inside a paragraph or list item.
import React, { useState } from 'react';
import {
  FileText, Presentation, Sheet, FileArchive, Film, Image as ImageIcon, File, Download, ExternalLink, Music, Code2, Eye,
  EyeOff, Github, Globe, MapPin, PenTool, BookOpen, FileSpreadsheet, ClipboardList, HardDrive, Play,
} from 'lucide-react';

// ─── Shared pieces ───
const textOf = (node: React.ReactNode): string => (typeof node === 'string' ? node : Array.isArray(node) ? node.map(textOf).join('') : React.isValidElement(node) ? textOf((node.props as any)?.children) : '');
const fileName = (href: string) => { try { return decodeURIComponent(new URL(href).pathname.split('/').pop() || 'file'); } catch { return 'file'; } };
/** The link text when it's a real name ("Download PDF" is not), else the fallback */
const nameFrom = (children: React.ReactNode, fallback: string) => {
  const label = textOf(children).trim();
  return label && !/^https?:\/\//i.test(label) && !/^(download|open|view|link|here|click)\b/i.test(label) ? label : fallback;
};
const urlOf = (href: string) => { try { return new URL(href); } catch { return null; } };

function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return <span className={`my-1.5 flex w-full ${wide ? 'max-w-[560px]' : 'max-w-[440px]'} flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] align-top`}>{children}</span>;
}
function Row({ icon: Icon, tint, title, sub, actions }: { icon: React.ComponentType<{ className?: string }>; tint: string; title: string; sub: string; actions: React.ReactNode }) {
  return (
    <span className="flex items-center gap-3 px-3 py-2.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tint}`}><Icon className="h-[18px] w-[18px]" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{title}</span>
        <span className="truncate text-[12px] text-slate-500 dark:text-[#9a9a9a]">{sub}</span>
      </span>
      {actions}
    </span>
  );
}
function OpenIcon({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" title="Open" aria-label="Open" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#9a9a9a] dark:hover:bg-[#262626] dark:hover:text-white transition-colors">
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
function DownloadButton({ href }: { href: string }) {
  return (
    <a href={href} download target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 text-[12.5px] font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-200 transition-colors">
      <Download className="h-3.5 w-3.5" />Download
    </a>
  );
}
function OpenButton({ href, label = 'Open' }: { href: string; label?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-slate-900 px-3 text-[12.5px] font-medium text-white hover:bg-slate-700 dark:bg-white dark:text-black dark:hover:bg-slate-200 transition-colors">
      <ExternalLink className="h-3.5 w-3.5" />{label}
    </a>
  );
}
function PreviewToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} title={open ? 'Hide preview' : 'Preview'} aria-label={open ? 'Hide preview' : 'Preview'} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-[#9a9a9a] dark:hover:bg-[#262626] dark:hover:text-white transition-colors cursor-pointer">
      {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}
function Frame({ src, title, height = 360 }: { src: string; title: string; height?: number }) {
  return <iframe src={src} title={title} loading="lazy" className="block w-full border-0 border-b border-slate-200 dark:border-[#2a2a2a] bg-white" style={{ height }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />;
}

type CardProps = { href: string; children?: React.ReactNode };
const officeViewer = (href: string) => `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(href)}`;

// ─── Files ───
/** 1. PDF: preview in the chat */
function PdfCard({ href, children }: CardProps) {
  const [open, setOpen] = useState(false);
  return (
    <Shell wide={open}>
      {open && <Frame src={href} title="PDF preview" height={460} />}
      <Row icon={FileText} tint="bg-red-500/10 text-red-600 dark:text-red-400" title={nameFrom(children, fileName(href))} sub="PDF document" actions={<><PreviewToggle open={open} onToggle={() => setOpen((o) => !o)} /><OpenIcon href={href} /><DownloadButton href={href} /></>} />
    </Shell>
  );
}
/** 2–4. PowerPoint, Word, Excel: preview through Office's online viewer */
function OfficeCard({ href, children, kind }: CardProps & { kind: 'pptx' | 'docx' | 'xlsx' }) {
  const [open, setOpen] = useState(false);
  const meta = kind === 'pptx'
    ? { icon: Presentation, tint: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', sub: 'PowerPoint presentation' }
    : kind === 'docx'
      ? { icon: FileText, tint: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', sub: 'Word document' }
      : { icon: Sheet, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', sub: 'Excel spreadsheet' };
  return (
    <Shell wide={open}>
      {open && <Frame src={officeViewer(href)} title={`${meta.sub} preview`} height={kind === 'pptx' ? 340 : 440} />}
      <Row icon={meta.icon} tint={meta.tint} title={nameFrom(children, fileName(href))} sub={meta.sub} actions={<><PreviewToggle open={open} onToggle={() => setOpen((o) => !o)} /><OpenIcon href={href} /><DownloadButton href={href} /></>} />
    </Shell>
  );
}
/** 5. CSV */
function CsvCard({ href, children }: CardProps) {
  return <Shell><Row icon={FileSpreadsheet} tint="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" title={nameFrom(children, fileName(href))} sub="CSV table" actions={<><OpenIcon href={href} /><DownloadButton href={href} /></>} /></Shell>;
}
/** 6–7. Image and GIF: shown big, tap to open */
function ImageCard({ href, children, gif }: CardProps & { gif?: boolean }) {
  const [failed, setFailed] = useState(false);
  return (
    <Shell>
      {!failed && (
        <a href={href} target="_blank" rel="noreferrer" className="block bg-slate-100 dark:bg-[#222]">
          <img src={href} alt={nameFrom(children, fileName(href))} loading="lazy" onError={() => setFailed(true)} className="block max-h-[300px] w-full object-contain" />
        </a>
      )}
      <Row icon={ImageIcon} tint="bg-sky-500/10 text-sky-600 dark:text-sky-400" title={nameFrom(children, fileName(href))} sub={gif ? 'GIF animation' : 'Image'} actions={<><OpenIcon href={href} /><DownloadButton href={href} /></>} />
    </Shell>
  );
}
/** 8. Video: plays in the chat */
function VideoCard({ href, children }: CardProps) {
  return (
    <Shell wide>
      <video src={href} controls preload="metadata" className="block max-h-[320px] w-full bg-black" />
      <Row icon={Film} tint="bg-violet-500/10 text-violet-600 dark:text-violet-400" title={nameFrom(children, fileName(href))} sub="Video" actions={<><OpenIcon href={href} /><DownloadButton href={href} /></>} />
    </Shell>
  );
}
/** 9. Audio: plays in the chat */
function AudioCard({ href, children }: CardProps) {
  return (
    <Shell>
      <Row icon={Music} tint="bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400" title={nameFrom(children, fileName(href))} sub="Audio" actions={<DownloadButton href={href} />} />
      <span className="block px-3 pb-3"><audio src={href} controls preload="metadata" className="block w-full" /></span>
    </Shell>
  );
}
/** 10. ZIP */
function ZipCard({ href, children }: CardProps) {
  return <Shell><Row icon={FileArchive} tint="bg-amber-500/10 text-amber-600 dark:text-amber-400" title={nameFrom(children, fileName(href))} sub="ZIP archive" actions={<DownloadButton href={href} />} /></Shell>;
}
/** 11. Code and text files */
function CodeFileCard({ href, children, ext }: CardProps & { ext: string }) {
  return <Shell><Row icon={Code2} tint="bg-slate-500/10 text-slate-700 dark:text-slate-300" title={nameFrom(children, fileName(href))} sub={`${ext.toUpperCase()} file`} actions={<><OpenIcon href={href} /><DownloadButton href={href} /></>} /></Shell>;
}
/** 12. Any other file */
function GenericFileCard({ href, children, ext }: CardProps & { ext: string }) {
  return <Shell><Row icon={File} tint="bg-slate-500/10 text-slate-700 dark:text-slate-300" title={nameFrom(children, fileName(href))} sub={`${ext.toUpperCase()} file`} actions={<><OpenIcon href={href} /><DownloadButton href={href} /></>} /></Shell>;
}

// ─── App links ───
/** 13. Canva design */
function CanvaLinkCard({ href, children }: CardProps) {
  return <Shell><Row icon={PenTool} tint="bg-[#7D2AE8]/10 text-[#7D2AE8] dark:text-[#b586ff]" title={nameFrom(children, 'Canva design')} sub="Canva design" actions={<OpenButton href={href} label="Open in Canva" />} /></Shell>;
}
/** 14. Spotify: the real player */
function SpotifyLinkCard({ href, kind, id }: CardProps & { kind: string; id: string }) {
  return (
    <Shell wide>
      <iframe title="Spotify player" src={`https://open.spotify.com/embed/${kind}/${id}?utm_source=classgrid`} loading="lazy" className="block w-full border-0" style={{ height: kind === 'track' || kind === 'episode' ? 152 : 352 }} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
      <span className="flex justify-end px-3 py-2"><OpenButton href={href} label="Open in Spotify" /></span>
    </Shell>
  );
}
/** 15. YouTube: the real player */
function YouTubeLinkCard({ href, id }: CardProps & { id: string }) {
  return (
    <Shell wide>
      <span className="relative block w-full bg-black" style={{ aspectRatio: '16 / 9' }}>
        <iframe title="YouTube video" src={`https://www.youtube-nocookie.com/embed/${id}`} loading="lazy" className="absolute inset-0 block h-full w-full border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen />
      </span>
      <span className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-[#9a9a9a]"><Play className="h-3.5 w-3.5 text-red-600" />YouTube</span>
        <OpenButton href={href} label="Open on YouTube" />
      </span>
    </Shell>
  );
}
/** 16. GitHub repository: GitHub's preview picture */
function GitHubLinkCard({ href, owner, repo }: CardProps & { owner: string; repo: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Shell>
      {!failed && <a href={href} target="_blank" rel="noreferrer" className="block"><img src={`https://opengraph.githubassets.com/1/${owner}/${repo}`} alt={`${owner}/${repo}`} loading="lazy" onError={() => setFailed(true)} className="block w-full" /></a>}
      <Row icon={Github} tint="bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-white" title={`${owner}/${repo}`} sub="GitHub repository" actions={<OpenButton href={href} label="Open on GitHub" />} />
    </Shell>
  );
}
/** 17. Google Docs / Sheets / Slides / Forms / Drive */
function GoogleLinkCard({ href, children, kind }: CardProps & { kind: 'document' | 'spreadsheets' | 'presentation' | 'forms' | 'drive' }) {
  const meta = {
    document: { icon: FileText, tint: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', sub: 'Google Docs' },
    spreadsheets: { icon: Sheet, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', sub: 'Google Sheets' },
    presentation: { icon: Presentation, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', sub: 'Google Slides' },
    forms: { icon: ClipboardList, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', sub: 'Google Forms' },
    drive: { icon: HardDrive, tint: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', sub: 'Google Drive' },
  }[kind];
  return <Shell><Row icon={meta.icon} tint={meta.tint} title={nameFrom(children, meta.sub)} sub={meta.sub} actions={<OpenButton href={href} />} /></Shell>;
}
/** 18. Figma */
function FigmaLinkCard({ href, children }: CardProps) {
  return <Shell><Row icon={PenTool} tint="bg-pink-500/10 text-pink-600 dark:text-pink-400" title={nameFrom(children, 'Figma file')} sub="Figma" actions={<OpenButton href={href} label="Open in Figma" />} /></Shell>;
}
/** 19. Notion */
function NotionLinkCard({ href, children }: CardProps) {
  return <Shell><Row icon={BookOpen} tint="bg-slate-900/10 text-slate-900 dark:bg-white/10 dark:text-white" title={nameFrom(children, 'Notion page')} sub="Notion" actions={<OpenButton href={href} label="Open in Notion" />} /></Shell>;
}
/** 20. Live website (Vercel, Netlify, Classgrid Cloud…): the site's icon and address */
function SiteLinkCard({ href, children, host }: CardProps & { host: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <Shell>
      <span className="flex items-center gap-3 px-3 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#262626]">
          {!failed ? <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt="" className="h-5 w-5" onError={() => setFailed(true)} /> : <Globe className="h-[18px] w-[18px] text-slate-500" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13.5px] font-medium text-slate-900 dark:text-white">{nameFrom(children, host)}</span>
          <span className="truncate text-[12px] text-emerald-600 dark:text-emerald-400">● Live website · {host}</span>
        </span>
        <OpenButton href={href} label="Visit" />
      </span>
    </Shell>
  );
}
/** 21. Google Maps */
function MapsLinkCard({ href, children }: CardProps) {
  return <Shell><Row icon={MapPin} tint="bg-red-500/10 text-red-600 dark:text-red-400" title={nameFrom(children, 'Location')} sub="Google Maps" actions={<OpenButton href={href} label="Open map" />} /></Shell>;
}

// ─── Which card for which link ───
const CODE = new Set(['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'html', 'css', 'json', 'xml', 'yml', 'yaml', 'md', 'txt', 'sql', 'sh']);
const OTHER_FILES = new Set(['rar', '7z', 'tar', 'gz', 'apk', 'exe', 'dmg', 'psd', 'ai', 'svg', 'epub', 'odt', 'rtf', 'key', 'numbers', 'pages']);

/** The card for a link, or null when it's an ordinary web link (it then stays a plain link) */
export function answerLinkCard(href: string | undefined, children: React.ReactNode): React.ReactNode | null {
  if (!href || !/^https?:\/\//i.test(href)) return null;
  const u = urlOf(href);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, '');
  const path = u.pathname;
  const ext = (path.split('.').pop() || '').toLowerCase();

  // App links
  if (/(^|\.)canva\.com$/.test(host) && /^\/design\//.test(path)) return <CanvaLinkCard href={href}>{children}</CanvaLinkCard>;
  const sp = host === 'open.spotify.com' && path.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/);
  if (sp) return <SpotifyLinkCard href={href} kind={sp[1]!} id={sp[2]!} />;
  const yt = host === 'youtu.be' ? path.slice(1) : /youtube\.com$/.test(host) ? (u.searchParams.get('v') || path.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] || '') : '';
  if (yt && /^[\w-]{11}$/.test(yt)) return <YouTubeLinkCard href={href} id={yt} />;
  const gh = host === 'github.com' && path.match(/^\/([\w.-]+)\/([\w.-]+)\/?$/);
  if (gh && !['orgs', 'settings', 'login', 'features', 'marketplace'].includes(gh[1]!)) return <GitHubLinkCard href={href} owner={gh[1]!} repo={gh[2]!.replace(/\.git$/, '')} />;
  const gd = host === 'docs.google.com' && path.match(/^\/(document|spreadsheets|presentation|forms)\//);
  if (gd) return <GoogleLinkCard href={href} kind={gd[1] as any}>{children}</GoogleLinkCard>;
  if (host === 'drive.google.com' && /^\/(file|drive|open)/.test(path)) return <GoogleLinkCard href={href} kind="drive">{children}</GoogleLinkCard>;
  if (/(^|\.)figma\.com$/.test(host) && /^\/(file|design|proto|board)\//.test(path)) return <FigmaLinkCard href={href}>{children}</FigmaLinkCard>;
  if (/(^|\.)notion\.(so|site)$/.test(host)) return <NotionLinkCard href={href}>{children}</NotionLinkCard>;
  if ((/google\.[a-z.]+$/.test(host) && path.startsWith('/maps')) || host === 'maps.app.goo.gl') return <MapsLinkCard href={href}>{children}</MapsLinkCard>;

  // Files
  if (ext === 'pdf') return <PdfCard href={href}>{children}</PdfCard>;
  if (ext === 'pptx' || ext === 'ppt') return <OfficeCard href={href} kind="pptx">{children}</OfficeCard>;
  if (ext === 'docx' || ext === 'doc') return <OfficeCard href={href} kind="docx">{children}</OfficeCard>;
  if (ext === 'xlsx' || ext === 'xls') return <OfficeCard href={href} kind="xlsx">{children}</OfficeCard>;
  if (ext === 'csv') return <CsvCard href={href}>{children}</CsvCard>;
  if (ext === 'gif') return <ImageCard href={href} gif>{children}</ImageCard>;
  if (['png', 'jpg', 'jpeg', 'webp', 'avif'].includes(ext)) return <ImageCard href={href}>{children}</ImageCard>;
  if (['mp4', 'webm', 'mov', 'm4v'].includes(ext)) return <VideoCard href={href}>{children}</VideoCard>;
  if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext)) return <AudioCard href={href}>{children}</AudioCard>;
  if (ext === 'zip') return <ZipCard href={href}>{children}</ZipCard>;
  if (CODE.has(ext) && path.split('/').pop()!.includes('.')) return <CodeFileCard href={href} ext={ext}>{children}</CodeFileCard>;
  if (OTHER_FILES.has(ext)) return <GenericFileCard href={href} ext={ext}>{children}</GenericFileCard>;

  // Live websites made by the AI (Vercel, Netlify, GitHub Pages, Classgrid Cloud…)
  if (/\.(vercel\.app|netlify\.app|github\.io|pages\.dev|onrender\.com)$/.test(host) || /\.classgrid\.cloud$/.test(host)) return <SiteLinkCard href={href} host={host}>{children}</SiteLinkCard>;
  return null;
}
