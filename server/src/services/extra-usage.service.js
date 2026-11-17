// Extra usage paid from the person's credits (owner, 2026-11-14 evening): credits must raise every limit, not only the
// chat's. Once the plan's (or the global) number of images, WhatsApp messages, voice replies or voice input minutes
// is used up, each further one is paid from the person's credits at the price the super admin sets in Global AI
// Config (extra_*_credits). A price of 0 turns the extra off for that feature: the limit then stays a hard stop.
// Since 2026-11-17 (owner: "gifted credits work everywhere bought credits work") the credits are one shared pool:
// gifted (promotion) and bought (top-up) together, the older one first, spilling into the other when it runs out
// (creditsAvailable and deductTokens in ai-credits.service.js). Never the plan's own free limit.
// WhatsApp calls already work this way: past the free minutes a call is paid per turn from credits.
import GlobalAiConfig from "../models/GlobalAiConfig.js";
import { creditsAvailable, deductTokens } from "./ai-credits.service.js";

export const EXTRA_KINDS = {
    image: { field: "extra_image_credits", unit: "image" },
    whatsapp: { field: "extra_whatsapp_credits", unit: "WhatsApp message" },
    voicereply: { field: "extra_voice_reply_credits", unit: "voice reply" },
    voiceinput: { field: "extra_voice_input_credits_per_minute", unit: "minute of voice input" },
};

/** The price in credits of one extra `kind` (0 = extras off) */
export async function extraPrice(kind, config = null) {
    const k = EXTRA_KINDS[kind];
    if (!k) return 0;
    const cfg = config || await GlobalAiConfig.findOne({ key: "singleton" }).select(k.field).lean().catch(() => null);
    return Math.max(0, Math.trunc(Number(cfg?.[k.field])) || 0);
}

/**
 * Can `count` extra `kind` be paid from the user's top-up credits? Returns { allowed, price, total, reason }.
 * Nothing is charged here: call chargeExtra once the thing was actually done.
 */
export async function canPayExtra(user, kind, count = 1) {
    const price = await extraPrice(kind);
    if (price <= 0) return { allowed: false, price: 0, total: 0, reason: "off" };
    const total = price * Math.max(1, Math.ceil(count));
    const credits = await creditsAvailable(user._id).catch(() => null);
    if (!credits || credits.total < total) return { allowed: false, price, total, reason: "no_credits", remaining: credits?.total || 0 };
    return { allowed: true, price, total };
}

/** Takes the price of `count` extra `kind` from the top-up credits (never spilling into another pool) */
export async function chargeExtra(user, kind, count = 1, price = null) {
    const each = price ?? await extraPrice(kind);
    const total = each * Math.max(1, Math.ceil(count));
    if (total <= 0) return 0;
    // The pool that started first pays; what it can't cover comes from the other one (never the plan's free limit)
    const credits = await creditsAvailable(user._id).catch(() => null);
    await deductTokens(user._id, user.organization_id || null, total, credits?.source || "personal")
        .catch((e) => console.error(`[extra usage] could not charge ${total} credits for ${kind}:`, e.message));
    console.log(`[extra usage] ${total} credits for ${Math.ceil(count)} extra ${EXTRA_KINDS[kind]?.unit || kind}${Math.ceil(count) === 1 ? "" : "s"} (${user.email || user._id})`);
    return total;
}

/** The sentence that tells a user at a limit what an extra costs and that a top-up pays it. Never for a user on the
 * Free plan (`planKey` "free"): top-ups are for Pro and Max, a Free user moves to Pro or Max for more. */
export function extraOfferText(kind, price, planKey = null) {
    if (planKey === "free") return "";
    const unit = EXTRA_KINDS[kind]?.unit || kind;
    return price > 0
        ? ` Each extra ${unit} costs ${price.toLocaleString("en-IN")} credits from your top-up credits: top up to keep going.`
        : "";
}
