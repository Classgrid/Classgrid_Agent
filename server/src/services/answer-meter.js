// What one answer may use of the user's credits, round by round, in real numbers only (the provider's own usage).
// The live meter of an answer is { spent, spendable, stopped, firstRoundDone }: spendable is what the user had left
// when the answer started (undefined = no limit), spent is the real cost of the rounds so far.
//
// The rule (owner, 2026-11-16: "usage never went to 100 percent, at 93-97 it shows limit reached"): a message is
// allowed to start whenever anything is left, and a message that started always gets its answer. So the answer's own
// first round is never cut for its input and may write a normal reply, even when less than that is left. Before
// this, the server guessed a message's cost before it ran and refused it when the guess was more than what was
// left (the last 3 to 7 percent of a limit could never be used), and a Claude message whose real input cost more
// than what was left was cut before a word was written and still charged. Every round after the first, and every
// helper, may use only what is really left; with nothing left the answer stops. What an answer uses past the limit
// is not charged (the deduction stops at the limit), so the bar ends at 100 percent and the next message is refused.

/** What the first round of an answer may always write (real output tokens), when less than this is left. */
export const REPLY_TOKEN_ALLOWANCE = 2000;

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

/** The most the next round may write, in real output tokens (`outputWeight`: credits per output token of its model). */
export function roundMaxOutput(meter, who, outputWeight) {
    const l = left(meter);
    if (l === undefined) return undefined;
    const room = Math.max(0, l) / outputWeight;
    return isFirstRound(meter, who) ? Math.max(room, REPLY_TOKEN_ALLOWANCE) : room;
}

/** Whether a round's real input alone (`cost`, in credits) uses up what is left. Never for the first round. */
export function roundInputTooBig(meter, who, cost) {
    if (meter.spendable === undefined || isFirstRound(meter, who)) return false;
    return meter.spent + cost >= meter.spendable;
}
