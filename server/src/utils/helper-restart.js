// Starting the SAME helper again (owner, 2026-11-24: "when a helper gets stopped, by a mistake, the internet or
// anything else, the main agent can't restart it... it should restart the same one, not start a new one").
//
// A helper that stopped before it finished (a model problem, the connection to the person's computer, the person's
// usage) was gone for good: the main AI could only start a new helper with a new number, which knew nothing of what
// the first one had done, and after a stop for usage it was even told "do not start this helper or any other again"
// (it answered "I can't restart it right now").
//
// Now the main AI names the helper in run_project_helpers ({ restart_helper: 2 }) and that helper works again: the
// same number, the same card in the Agent map, the same task, tools and model, and it goes on from where it stopped.
// - Its conversation is kept after every finished round (h.saved, set from the model loop's onConversation), so it
//   really carries on: every file it read and every result is still in front of it, with one note at the end saying
//   that it was stopped and is started again (resumeFrom).
// - When there is no kept conversation (it stopped before its first round ended, or the kept one is in a shape the
//   model it runs on now cannot take), it gets its task and a record of its steps instead (carryText).
// A stopped helper stays on the chat's board for RESTART_KEEP_MS, so it can be started again after other helpers
// were started meanwhile.

/** How long a helper that stopped before it finished can be started again */
export const RESTART_KEEP_MS = 2 * 60 * 60 * 1000;
/** How many such helpers a chat keeps */
export const RESTART_KEEP = 5;

const short = (text, max) => { const t = String(text ?? ""); return t.length > max ? `${t.slice(0, max)}…` : t; };

/**
 * The helpers that stay on the board when new ones are started: the working ones, the ones whose report the main AI
 * has not read, and the newest ones that stopped before they finished (so they can be started again).
 */
export function keptHelpers(helpers, now = Date.now()) {
    const stopped = helpers.filter((h) => h.state === "failed" && h.reportTaken && now - (h.endedAt || 0) < RESTART_KEEP_MS).slice(-RESTART_KEEP);
    return helpers.filter((h) => h.state === "running" || !h.reportTaken || stopped.includes(h));
}

/** A helper that ended long ago no longer keeps its conversation (it can still be started again from its steps) */
export function forgetOldWork(helpers, now = Date.now()) {
    for (const h of helpers) if (h.state !== "running" && h.saved && now - (h.endedAt || 0) >= RESTART_KEEP_MS) delete h.saved;
}

/** The helper the main AI wants started again: { helper } or { error } (the tool's answer) */
export function helperToRestart(helpers, no) {
    const h = helpers.find((x) => x.no === Number(no));
    if (!h) return { error: `Error: there is no Helper ${no} in this chat to start again${helpers.length ? ` (the helpers here: ${helpers.map((x) => x.no).join(", ")})` : ""}. Start a new helper with a task instead, and put into the task what was already done.` };
    if (h.state === "running") return { error: `Error: Helper ${h.no} is still working, so it is not started again. Send it a message with message_helper.` };
    return { helper: h };
}

/** What the main AI is told with the report of a helper that stopped before it finished (not shown to the person) */
export const restartHint = (no) => `\n\n[Helper ${no} keeps everything it did. Unless the user asked to stop it, start this same helper again yourself, without asking: run_project_helpers with helpers: [{ restart_helper: ${no} }] (add task only to tell it something new). It carries on from where it stopped. If it stops the same way again, do not start it a third time in this turn: tell the user what stopped it.]`;

/** The same, for a helper the person's usage stopped */
export const limitRestartHint = (no) => `\n\n[Helper ${no} keeps everything it did. When you read this in a turn of yours, the person's usage may be back (the limit came back, or credits were added): start this same helper again with run_project_helpers, helpers: [{ restart_helper: ${no} }]. It carries on from where it stopped. If that is refused, or it stops the same way again, do not try again in this turn: tell the user plainly that their usage ran out and this part is not finished.]`;

/** The tool's answer when a helper the usage stopped cannot be started again yet. when: "25 Nov, 12:38 am (India time)" or "" */
export const stillUsedUpText = (no, when = "") => `Error: Helper ${no} was not started again: the person's usage is still used up${when ? `, and it comes back on ${when}` : ""}. Do not try again in this turn. Tell the user plainly that their usage ran out${when ? " and when it comes back" : ""}, and that this part is not finished.`;

