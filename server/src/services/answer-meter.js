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
