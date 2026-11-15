// An account's emails (owner, 2026-11-15): besides its main email, an account can add up to two more (three in all),
// each confirmed with a code sent to it (Settings > Account > Emails). Signing in works with any of them and the
// same password; usage and limits stay those of the one account. These helpers find an account by any of its
// confirmed emails, so sign-in, password reset and sign-up all see the added ones.

export const MAX_ACCOUNT_EMAILS = 3; // the main email included

export const cleanEmail = (v) => String(v || "").trim().toLowerCase();
export const looksLikeEmail = (v) => /^[^\s@]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(v) && v.length <= 254;

/** The conditions that match an account owning `email` (its main email, or a confirmed added one), for an $or */
export const emailMatch = (email) => {
    const e = cleanEmail(email);
    return [{ email: e }, { account_emails: { $elemMatch: { email: e, verified_at: { $ne: null } } } }];
};

/** A User query for the account that owns `email` */
export const emailOwnerQuery = (email) => ({ $or: emailMatch(email) });

/** Every confirmed email of a user document: the main one first */
export const confirmedEmails = (user) => [
    cleanEmail(user?.email),
    ...(Array.isArray(user?.account_emails) ? user.account_emails.filter((a) => a?.verified_at).map((a) => cleanEmail(a.email)) : []),
].filter(Boolean);

/**
 * The account that owns `email`, found the same way every time: by its main email first, and only when no account
 * has it as a main email, by a confirmed added one. `select` is passed to Mongoose (like "+password").
 */
export async function findByAnyEmail(User, email, select) {
    const e = cleanEmail(email);
    if (!e) return null;
    const byMain = User.findOne({ email: e });
    const main = await (select ? byMain.select(select) : byMain);
    if (main) return main;
    const byAdded = User.findOne({ account_emails: { $elemMatch: { email: e, verified_at: { $ne: null } } } });
    return select ? byAdded.select(select) : byAdded;
}
