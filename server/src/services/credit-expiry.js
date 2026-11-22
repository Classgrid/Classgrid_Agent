// Adding credits to a pool that may already have expired (2026-11-21, owner: "fix all").
//
// A person has two pools of credits on User.ai_tokens, bought (top-ups) and gifted, and each pool has ONE end date.
// Everything that reads a pool counts it as 0 once its end date has passed, but the stored balance stays as it was.
// Before this file a new top-up or a new gift did `$inc` on that stored balance and wrote a new end date, so credits
// that had already expired came back to life with the new ones. The rule now, the same for both pools:
//   - the stored end date has passed when the credits are added: the old balance is gone, the balance becomes exactly
//     the new credits and the pool starts again (new start date, new end date)
//   - the pool has not expired (end date now or later, or no end date stored): the credits are added to the balance,
//     as before
//   - an amount that is not a number above zero is refused: nothing is changed
// "Expired" means the same here as where the pools are read (creditsAvailable and hasEnoughTokens in
// ai-credits.service.js): end date < now. A pool that ends exactly now is still alive.
//
// This file imports nothing, so the rule can be tested without a database (tests/credit-expiry.test.mjs). The model is
// handed in by the caller.

// The fields of each pool on the User document
export const POOLS = {
    bought: {
        balance: "ai_tokens.ai_credits_balance",
        total: "ai_tokens.total_ai_credits_purchased",
        start: "ai_tokens.ai_credits_start_date",
        end: "ai_tokens.ai_credits_end_date",
    },
    gifted: {
        balance: "ai_tokens.promotion_credits_balance",
        total: "ai_tokens.total_promotion_credits_granted",
        start: "ai_tokens.promotion_credits_start_date",
        end: "ai_tokens.promotion_credits_end_date",
    },
};

const ms = (when) => (when instanceof Date ? when.getTime() : new Date(when).getTime());

// The amount as a number, or 0 when it cannot be added (zero, negative, not a number, not finite)
export function creditAmount(amount) {
    if (typeof amount !== "number" && typeof amount !== "string") return 0;
    if (typeof amount === "string" && amount.trim() === "") return 0;
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 ? n : 0;
}

// Has the pool's end date passed? No end date stored (or one that cannot be read) = not expired.
export function poolHasExpired(endDate, now = Date.now()) {
    if (endDate === null || endDate === undefined || endDate === "") return false;
    const end = ms(endDate);
    return Number.isFinite(end) && end < ms(now);
}

// What the pool's balance becomes when `amount` credits are added at `now`.
// Returns { expired, balance }, or null when the amount is refused.
export function poolAfterAdding({ balance, endDate } = {}, amount, now = Date.now()) {
    const add = creditAmount(amount);
    if (!add) return null;
    if (poolHasExpired(endDate, now)) return { expired: true, balance: add };
    return { expired: false, balance: (Number(balance) || 0) + add };
}

// The two database updates that carry out poolAfterAdding. Each one checks the stored end date in its own filter, so
// the check and the change happen together in the database and a charge made at the same moment is never lost:
//   whenExpired: only matches a pool whose end date has passed, and puts the new credits in place of the old balance
//   whenAlive:   only matches a pool that has not expired, and adds to the balance
// One of the two always matches a person who exists. The "in all" figure (bought in all, gifted in all) goes up by
// the amount in both: it counts everything ever added, and the super admin's person page works out "used" from it.
export function poolAddUpdates(poolName, userId, amount, { now, startDate, endDate, startOnlyIfMissing = false }) {
    const f = POOLS[poolName];
    const add = creditAmount(amount);
    const whenExpired = {
        filter: { _id: userId, [f.end]: { $lt: now } },
        update: { $set: { [f.balance]: add, [f.start]: startDate, [f.end]: endDate }, $inc: { [f.total]: add } },
    };
    const whenAlive = {
        filter: { _id: userId, [f.end]: { $not: { $lt: now } } },
        update: { $inc: { [f.balance]: add, [f.total]: add }, $set: { [f.end]: endDate } },
    };
    // (bought credits keep the start date of the first purchase while the pool is alive; a gift writes its own)
    if (!startOnlyIfMissing) whenAlive.update.$set[f.start] = startDate;
    return { whenExpired, whenAlive };
}

/**
 * Adds `amount` credits to a person's pool ("bought" or "gifted") by the rule above.
 *   now:                the moment the credits are added (the end date is compared with it)
 *   startDate, endDate: the pool's new dates
 *   startOnlyIfMissing: while the pool is alive, keep the start date it has and write one only when there is none
 *   once:               { field, mark }: add the credits only if the person's list `field` does not hold `mark` yet,
 *                       and put the mark there in the same database step (a Google Play pack: its credits are added
 *                       once, and whether they were can be read back; google-play.service.js)
 * Returns { user, expired, refused, already }: `user` is the person after the change (null = no such person, or
 * refused), `expired` says the old balance was dropped, `refused` says the amount could not be added, `already` says
 * the `once` mark was there, so nothing was added.
 */
