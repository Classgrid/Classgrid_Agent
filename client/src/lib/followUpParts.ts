// The parts of "a message sent while the AI works" that need nothing from the app (no React, no network), so they
// can be checked on their own (server/tests/follow-up-parts.test.mjs). The rest, and the story, is lib/followUps.ts.

/** A message that waits for the running answer's next step */
export type SentNote = { id: string; text: string };

/** Only plain words can join a running answer */
export function plainFollowUp(m: { text: string; files?: number; pasted?: number; codeNotes?: number }): boolean {
  const text = String(m.text || "").trim();
  if (!text || text.startsWith("/")) return false;
  return !(m.files || m.pasted || m.codeNotes);
}

/** Every message that waited goes out as one message, in the order they were sent */
export const combinedNotes = (notes: SentNote[]): string => notes.map((n) => n.text.trim()).filter(Boolean).join("\n\n");

/** The step an answer keeps for a message the person sent while it worked (the server saves the same one) */
export const USER_NOTE_TOOL = "user_message";
type StepLike = { id: string; type: string; tool?: string; args?: any };
export const isUserNoteStep = (s: StepLike | null | undefined): boolean => !!s && s.type === "tool" && s.tool === USER_NOTE_TOOL && typeof s.args?.message === "string";

/**
 * An answer's steps and thinking, cut where the person's messages came in: each part is the work up to a message
 * (`said`), the last part the work after the last one. The chat draws work, message, work, message, work, the way it
 * happened. `thoughtAt` on a message's step is how much of the thinking was written when it was read.
 * An answer with no such message is one part with everything (drawn as before).
 */
export function partsAtUserNotes<S extends StepLike>(steps: S[] | undefined, thought: string | undefined): { steps: S[]; thought: string; said?: string; saidId?: string }[] {
  const all = steps || [];
  const whole = String(thought || "");
  if (!all.some(isUserNoteStep)) return [{ steps: all, thought: whole }];
  const parts: { steps: S[]; thought: string; said?: string; saidId?: string }[] = [];
  let work: S[] = [];
  let from = 0;
  for (const s of all) {
    if (!isUserNoteStep(s)) { work.push(s); continue; }
    const at = Math.max(from, Math.min(whole.length, Number.isFinite(Number(s.args?.thoughtAt)) ? Number(s.args.thoughtAt) : whole.length));
    parts.push({ steps: work, thought: whole.slice(from, at), said: String(s.args.message), saidId: s.id });
    work = [];
    from = at;
  }
  parts.push({ steps: work, thought: whole.slice(from) });
  return parts;
}
