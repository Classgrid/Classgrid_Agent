// Chat step for make_video: the action's own row, which opens to every stage of the work, listed as it happens.
//
// Until 2026-11-27 this step showed one fixed line, "Making a video...", for the minutes the work takes (owner: "you
// show 'video making' something; remove that, add every step, show it really"). Now the server says where it is
// (toolStages.ts): preparing the page, recording the frames (with the frame it is at), joining them, uploading the
// video, each still frame, the Library. The row says the stage it is at while it works; opened, each stage is a row
// with its state, and a still frame's row ends with its picture, small, which opens in the image viewer the answer's
// own pictures open in. Under the stages, what was asked and what came back, as every other step opens to.
//
// Every word of a stage is the server's. A video made before this (no stages saved) shows its row as it did.
import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/marketing_ui/spinner';
import { DocsImageViewer } from '../DocsImageViewer';
import { viewerImage } from '../viewerImage';
import { ShimmerText } from './ShimmerText';
import { describeStep } from './tool-results/describeStep';
import { ToolDetailBox, hasToolDetail } from './tool-results/ToolResultStep';
import { currentToolStage, toolStagesOf, type ToolStage } from './toolStages';

type Step = { id: string; tool: string; status?: string; args?: any; result?: unknown; stages?: unknown };

const GREY = 'text-slate-400 dark:text-[#6f6f6f]';

/** One stage: its state (working, done, failed), its words, how far it is or why it failed, its picture */
function StageRow({ stage, working, onOpenImage }: { stage: ToolStage; working: boolean; onOpenImage?: (e: React.MouseEvent) => void }) {
  const [broken, setBroken] = useState(false);
  const failed = stage.state === 'failed';
  return (
    <div className="flex min-w-0 items-center gap-2 py-1 text-[14px] text-slate-500 dark:text-[#8a8a8a]">
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        {working
          ? <Spinner className="size-3.5" />
          : <span className={cn('h-1.5 w-1.5 rounded-full', failed ? 'bg-red-400' : 'bg-slate-300 dark:bg-[#4a4a4a]')} />}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
        {/* (only the stage being worked on shines; the ones before it are plain, so the eye finds it at once) */}
        {working
          ? <ShimmerText active timer={false} className="min-w-0 break-words">{stage.text}</ShimmerText>
          : <span className={cn('min-w-0 break-words', failed && 'text-red-700 dark:text-[#ff7b72]')}>{stage.text}</span>}
        {stage.note && <span className={cn('min-w-0 break-words text-[13px] tabular-nums', failed ? 'text-red-600 dark:text-red-500' : GREY)}>{stage.note}</span>}
      </span>
      {stage.image && !broken && onOpenImage && (
        <button
          type="button"
          onClick={onOpenImage}
          aria-label={[stage.text, stage.note].filter(Boolean).join(' ')}
          className="h-9 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-[#2a2a2a] dark:bg-[#111]"
        >
          <img src={stage.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        </button>
      )}
    </div>
  );
}

export function MakeVideoStep({ step }: { step: Step }) {
  const loading = step.status === 'loading';
  const stages = useMemo(() => toolStagesOf(step.stages), [step.stages]);
  const result = typeof step.result === 'string' ? step.result : '';
  const failed = !loading && (step.status === 'error' || /^(error|failed)\b/i.test(result.trim()));
  // Open while the video is being made, folded once it is done; the person's own click wins
  const [openState, setOpen] = useState<boolean | null>(null);
  const hasDetail = !loading && hasToolDetail(step.args, step.result);
  const canOpen = stages.length > 0 || hasDetail;
  const open = canOpen && (openState ?? loading);
  // While it works the row says the stage it is at; done or failed, what the step always said
  const now = loading ? currentToolStage(stages) : null;
  const title = now?.text ?? describeStep(step.tool, step.args, step.result, loading ? 'loading' : failed ? 'error' : 'success') ?? '';
  // The still frames, for the image viewer (all of them in one viewer: "2 / 3")
  const images = useMemo(
    () => stages.filter((s) => s.image).map((s) => viewerImage(`stage-${s.key}`, s.image!, [s.text, s.note].filter(Boolean).join(' '))),
    [stages],
  );

  return (
    <div className="relative z-10 flex flex-col group/accordion">
      <div
        className={cn('flex items-center gap-3 rounded-lg p-1 pr-3 -ml-1 transition-colors', canOpen && 'cursor-pointer group-hover/accordion:bg-muted/30')}
        onClick={() => canOpen && setOpen(!open)}
        role={canOpen ? 'button' : undefined}
        aria-expanded={canOpen ? open : undefined}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full py-1">
          <div className={cn('h-1.5 w-1.5 rounded-full transition-colors', loading ? 'bg-muted-foreground/60 animate-pulse' : failed ? 'bg-destructive/60' : 'bg-muted-foreground/40')} />
        </div>
        <div className={cn('flex min-w-0 items-center gap-1.5 font-medium text-[14px]', failed ? 'text-red-700 dark:text-[#ff7b72]' : 'text-slate-600 dark:text-[#a3a3a3]')}>
          <Film className="size-3.5 shrink-0 text-muted-foreground" />
          <ShimmerText active={loading} className="min-w-0 break-words">{title}</ShimmerText>
          {now?.note && <span className={cn('shrink-0 font-normal tabular-nums', GREY)}>{now.note}</span>}
          {canOpen && (
            <span className="flex shrink-0 items-center justify-center opacity-50 transition-opacity group-hover/accordion:opacity-100">
              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          )}
        </div>
      </div>

      {open && (
        <div className="ml-10 mr-2 mb-2 flex flex-col gap-2">
          {stages.length > 0 && (
            <DocsImageViewer
              images={images}
              renderThumbnails={(imgs, openImage) => (
                <div className="flex max-w-[560px] flex-col">
                  {stages.map((s) => {
                    const img = imgs.find((x) => x.id === `stage-${s.key}`);
                    return <StageRow key={s.key} stage={s} working={loading && s.state === 'running'} onOpenImage={img ? (e) => openImage(img, e) : undefined} />;
                  })}
                </div>
              )}
            />
          )}
          {hasDetail && <ToolDetailBox tool={step.tool} args={step.args} result={step.result} />}
        </div>
      )}
    </div>
  );
}
