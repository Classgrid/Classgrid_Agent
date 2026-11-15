// Which models voice mode on the phone may answer with for a user (ai-voice.controller.js): the same plan rules as a
// typed message (ai-chat.controller.js streamAskAi). Kept apart, with no database reads, so it can be tested.
import { isFableModel, planAllowsModel } from "./model-access.service.js";

/**
 * Whether the plan lets this user talk with the picked model now: the same rules as a typed message to that model
 * (ai-chat.controller.js streamAskAi): the plan's models, Claude only with weekly Claude credits (0 = not in the
 * plan), Claude Fable only with a Fable share (or a staff account), and the week's Claude and Fable credits.
 * Pure, for the tests: plan null = plans off or a staff account; counters = weekCounters() (read for a Claude model
 * on a plan with limited Claude credits). Returns null (allowed) or { status, code, message, plan }.
 */
export function voiceModelRefusal({ model, isClaude, modelName, plan, fableUnlocked = false, counters = null, refillText = "" }) {
    const name = modelName || model;
    const locked = (message) => ({ status: 402, code: "model_locked", message, plan: plan?.key });
    if (plan && !planAllowsModel(plan.models_allowed, model)) return locked(`${name} is not in your ${plan.name} plan. Upgrade your plan on classgrid.in/pricing, or pick another model.`);
    if (!isClaude) return null;
    const fable = isFableModel(model);
    if (plan) {
        const pool = Number(plan.claude_credits_per_week);
        if (pool === 0) return locked(`Claude models are not in your ${plan.name} plan. Upgrade your plan on classgrid.in/pricing, or pick another model.`);
        const share = Number(plan.fable_share_percent) || 0;
        if (fable && !(share > 0)) return locked(`${name} is not in your ${plan.name} plan. Upgrade your plan on classgrid.in/pricing, or pick another model.`);
        if (pool > 0 && counters) {
            const when = refillText ? ` They refill on ${refillText} (India time).` : "";
            if (counters.claude_week_used >= pool) return { status: 402, code: "claude_cap_reached", message: `You've used this week's Claude credits of your ${plan.name} plan.${when} Pick another model, or upgrade your plan.`, plan: plan.key };
            if (fable && counters.fable_week_used >= Math.round(pool * share / 100)) return { status: 402, code: "claude_cap_reached", message: `You've used this week's Claude Fable credits of your ${plan.name} plan.${when} Pick another model, or upgrade your plan.`, plan: plan.key };
        }
        return null;
    }
    // Plans off or a staff account: Fable only for the accounts that may always use it
    if (fable && !fableUnlocked) return locked(`${name} is not in your plan. Upgrade your plan on classgrid.in/pricing, or pick another model.`);
    return null;
}
