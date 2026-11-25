// The super admin's security code (Grant Credits, Block / Reset usage, Reset Plan Usage, Person access): a 6-digit
// code emailed to the super admin, asked for before those changes (controllers/super-admin/ai-credits-admin.controller.js).
//
// Since 2026-11-25: it lasts 10 minutes (utils/code-lifetime.js), each code takes five tries, counted in one step
// before the code is compared, and a code that fits is used up in one step, so two requests with it at the same
// moment cannot both pass. Before, the check looked the code up by its value with no count at all, read and wrote
// "used" in two steps, and wrote the code itself to the server's log.
import crypto from "crypto";
import AdminSecurityCode from "../models/AdminSecurityCode.js";
import { CODE_MAX_TRIES, codeExpiresAt, sameCode } from "../utils/code-lifetime.js";

/** Six random digits. */
export const makeSecurityCode = () => crypto.randomInt(100000, 1000000).toString();

/** Keeps a new code for this super admin. `fields`: action, orgId, planKey. */
export async function keepSecurityCode({ adminId, email, code, ...fields }) {
    return AdminSecurityCode.create({ superAdminId: adminId, email, code, ...fields, expiresAt: codeExpiresAt() });
}

/**
 * Checks a typed code against this super admin's codes still in time (only those that `filter` names, e.g. one
 * action and plan). Every live code takes the try on its own count before it is compared, and only a code that took
 * it (under its five) can be accepted. Resolves { state: "ok", code } with the code used up, { state: "tries" } when
 * every live code has used its tries, or { state: "wrong" }. `accept(code)` may refuse a code that fits (another
 * action or organization) with a reason: { state: "refused", reason }, the code left unused.
 */
export async function takeSecurityCode({ adminId, typed, filter = {}, accept = () => null, now = new Date() }) {
    const code = String(typed ?? "").trim();
    const live = await AdminSecurityCode.find({ superAdminId: adminId, used: false, expiresAt: { $gt: now }, ...filter })
        .sort({ createdAt: -1 }).select("_id code action orgId planKey").lean();
    if (!live.length) return { state: "wrong" };
    let counted = 0;
    for (const row of live) {
        const took = await AdminSecurityCode.findOneAndUpdate(
            { _id: row._id, used: false, $or: [{ attempts: null }, { attempts: { $lt: CODE_MAX_TRIES } }] },
            { $inc: { attempts: 1 } },
            { projection: { _id: 1 } },
        );
        if (!took) continue;
        counted += 1;
        if (!sameCode(row.code, code)) continue;
        const refused = accept(row);
        if (refused) return { state: "refused", reason: refused };
        const used = await AdminSecurityCode.findOneAndUpdate(
            { _id: row._id, used: false, expiresAt: { $gt: new Date() } },
            { $set: { used: true } },
            { new: true },
        );
        return used ? { state: "ok", code: used } : { state: "wrong" };
    }
    return counted ? { state: "wrong" } : { state: "tries" };
}
