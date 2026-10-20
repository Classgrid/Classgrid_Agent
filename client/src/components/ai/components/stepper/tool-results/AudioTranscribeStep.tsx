// transcribe_audio step: the audio file with a player right away, moving sound bars and a real timer while the
// speech model works (it answers all at once, so there is no true percent to show), then the transcript typing in.
import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Music } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioTranscribeStepProps {
  args?: any;
  result?: unknown;
  status: 'loading' | 'success' | 'error';
}

const BARS = 14;

export function AudioTranscribeStep({ args, result, status }: AudioTranscribeStepProps) {
  const [open, setOpen] = useState(true);
  const fileUrl: string | undefined = typeof args?.fileUrl === 'string' && /^https?:\/\//.test(args.fileUrl) ? args.fileUrl : undefined;
  const fileName = fileUrl ? decodeURIComponent(fileUrl.split('?')[0]!.split('/').filter(Boolean).pop() ?? 'audio') : 'audio';
  const text = typeof result === 'string' ? result.trim() : '';
  const loading = status === 'loading';
  const failed = status === 'error' || /^(error|transcription failed)/i.test(text);

  // Real time spent, counted only while it runs
  const startedAt = useRef<number>(Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!loading) return;
    startedAt.current = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [loading]);

  // Type the transcript in when it arrives live; old messages show it straight away
  const wasLoading = useRef(loading);
  const [shownWords, setShownWords] = useState<number>(loading ? 0 : Infinity);
  const words = text ? text.split(/(\s+)/) : [];
  useEffect(() => {
    if (loading) { wasLoading.current = true; return; }
    if (!wasLoading.current || !text) { setShownWords(Infinity); return; }
    wasLoading.current = false;
    setShownWords(0);
    const step = Math.max(2, Math.ceil(words.length / 120)); // about 2 seconds for any length
    const id = setInterval(() => setShownWords((n) => {
      if (n >= words.length) { clearInterval(id); return Infinity; }
      return n + step;
    }), 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, text]);
  const visible = shownWords === Infinity ? text : words.slice(0, shownWords).join('');
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="relative z-10 flex flex-col">
      <div className="flex items-center gap-3 p-1 pr-3 -ml-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className={cn('h-1.5 w-1.5 rounded-full', failed ? 'bg-red-400' : 'bg-slate-300 dark:bg-[#4a4a4a]')} />
        </div>
        <span className="font-medium text-[14px] text-slate-500 dark:text-[#8a8a8a] truncate">
          {loading ? 'Transcribing audio...' : failed ? 'Could not transcribe audio' : 'Transcribed audio'}
        </span>
      </div>

      <div className="ml-10 mr-2 mb-2 mt-0.5 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[14px] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1d1d1d] transition-colors"
          aria-expanded={open}
        >
          <span className="text-slate-400 dark:text-[#7d7d7d]">{loading ? 'Listening to' : 'Listened to'}</span>
          <span className="text-slate-800 dark:text-[#e6e6e6] truncate">{fileName}</span>
          <ChevronRight className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-90')} />
        </button>

        {open && (
          <div className="flex flex-col gap-2.5 px-3.5 pb-3">
            <div className="flex items-center gap-3 rounded-lg bg-[#f1f1ef] dark:bg-[#222222] px-3 py-2.5">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center">
                <Music className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              </div>
              {/* Sound bars: moving while the speech model listens, still when done */}
              <div className="flex h-8 items-center gap-[3px]" aria-hidden>
                {Array.from({ length: BARS }).map((_, i) => (
                  <span
                    key={i}
                    className={cn('w-[3px] rounded-full bg-slate-400 dark:bg-[#7a7a7a]', loading && 'cg-audio-bar')}
                    style={{ height: loading ? undefined : `${6 + ((i * 7) % 18)}px`, animationDelay: `${(i % 7) * 90}ms` }}
                  />
                ))}
              </div>
              <span className="ml-auto text-[12.5px] tabular-nums text-slate-500 dark:text-[#9a9a9a]">
                {loading ? `Listening… ${elapsed}s` : failed ? 'Failed' : `${wordCount.toLocaleString()} words`}
              </span>
            </div>

            {fileUrl && <audio controls preload="none" src={fileUrl} className="w-full h-9" />}

            {!loading && text && (
              <div className="rounded-lg bg-[#f1f1ef] dark:bg-[#222222] px-3 py-2.5 flex flex-col gap-1 max-h-[300px] overflow-y-auto [scrollbar-width:thin]">
                <span className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">{failed ? 'Response' : 'Transcript'}</span>
                <p className="text-[13.5px] leading-[1.6] text-slate-800 dark:text-[#e2e2e2] whitespace-pre-wrap break-words">
                  {visible}
                  {shownWords !== Infinity && <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-slate-400 animate-pulse" />}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`
        @keyframes cgAudioBar { 0%, 100% { height: 6px; } 50% { height: 26px; } }
        .cg-audio-bar { animation: cgAudioBar 0.9s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cg-audio-bar { animation: none; height: 12px; } }
      `}</style>
    </div>
  );
}
