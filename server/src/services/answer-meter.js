// What one answer may use of the user's credits, round by round, in real numbers only (the provider's own usage).
// The live meter of an answer is { spent, spendable, stopped, firstRoundDone }: spendable is what the user had left
// when the answer started (undefined = no limit), spent is the real cost of the rounds so far.
//
// The rule (owner, 2026-11-16: "usage never went to 100 percent, at 93-97 it shows limit reached"): a message is
// allowed to start whenever anything is left, and a message that started is answered like any other message. So the
// answer's own first round is a normal round: it is never cut for its input and what it may write is not cut to the
// credits left (cut to 2,000 tokens, an answer with thinking could end with no words at all). Before this, the
// server guessed a message's cost before it ran and refused it when the guess was more than what was left (the last
// 3 to 7 percent of a limit could never be used), and a Claude message whose real input cost more than what was
// left was cut before a word was written and still charged. Every round after the first, and every helper, may use
// only what is really left; with nothing left the answer stops. What an answer uses past the limit is not charged
// (the deduction stops at the limit), so the bar ends at 100 percent and the next message is refused.

/** What one normal round may write (real output tokens): the first round of an answer always has this room. */
export const FIRST_ROUND_OUTPUT = 8192;

/** Whether this is the answer's own first round (`who` is "Agent" for the answer itself, a name for a helper). */
export const isFirstRound = (meter, who = "Agent") => who === "Agent" && !meter.firstRoundDone;

const left = (meter) => (meter.spendable === undefined ? undefined : meter.spendable - meter.spent);

/** One round's real usage was reported: it is added, and the answer's first round is over. */
export function addRound(meter, who, cost, cut = false) {
    meter.spent += cost;
    if (who === "Agent") meter.firstRoundDone = true;
    if (cut) meter.stopped = true;
}

/** The credits left for the next round (undefined = no limit). The first round always has room to start. */
export function roundTokensLeft(meter, who = "Agent") {
    const l = left(meter);
    if (l === undefined) return undefined;
    return isFirstRound(meter, who) ? Math.max(l, 1) : l;
}

/**
 * The most the next round may write, in real output tokens (`outputWeight`: credits per output token of its model);
 * undefined = no cap from the credits (no limit, or the answer's first round, which is a normal round).
 */
export function roundMaxOutput(meter, who, outputWeight) {
    const l = left(meter);
    if (l === undefined || isFirstRound(meter, who)) return undefined;
    return Math.max(0, l) / outputWeight;
}

/** Whether a round's real input alone (`cost`, in credits) uses up what is left. Never for the first round. */
export function roundInputTooBig(meter, who, cost) {
    if (meter.spendable === undefined || isFirstRound(meter, who)) return false;
    return meter.spent + cost >= meter.spendable;
}

/**
 * The output room the streams are given for the whole answer (they continue a cut answer only inside it, and the
 * Claude stream never lets a round write more than it): never less than one normal round, so the first round is
 * not squeezed when little is left.
 */
export const answerOutputRoom = (spendable) => (spendable === undefined ? undefined : Math.max(spendable, FIRST_ROUND_OUTPUT));

// Past the plan's weekly Claude credits in the middle of an answer (owner, 2026-11-17: five helpers writing programs
// on Claude all stopped when the week's Claude credits ran out under them, with 45 crore gifted credits unused; "fix
// that so it starts in the middle"). An answer on the plan's Claude credits used to stop there; the switch to the
// person's own credits was made only when a message started. Now the meter knows, from the start, what the person's
// credits hold (meter.afterPool); when what is left of the Claude credits is about to stop a round, the credits are
// added to what the answer may use, once, and it goes on. What is used past the Claude credits is charged to the
// credits (splitPoolCharge), never to the Claude credits.

/**
 * Before a round: if fewer than `need` credits are left and the person's own credits can carry the answer on, they
 * are added to what it may use (once per answer). Returns true when that happened now.
 */
export function spillPastPool(meter, need = 1) {
    if (!(meter.afterPool > 0) || meter.pastPool || meter.spendable === undefined) return false;
    if (meter.spendable - meter.spent >= need) return false;
    meter.spendable += meter.afterPool;
    meter.pastPool = true;
    return true;
}

/**
 * A Claude answer on the plan's Claude credits is inside the plan's session limit and weekly limit too (owner,
 * 2026-11-21: "session limit and weekly limit are for every model; the Claude limit is only a cap inside them").
 * `poolLeft`: what is left of the plan's weekly Claude credits, or of Fable's share (undefined = no end to them).
 * `planCheck`: the usage check of the person (hasEnoughTokens). One of:
 *   { refuse: planCheck }             the session or the week is used up and the person has no credits
 *   { onCredits: source, spendable }  the session or the week is used up: the person's credits pay for this answer
 *   { room }                          what this answer may use of the plan: the smaller of what the Claude credits
 *                                     and the session and week still have (undefined = no limit at all)
 */
export function claudeInsidePlan(poolLeft, planCheck) {
    if (!planCheck?.allowed) return { refuse: planCheck || { allowed: false, reason: "Insufficient tokens." } };
    if (planCheck.source !== "weekly_free") return { onCredits: planCheck.source, spendable: planCheck.spendable ?? planCheck.remaining };
    const planLeft = planCheck.planLeft ?? planCheck.remaining;
    const room = Math.min(poolLeft === undefined ? Infinity : poolLeft, planLeft === undefined ? Infinity : planLeft);
    return { room: Number.isFinite(room) ? Math.max(1, room) : undefined };
}

/**
 * A Claude cost, split into what the plan's Claude credits still cover (`room`; undefined = no end to them) and what
 * is past them (paid from the person's credits).
 */
export function splitPoolCharge(room, cost) {
    const c = Math.max(0, Number(cost) || 0);
    if (room === undefined) return { toPool: c, past: 0 };
    const toPool = Math.min(c, Math.max(0, room));
    return { toPool, past: c - toPool };
}
