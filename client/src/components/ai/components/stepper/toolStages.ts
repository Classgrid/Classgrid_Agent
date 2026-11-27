// The stages of a long tool (a video being made: preparing, recording, joining, uploading...), as the server reports
// them while the tool runs (server utils/tool-stages.js). Each comes as the event
//   { type: "tool_stage", tool, call, stage: { key, text, state, note?, image? } }
// and is kept in its step's `stages`; the server saves the same list with the answer, so a chat read again shows the
// same rows. The words are the server's: nothing here writes any.

export type ToolStage = {
  /** Which stage it is: a later report with the same key takes the earlier one's place */
  key: string;
  /** The row's words */
  text: string;
  state: "running" | "done" | "failed";
  /** A few more words beside the row: how far it is ("frame 300 of 1350"), or why it failed */
  note?: string;
  /** A picture of this stage (a still frame of the video), shown small at the end of the row */
  image?: string;
};

type StepLike = { type: string; tool?: string; status?: string; call?: string; stages?: ToolStage[] };

const STATES = new Set(["running", "done", "failed"]);

/** One stage as the app keeps it, or null when it is not one */
export function toolStageOf(raw: unknown): ToolStage | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.key !== "string" || !s.key || typeof s.text !== "string" || !s.text.trim() || !STATES.has(String(s.state))) return null;
  return {
    key: s.key,
    text: s.text,
    state: s.state as ToolStage["state"],
    ...(typeof s.note === "string" && s.note ? { note: s.note } : {}),
    ...(typeof s.image === "string" && /^https:\/\//i.test(s.image) ? { image: s.image } : {}),
  };
}

/** A step's stages as saved with the answer (or kept live): only real stages, in order */
export function toolStagesOf(raw: unknown): ToolStage[] {
  return Array.isArray(raw) ? raw.map(toolStageOf).filter((s): s is ToolStage => s !== null) : [];
}

/** The list with this stage in it: in the place of the one with the same key, else at the end */
export function putToolStage(stages: ToolStage[] | undefined, stage: ToolStage): ToolStage[] {
  const list = stages || [];
  const at = list.findIndex((s) => s.key === stage.key);
  return at >= 0 ? list.map((s, i) => (i === at ? stage : s)) : [...list, stage];
}

/**
 * A "tool_stage" event into an answer's steps: the stage goes to the step the event names (its `call`, the id that
 * step's tool_start carried), else to the newest running step of that tool. Returns the new steps, or null when the
 * event is not a stage or no step is waiting for it (nothing changes).
 */
export function applyToolStage<T extends StepLike>(steps: T[] | undefined, event: { tool?: unknown; call?: unknown; stage?: unknown }): T[] | null {
  const stage = toolStageOf(event?.stage);
  if (!stage || !steps?.length) return null;
  const call = typeof event.call === "string" && event.call ? event.call : "";
  let at = call ? steps.map((s) => s.type === "tool" && s.call === call).lastIndexOf(true) : -1;
  if (at < 0) at = steps.map((s) => s.type === "tool" && s.tool === event.tool && s.status === "loading").lastIndexOf(true);
  if (at < 0) return null;
  const next = [...steps];
  next[at] = { ...steps[at]!, stages: putToolStage(steps[at]!.stages, stage) };
  return next;
}

/** The stage the tool is at: the one running now, else the last one it reported */
export function currentToolStage(stages: ToolStage[]): ToolStage | null {
  return [...stages].reverse().find((s) => s.state === "running") ?? stages[stages.length - 1] ?? null;
}