/** What the helper reads when it goes on. Called before the helper's record is cleared for the new run. */
export function restartNote(h, said = "") {
    const how = h.state === "done"
        ? "You had written your report"
        : `You were stopped before the work was finished${h.limitStop ? ", because the person's usage ran out at that moment" : " (a problem with the model or the connection, not something you did)"}`;
    const words = String(said || "").trim();
    return `[${how}. The main AI has started you again now. Carry on from where you stopped: everything you did before is above. Do not do again what is already done; check a result again only where you are not sure it was saved. When you are done, write your full report.${words ? `\n\nThe main AI says: ${words}` : ""}]`;
}

/** The record of its steps, for a helper that goes on without its kept conversation */
export function carryText(h, said = "") {
    const steps = (h.steps || []).filter((s) => s?.tool && s.tool !== "main_message");
    let record = steps.map((s, i) => `${i + 1}. ${s.tool} ${short(JSON.stringify(s.args ?? {}), 300)} -> ${short(s.result ?? "(no result)", 400)}`).join("\n");
    if (record.length > 24000) record = `(the first steps are left out)\n${record.slice(-24000)}`;
    const files = [...(h.changes || [])].map(([path, c]) => `${path} (+${c.added} -${c.removed})`);
    const wrote = String(h.state === "done" ? h.report : h.live || "").trim().slice(-6000);
    const words = String(said || "").trim();
    return `[You are started again: this job stopped before it was finished${h.limitStop ? ", because the person's usage ran out at that moment" : ""}. You do not have your earlier conversation, only this record of it.`
        + `${record ? `\n\nYour steps so far (${steps.length}):\n${record}` : "\n\nYou had not finished a step yet."}`
        + `${files.length ? `\n\nFiles you changed: ${files.join(", ")}` : ""}`
        + `${wrote ? `\n\nWhat you had written when you stopped:\n${wrote}` : ""}`
        + `\n\nFirst check what of this is really there, then carry on from there. Do not do again what is already done.${words ? `\n\nThe main AI says: ${words}` : ""}]`;
}

/**
 * The kept conversation with the note at its end, as the options the model loop goes on from (resumeProvider,
 * resumeConversation). shape: "claude" or "cf", the loop the helper runs on now. toClaude(conversation): turns a
 * conversation kept in the other loop's shape into Claude's. null when there is nothing it can go on from.
 */
export function resumeFrom(saved, shape, note, toClaude = null) {
    if (!saved || !Array.isArray(saved.conversation) || !saved.conversation.length) return null;
    let conversation = saved.conversation;
    if (saved.shape !== shape) {
        // (a conversation in Claude's shape cannot be handed to another model)
        if (shape !== "claude" || saved.shape !== "cf" || typeof toClaude !== "function") return null;
        try { conversation = toClaude(conversation); } catch { return null; }
        if (!Array.isArray(conversation) || !conversation.length) return null;
    }
    if (shape === "claude") {
        // (Claude's results of a round are one user message of blocks: the note is one more block of it)
        const last = conversation[conversation.length - 1];
        if (last?.role === "user" && Array.isArray(last.content)) {
            return { resumeProvider: "claude", resumeConversation: [...conversation.slice(0, -1), { ...last, content: [...last.content, { type: "text", text: note }] }] };
        }
        return { resumeProvider: "claude", resumeConversation: [...conversation, { role: "user", content: [{ type: "text", text: note }] }] };
    }
    return { resumeProvider: "cf", resumeConversation: [...conversation, { role: "user", content: note }] };
}

/**
 * Makes a stopped helper a working one again, in place (the same record on the board). said: the main AI's words
 * for it. What it carries on with is worked out first, from its record as it stopped (h.again).
 */
export function reviveHelper(h, { said = "", now = Date.now() } = {}) {
    h.again = { note: restartNote(h, said), text: carryText(h, said) };
    h.restarts = (h.restarts || 0) + 1;
    h.restartedAt = now;
    h.state = "running";
    h.endedAt = null;
    h.report = "";
    h.mainNote = "";
    h.reportTaken = false;
    h.reportTold = false;
    h.limitStop = false;
    h.live = "";
    h.inbox = [];
    h.jobsDone = [];
    h.waitingForMain = false;
    h.quiet = false;
    h.abort = new AbortController();
    return h;
}
