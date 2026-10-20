// analyze_image / view_image steps, shown like claude.ai's "Read sheet.png": the usual step line, and under it a
// card with the image the AI is looking at — visible right away while it is still analysing (live, like run_code),
// then the answer once it arrives.
import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskSecretsInText } from './primitives';

interface ImageReadStepProps {
  tool: string;
  args?: any;
  result?: unknown;
  status: 'loading' | 'success' | 'error';
  text: React.ReactNode;
}

const mimeFor = (path: string) => {
  const ext = path.split('?')[0]!.split('.').pop()?.toLowerCase();
  return ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/png';
};

/** view_image returns { text, images: [{ data: <base64> }] }; analyze_image returns "VISION AI ANSWER:\n…" */
function readResult(result: unknown): { answer: string; images: string[] } {
  // The result may arrive as a JSON string of that object
  if (typeof result === 'string' && result.trim().startsWith('{')) {
    try { result = JSON.parse(result); } catch { /* plain text */ }
  }
  if (result && typeof result === 'object') {
    const r = result as any;
    const images = Array.isArray(r.images) ? r.images.map((i: any) => i?.data).filter((d: any) => typeof d === 'string' && d.length > 100) : [];
    return { answer: typeof r.text === 'string' ? r.text : '', images };
  }
  return { answer: typeof result === 'string' ? result.replace(/^\s*VISION AI ANSWER:\s*/i, '') : '', images: [] };
}

export function ImageReadStep({ tool, args, result, status, text }: ImageReadStepProps) {
  const [open, setOpen] = useState(true);
  const [broken, setBroken] = useState(false);
  const url: string | undefined = typeof args?.url === 'string' && /^https?:\/\//.test(args.url) ? args.url : undefined;
  const path: string = String(args?.sandboxFilePath ?? url ?? '');
  const fileName = decodeURIComponent(path.split('?')[0]!.split('/').filter(Boolean).pop() ?? 'image');
  const { answer, images } = readResult(result);
  // Uploads (upload_sandbox_file_to_cdn): the picture is the public CDN link in the result
  const isUpload = /upload/.test(tool);
  const uploadedUrl = isUpload ? answer.match(/https?:\/\/[^\s"')]+/)?.[0] : undefined;
  const src = url ?? uploadedUrl ?? (images[0] ? `data:${mimeFor(path)};base64,${images[0]}` : undefined);
  const loading = status === 'loading';
  const verb = isUpload ? (loading ? 'Uploading' : 'Uploaded') : 'Read';
  const failed = status === 'error' || /^(error|failed)/i.test(answer.trim());

  return (
    <div className="relative z-10 flex flex-col">
      <div className="flex items-center gap-3 p-1 pr-3 -ml-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className={cn('h-1.5 w-1.5 rounded-full', failed ? 'bg-red-400' : 'bg-slate-300 dark:bg-[#4a4a4a]')} />
        </div>
        <span className="font-medium text-[14px] text-slate-500 dark:text-[#8a8a8a] truncate">{text}</span>
      </div>

      <div className="ml-10 mr-2 mb-2 mt-0.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[14px] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1d1d1d] transition-colors"
          aria-expanded={open}
        >
          <span className="text-slate-400 dark:text-[#7d7d7d]">{verb}</span>
          <span className="text-slate-800 dark:text-[#e6e6e6] truncate">{fileName}</span>
          <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-90')} />
        </button>

        {open && (
          <div className="flex flex-col gap-2.5 px-3.5 pb-3">
            {src && !broken ? (
              <a href={url ?? src} target="_blank" rel="noopener noreferrer" className="block w-fit max-w-full" onClick={(e) => e.stopPropagation()}>
                <img
                  src={src}
                  alt={fileName}
                  onError={() => setBroken(true)}
                  className={cn('max-h-[280px] max-w-full rounded-lg border border-slate-200 dark:border-[#2a2a2a] object-contain bg-slate-50 dark:bg-[#111]', loading && 'animate-pulse')}
                />
              </a>
            ) : (
              <div className="flex h-24 w-40 items-center justify-center rounded-lg bg-slate-100 dark:bg-[#222] text-[12.5px] text-slate-400 dark:text-[#7d7d7d]">
                {loading ? (isUpload ? 'Uploading…' : 'Opening image…') : 'Image not available'}
              </div>
            )}
            {args?.question && <span className="text-[13px] text-slate-500 dark:text-[#9a9a9a]">{String(args.question)}</span>}
            {loading ? (
              <span className="text-[13px] text-slate-400 dark:text-[#7d7d7d] animate-pulse">{isUpload ? 'Uploading the image…' : 'Looking at the image…'}</span>
            ) : answer ? (
              <div className="rounded-lg bg-[#f1f1ef] dark:bg-[#222222] px-3 py-2.5 flex flex-col gap-1 max-h-[300px] overflow-y-auto [scrollbar-width:thin]">
                <span className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">Response</span>
                <p className="text-[13.5px] leading-[1.55] text-slate-800 dark:text-[#e2e2e2] whitespace-pre-wrap break-words">{maskSecretsInText(answer)}</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
