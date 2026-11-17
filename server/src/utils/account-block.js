// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// A blocked account (status "suspended" or "blocked"; the owner, 2026-11-17: suspended is the same as blocked) can be
// blocked for a time: `blocked_until` holds when the block ends, and no date means until a super admin unblocks it.
// Every place that turns a blocked account away calls liftEndedBlock first, so a block whose time is over ends at the
// person's next request or sign-in without a timer.

export const BLOCKED_STATUSES = ["suspended", "blocked"];

/** The account is blocked and its end time has passed */
export function blockEnded(user, now = new Date()) {
    if (!user || !BLOCKED_STATUSES.includes(user.status) || !user.blocked_until) return false;
    const end = new Date(user.blocked_until);
    return !Number.isNaN(end.getTime()) && end <= now;
}

/**
 * Ends a block whose time is over: the account is made active again in the database (only if nobody changed it in
 * the meantime) and on the object passed in. Returns true when it did.
 */
export async function liftEndedBlock(User, user) {
    if (!blockEnded(user)) return false;
    await User.updateOne(
        { _id: user._id, status: user.status, blocked_until: user.blocked_until },
        { $set: { status: "active" }, $unset: { blocked_until: 1 } },
    );
    user.status = "active";
    user.blocked_until = null;
    return true;
}