export async function addToPool(User, userId, poolName, amount, { now = new Date(), startDate = null, endDate, startOnlyIfMissing = false, once = null } = {}) {
    const f = POOLS[poolName];
    if (!f) throw new Error(`Unknown credit pool: ${poolName}`);
    if (!creditAmount(amount)) return { user: null, expired: false, refused: true };

    const at = now instanceof Date ? now : new Date(now);
    if (!startDate) startDate = at; // (no start date given: the pool starts when the credits are added)
    const { whenExpired, whenAlive } = poolAddUpdates(poolName, userId, amount, { now: at, startDate, endDate, startOnlyIfMissing });
    const after = { returnDocument: "after" };
    const lastTry = { filter: { _id: userId }, update: whenAlive.update };
    if (once) {
        for (const step of [whenExpired, whenAlive, lastTry]) {
            step.filter = { ...step.filter, [once.field]: { $ne: once.mark } };
            step.update = { ...step.update, $addToSet: { [once.field]: once.mark } };
        }
    }
    const markedAlready = async () => !!once && !!(await User.findOne({ _id: userId, [once.field]: once.mark }).select("_id").lean());
    const already = { user: null, expired: false, refused: false, already: true };

    const aliveDone = async (user) => {
        if (startOnlyIfMissing && !valueAt(user, f.start)) {
            // The first credits of this pool: the start date is written only while there is still none
            await User.updateOne({ _id: userId, [f.start]: null }, { $set: { [f.start]: startDate } });
        }
        return { user, expired: false, refused: false };
    };

    // The end date can only pass from one side to the other between the two tries if somebody changes it in that
    // very moment (the super admin's Extend): then both are tried once more.
    for (let attempt = 0; attempt < 2; attempt++) {
        const reset = await User.findOneAndUpdate(whenExpired.filter, whenExpired.update, after);
        if (reset) return { user: reset, expired: true, refused: false };
        const added = await User.findOneAndUpdate(whenAlive.filter, whenAlive.update, after);
        if (added) return aliveDone(added);
        if (attempt === 0 && await markedAlready()) return already;
        if (attempt === 0 && !(await User.findById(userId).select("_id").lean())) return { user: null, expired: false, refused: false };
    }
    // Credits that were paid for or given are never left out: the last try adds them whatever the end date says
    const added = await User.findOneAndUpdate(lastTry.filter, lastTry.update, after);
    if (added) return aliveDone(added);
    return (await markedAlready()) ? already : { user: null, expired: false, refused: false };
}

/**
 * Takes up to `amount` credits back off a person's pool (a refunded purchase) and returns what was really taken:
 * never more than the balance holds, so it never goes below zero; credits already spent stay spent. The balance is
 * changed only while it still covers the amount (an answer may be charging it at the same moment), else read again.
 * The pool's "in all" figure goes down by what was taken.
 */
export async function takeFromPool(User, userId, poolName, amount) {
    const f = POOLS[poolName];
    if (!f) throw new Error(`Unknown credit pool: ${poolName}`);
    const want = creditAmount(amount);
    for (let attempt = 0; attempt < 4 && want > 0; attempt++) {
        const row = await User.findById(userId).select(`${f.balance} ${f.total}`).lean();
        const take = Math.min(want, Math.max(0, Number(valueAt(row, f.balance)) || 0));
        if (!(take > 0)) return 0;
        const done = await User.findOneAndUpdate({ _id: userId, [f.balance]: { $gte: take } }, { $inc: { [f.balance]: -take } });
        if (done) {
            const total = Math.max(0, (Number(valueAt(done, f.total)) || 0) - take);
            await User.updateOne({ _id: userId }, { $set: { [f.total]: total } });
            return take;
        }
    }
    return 0;
}

// Reads "a.b.c" from a document (a plain object or a Mongoose document)
function valueAt(doc, path) {
    return path.split(".").reduce((at, key) => (at === null || at === undefined ? undefined : at[key]), doc);
}

// A gift (an AiCreditTransaction row of type "grant") that is in force. "success" is what a gift is saved with.
// "active" is what Extend wrote on the newest gift before 2026-11-21; nothing writes it any more, and a gift that
// carries it is still treated as in force by Pause, Remove and the person page, so it is here too.
// A paused or revoked gift is never in force.
export function giftInForce(status) {
    const s = String(status || "").toLowerCase();
    return s === "success" || s === "active";
}
