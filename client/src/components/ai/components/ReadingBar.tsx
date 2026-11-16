import { useEffect, useState, type CSSProperties } from "react";
import { Pause, Play, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ANSWER_FEEDBACK_ASK,
  ANSWER_FEEDBACK_SET,
  type AnswerFeedback,
  clockTime,
  closeReading,
  nextReadingSpeed,
  pauseReading,
  replayReading,
  resumeReading,
  seekReading,
  setReadingSpeed,
  speedLabel,
  useReading,
} from "../reading";

const savedFeedback = (messageId: string): AnswerFeedback => {
  try {
    const saved = JSON.parse(localStorage.getItem(`classgrid:ai-feedback:${messageId}`) || "null");
    return saved?.feedback === "up" || saved?.feedback === "down" ? saved.feedback : null;
  } catch {
    return null;
  }
};

const SEEK_SECONDS = 15;

/**
 * The round arrow of the phone app's player: turning back (counter-clockwise) or forward, with the seconds it moves
 * written inside; with no number it is the "play again" arrow.
 */
function TurnIcon({ forward, label, size = 26 }: { forward?: boolean; label?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={forward ? "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" : "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"} />
      <path d={forward ? "M21 3v5h-5" : "M3 3v5h5"} />
      {label ? (
        <text x={12} y={15} textAnchor="middle" fontSize={7.6} fontWeight={700} fill="currentColor" stroke="none">
          {label}
        </text>
      ) : null}
    </svg>
  );
}

const SQUARE = "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-black/[0.06] dark:bg-white/[0.09] text-foreground transition-colors cursor-pointer hover:bg-black/[0.1] dark:hover:bg-white/[0.14] disabled:cursor-default disabled:opacity-50";
const TURN = "flex h-[34px] w-8 shrink-0 items-center justify-center rounded-[10px] text-foreground transition-colors cursor-pointer hover:bg-black/[0.06] dark:hover:bg-white/[0.09] disabled:cursor-default disabled:opacity-50";

/**
 * The read aloud player, above the chat box while an answer is being read: the same bar as the phone app's
 * (owner, 2026-11-16). A square pause / play button, the time, the two round arrows that go back and forward 15
 * seconds, the speed, a square close button, and under them a thin line that fills as the reading goes (its ends
 * are inside the bar, never cut by a corner). At the end the first button is the "play again" arrow, and the
 * arrows and the speed give way to thumbs up and thumbs down for the answer.
 */
export function ReadingBar({ className }: { className?: string }) {
  const reading = useReading();
  const messageId = reading?.messageId || "";
  // The answer's mark: what its own row last told, or what was saved for it
  const [told, setTold] = useState<{ messageId: string; feedback: AnswerFeedback } | null>(null);
  const feedback = !messageId ? null : told?.messageId === messageId ? told.feedback : savedFeedback(messageId);

  useEffect(() => {
    const onSet = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (typeof detail?.messageId === "string") setTold({ messageId: detail.messageId, feedback: detail.feedback ?? null });
    };
    window.addEventListener(ANSWER_FEEDBACK_SET, onSet);
    return () => window.removeEventListener(ANSWER_FEEDBACK_SET, onSet);
  }, []);

  if (!reading) return null;

  const { phase, positionMs, durationMs, complete, speed } = reading;
  const loading = phase === "loading";
  const ended = phase === "ended";
  const part = durationMs > 0 ? Math.max(0, Math.min(1, positionMs / durationMs)) : 0;
  // The whole length is shown once every sentence has arrived; before that only how far it has been heard
  const time = complete ? `${clockTime(positionMs)} / ${clockTime(durationMs)}` : clockTime(positionMs);
  const ask = (type: "up" | "down") => window.dispatchEvent(new CustomEvent(ANSWER_FEEDBACK_ASK, { detail: { messageId, type } }));

  return (
    <div
      role="group"
      aria-label="Read aloud player"
      className={cn("rounded-2xl border border-border !bg-white dark:!bg-[#0f0f0f] shadow-sm px-3 pt-2.5 pb-3", className)}
    >
      <div className="flex items-center gap-2 pb-2.5">
        {ended ? (
          <button type="button" onClick={replayReading} className={SQUARE} title="Play again" aria-label="Play again">
            <TurnIcon size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={phase === "playing" ? pauseReading : resumeReading}
            disabled={loading}
            className={SQUARE}
            title={loading ? "Getting the voice" : phase === "playing" ? "Pause" : "Play"}
            aria-label={loading ? "Getting the voice" : phase === "playing" ? "Pause" : "Play"}
          >
            {phase === "playing" || loading ? <Pause className="h-[17px] w-[17px]" /> : <Play className="h-[17px] w-[17px]" />}
          </button>
        )}
        <span className="ml-1 text-[14px] leading-[19px] tabular-nums text-muted-foreground">{loading ? "Getting the voice" : time}</span>
        <div className="flex-1" />
        {ended ? (
          <>
            <button
              type="button"
              onClick={() => ask("up")}
              className={cn(SQUARE, feedback === "up" && "!bg-foreground !text-background")}
              title="Helpful"
              aria-label="Helpful"
              aria-pressed={feedback === "up"}
            >
              <ThumbsUp className="h-[17px] w-[17px]" />
            </button>
            <button
              type="button"
              onClick={() => ask("down")}
              className={cn(SQUARE, feedback === "down" && "!bg-foreground !text-background")}
              title="Not helpful"
              aria-label="Not helpful"
              aria-pressed={feedback === "down"}
            >
              <ThumbsDown className="h-[17px] w-[17px]" />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => seekReading(-SEEK_SECONDS)} disabled={loading} className={TURN} title="Back 15 seconds" aria-label="Back 15 seconds">
              <TurnIcon label="15" />
            </button>
            <button type="button" onClick={() => seekReading(SEEK_SECONDS)} disabled={loading} className={TURN} title="Forward 15 seconds" aria-label="Forward 15 seconds">
              <TurnIcon forward label="15" />
            </button>
            <button
              type="button"
              onClick={() => setReadingSpeed(nextReadingSpeed(speed))}
              className={cn(SQUARE, "w-auto min-w-[58px] px-2.5 text-[13.5px] font-semibold leading-[18px] tabular-nums")}
              title="Speed"
              aria-label={`Speed ${speedLabel(speed)}`}
            >
              {speedLabel(speed)}
            </button>
          </>
        )}
        <button type="button" onClick={closeReading} className={SQUARE} title="Stop reading and close" aria-label="Stop reading and close">
          <X className="h-[17px] w-[17px]" />
        </button>
      </div>
      <div className="h-[3px] overflow-hidden rounded-full bg-black/[0.08] dark:bg-white/[0.12]">
        <div className="h-[3px] w-[var(--heard)] rounded-full bg-foreground" style={{ "--heard": `${Math.round(part * 1000) / 10}%` } as CSSProperties} />
      </div>
    </div>
  );
}
