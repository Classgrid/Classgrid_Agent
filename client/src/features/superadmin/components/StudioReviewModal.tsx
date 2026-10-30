// Studio Mode: Review / Reject / Undo an agent answer's changes, from the buttons under each answer (the same
// checkpoints as Project Mode).
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { REVIEW_CHECKPOINT_EVENT, markCheckpoint } from "@/components/ai/components/stepper/ProjectToolSteps";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const EASE = [0.22, 1, 0.36, 1] as const;

type ReviewFile = { file: string; added: number; removed: number; kind: string; diff: string };
type Review = { sessionId: string; checkpoint: string; files: ReviewFile[] | null; open: string | null; busy: boolean };

async function api(path: string, init?: RequestInit) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function StudioReviewModal({ projectId, onChanged }: { projectId: string | null; onChanged?: () => void }) {
  const reduce = useReducedMotion();
  const [review, setReview] = useState<Review | null>(null);
  const cpPath = (r: { sessionId: string; checkpoint: string }) => `/projects/${projectId}/checkpoints/${r.sessionId}/${r.checkpoint}`;

  const loadReview = async (r: { sessionId: string; checkpoint: string }) => {
    const { res, data } = await api(cpPath(r));
    if (!res.ok) { toast.error(data.error || "Could not load the changes"); setReview(null); return; }
    setReview({ ...r, files: data.files || [], open: null, busy: false });
  };

  useEffect(() => {
    const onReview = async (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (!projectId || !d?.checkpoint) return;
      if (d.mode === "undo") {
        if (!window.confirm("Put the project back to how it was before this answer? Changes made after it are undone too.")) return;
        const { res, data } = await api(`${cpPath(d)}/undo`, { method: "POST", body: "{}" });
        if (res.ok) { markCheckpoint(d.checkpoint, { status: "undone" }); toast.success(`Undone: ${data.reverted} file${data.reverted === 1 ? "" : "s"} put back`); onChanged?.(); }
        else toast.error(data.error || "Could not undo");
        return;
      }
      setReview({ sessionId: d.sessionId, checkpoint: d.checkpoint, files: null, open: null, busy: false });
      loadReview(d);
    };
    window.addEventListener(REVIEW_CHECKPOINT_EVENT, onReview);
    return () => window.removeEventListener(REVIEW_CHECKPOINT_EVENT, onReview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const rejectChanges = async (file?: string) => {
    if (!review) return;
    if (!window.confirm(file ? `Throw away the agent's changes to ${file}?` : "Throw away all of this answer's changes?")) return;
    setReview({ ...review, busy: true });
    const { res, data } = await api(`${cpPath(review)}/reject`, { method: "POST", body: JSON.stringify({ file }) });
    if (res.ok) {
      markCheckpoint(review.checkpoint, file ? { rejectedFiles: [file] } : { status: "rejected" });
      toast.success(file ? `${file} put back` : `Rejected: ${data.reverted} file${data.reverted === 1 ? "" : "s"} put back`);
      onChanged?.();
      if (!file) { setReview(null); return; }
    } else toast.error(data.error || "Could not reject the changes");
    loadReview(review);
  };

  const btn = "h-8 px-3 rounded-md text-[13px] transition-[background-color,opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";

  return (
    <AnimatePresence>
      {review && (
        <motion.div
          key="review"
          className="fixed inset-0 z-[130] bg-black/50 flex items-center justify-center p-4"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.15 }}
          onClick={() => setReview(null)}
        >
          <motion.div
            className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden"
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/10 dark:border-white/[0.08]">
              <h2 className="text-[15px] font-medium">Review changes</h2>
              {review.files && (
                <span className="text-[13px] text-muted-foreground">
                  {review.files.length} file{review.files.length === 1 ? "" : "s"}
                  <span className="ml-2 text-[#16825d] dark:text-[#4ec9b0]">+{review.files.reduce((n, f) => n + f.added, 0)}</span>
                  <span className="ml-1 text-[#cd3131] dark:text-[#f48771]">-{review.files.reduce((n, f) => n + f.removed, 0)}</span>
                </span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button disabled={review.busy || !review.files?.length} onClick={() => rejectChanges()} className={`${btn} border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`}>Reject all</button>
                <button onClick={() => { markCheckpoint(review.checkpoint, { status: "kept" }); setReview(null); toast.success("Changes kept"); }} className={`${btn} bg-foreground text-background font-medium hover:opacity-90`}>Accept all</button>
                <button onClick={() => setReview(null)} className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06]" aria-label="Close"><X className="size-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {review.files === null ? (
                <div className="px-5 py-5 flex flex-col gap-2">
                  {[70, 50, 60].map((w, i) => <div key={i} className="h-4 rounded bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" style={{ width: `${w}%` }} />)}
                </div>
              ) : review.files.length === 0 ? (
                <p className="px-5 py-8 text-[13px] text-muted-foreground">No changes left from this answer.</p>
              ) : review.files.map((f) => (
                <div key={f.file} className="border-b border-black/10 dark:border-white/[0.08] last:border-b-0">
                  <div className="flex items-center gap-2 px-5 py-2.5">
                    <button onClick={() => setReview({ ...review, open: review.open === f.file ? null : f.file })} className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] hover:text-foreground">
                      <span className="truncate font-medium">{f.file}</span>
                      <span className="shrink-0 text-[12px] text-muted-foreground">{f.kind}</span>
                      <span className="shrink-0 text-[12px] text-[#16825d] dark:text-[#4ec9b0]">+{f.added}</span>
                      <span className="shrink-0 text-[12px] text-[#cd3131] dark:text-[#f48771]">-{f.removed}</span>
                    </button>
                    <button disabled={review.busy} onClick={() => rejectChanges(f.file)} className={`${btn} h-7 px-2.5 text-[12px] border border-black/10 dark:border-white/10 hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`}>Reject</button>
                  </div>
                  <AnimatePresence initial={false}>
                    {review.open === f.file && (
                      <motion.div
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <pre className="mx-5 mb-3 max-h-[45vh] overflow-auto rounded-lg border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] font-mono text-[12px] leading-5">
                          {f.diff.split("\n").filter((l) => !/^(diff --git|index |--- |\+\+\+ )/.test(l)).map((l, i) => (
                            <div key={i} className={l.startsWith("+") ? "px-3 bg-[#16825d]/10 text-[#16825d] dark:text-[#4ec9b0]" : l.startsWith("-") ? "px-3 bg-[#cd3131]/10 text-[#cd3131] dark:text-[#f48771]" : l.startsWith("@@") ? "px-3 text-muted-foreground" : "px-3"}>{l || " "}</div>
                          ))}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
