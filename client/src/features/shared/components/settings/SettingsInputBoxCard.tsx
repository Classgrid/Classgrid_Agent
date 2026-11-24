// Settings → General → Input box (the Classgrid app, Classgrid Code and the extension; owner, 2026-11-24). What
// happens to a message sent while the AI is still working: it waits in the queue until the answer has ended, or it is
// sent at once and the AI takes it in with its next step (lib/followUps.ts). The website has no such choice (it
// cannot post to a running answer), so the card is not drawn there.
import { canSendWhileWorking, useFollowUpMode, type FollowUpMode } from "@/lib/followUps";

const CHOICES: { id: FollowUpMode; name: string }[] = [
  { id: "queue", name: "Queue" },
  { id: "now", name: "Send immediately" },
];

export function SettingsInputBoxCard() {
  const [mode, setMode] = useFollowUpMode();
  if (!canSendWhileWorking()) return null;
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">Input box</h3>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-6 px-5 py-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium text-foreground">Queued messages</span>
            <span className="text-xs text-muted-foreground">
              When a message you send while the AI is working is sent. Queue: after it has finished. Send immediately: at once, and it takes your message into the work it is doing.
            </span>
          </div>
          <div role="radiogroup" aria-label="Queued messages" className="inline-flex shrink-0 rounded-full bg-black/[0.05] dark:bg-white/[0.07] p-0.5">
            {CHOICES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={mode === c.id}
                onClick={() => setMode(c.id)}
                className={`h-8 px-3 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-colors ${mode === c.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
