// get_plans_and_usage (owner, 2026-11-17): Classgrid AI answers questions about plans, prices, limits, top-ups and the
// user's own usage from the live numbers, never from numbers written into a prompt or a doc. Read only.
//   - the plans: the same feed as GET /api/public/ai-pricing (ai-pricing.service.js), i.e. the plan table the super
//     admin edits
//   - the user's own plan, usage and credit balance: the same overview the Settings > Usage page shows
//     (ai-plan-overview.controller.js planOverviewFor)
// The tool is in the "account_plan" tool group (ai-tool-groups.js), loaded only when a message is about these things.
import { aiPricingData } from "./ai-pricing.service.js";
import { planOverviewFor } from "../controllers/ai-plan-overview.controller.js";

export const PLAN_INFO_TOOL_NAME = "get_plans_and_usage";

export const PLAN_INFO_TOOLS = [
    {
        type: "function",
        function: {
            name: PLAN_INFO_TOOL_NAME,
            description: "Classgrid's plans (Free, Pro, Max and any others), live from Classgrid's dashboard: prices, student prices, limits, models, images, storage and what each plan includes, plus top-ups (extra AI credits). Also the signed-in user's own plan, their usage against each limit with when it refills, and their credit balance, the same numbers as Settings > Usage. These numbers are set in Classgrid's dashboard and change at any time, so call this for every question about plans, prices, limits, top-ups or the user's usage, and answer only from its result: never from memory, from older answers or from the guide.",
            parameters: {
                type: "object",
                properties: {
                    part: { type: "string", enum: ["all", "plans", "mine"], description: "all (default): the plans and the user's own plan and usage. plans: only the plans and top-ups. mine: only the user's own plan, usage and balance." },
                },
            },
        },
    },
];

const NOTE = "These numbers come from Classgrid's dashboard and can change at any time. Answer only from this result, in plain words.";
const HOW_TO_READ = "A limit of -1 means no limit, 0 means not included, null means nothing limits it. Prices are in rupees and include GST; a price of -1 means contact Classgrid. Credits are Classgrid's unit of AI use. resetAt is when a limit refills (UTC; tell the user in India time). The user's credit limits (session, weekly, Claude, Fable) are given only as percent_used and when they refill, the same as Settings > Usage shows them: tell the percent, never a number of credits for a session or a week, and never work one out or guess one. The plans list does not show each plan's credit amounts per window or per week either: if asked, say how the plans compare from what is here and point to https://classgrid.in/pricing; never quote chats per window as a credit limit. Models are given by their names only: never name the company or the provider behind a model.";

// What the AI is given about the person's credits and models is what the person's own Settings > Usage page shows,
// and no more (owner, 2026-11-23: "tell him only percent, only the model's name, not the provider, the same as our AI
// credit page; that step leaks everything"). Until then the tool passed the plan's row and the overview on as they
// were: the AI read the plan's credits per window and per week and told them ("7,000,000 credits per 5 hours"), and
// the step's Response box in the chat showed the same, with every model's provider path.
// The plan's credit amounts: never given
const CREDIT_FIELDS = new Set(["tokens_per_window", "tokens_per_week", "claude_credits_per_week", "context_tokens"]);
// The credit meters: percent used and when they refill, like the page's bars
const CREDIT_METERS = ["credits_window", "credits_week", "claude_week", "fable_week"];
function percentOnly(meter) {
    if (!meter) return null;
    const limit = Number(meter.limit);
    const used = Number(meter.used) || 0;
    const rest = { resetAt: meter.resetAt ?? null, ...(meter.periodText ? { periodText: meter.periodText } : {}) };
    if (meter.limit === null || meter.limit === undefined || limit === -1) return { no_limit: true, ...rest };
    if (limit === 0) return { included: false, ...rest };
    return { percent_used: Math.min(100, Math.max(0, Math.round((used / limit) * 100))), ...rest };
}
// A model by the name the model picker shows; one the names don't know loses its provider path ("@cf/zai-org/glm-5.3" -> "glm-5.3")
const modelNamer = (names = {}) => (id) => {
    const key = String(id ?? "");
    if (key === "auto") return "Auto";
    return names[key] || key.split("/").pop() || key;
};
const WHERE = {
    usage: "Settings > Usage on chat.classgrid.in",
    billing: "Settings > Billing on chat.classgrid.in: the current plan, Upgrade, Buy credits, Auto top-up, the student price and invoices",
    pricing: "https://classgrid.in/pricing",
};

// The plans and top-ups, from the pricing feed (models by name, not by their provider's path)
function plansPart(feed, nameOf) {
    const plans = (Array.isArray(feed?.plans) ? feed.plans : []).map((p) => (Array.isArray(p.modelsAllowed) ? { ...p, modelsAllowed: p.modelsAllowed.map(nameOf) } : p));
    const paid = plans.filter((p) => p.key !== "free" && !p.comingSoon).map((p) => p.name);
    return {
        plans_on: feed?.plansEnabled === true,
        plans,
        // For each model, the plans that include it
        model_plans: Object.fromEntries(Object.entries(feed?.modelPlans || {}).map(([model, list]) => [nameOf(model), list])),
        top_ups: {
            // While plans are on, top-ups are only for the paid plans (Free cannot buy them)
            for_plans: feed?.plansEnabled === true ? paid : "every account (plans are off right now)",
            used: "after the plan's own limits are used up",
            valid_days: feed?.creditValidityDays ?? null,
            credits_per_rupee: feed?.creditsPerInr ?? null,
            min_rupees: feed?.topupMinInr ?? null,
            max_rupees: feed?.topupMaxInr ?? null,
            packs_rupees: feed?.topupPacksInr ?? null,
        },
    };
}

// The user's own plan, usage and balance, from the Usage page's overview: what that page shows, and no more
function minePart(overview, nameOf) {
    // (the apps' own fields, where the plan was bought and its store ids, are left out)
    const { limits: planLimits, source: _source, play_product_id: _product, play_base_plan_id: _basePlan, ...plan } = overview.plan || {};
    let limits = null;
    if (planLimits && typeof planLimits === "object") {
        limits = Object.fromEntries(Object.entries(planLimits).filter(([field]) => !CREDIT_FIELDS.has(field)));
        if (Array.isArray(limits.models_allowed)) limits.models_allowed = limits.models_allowed.map(nameOf);
        if (limits.default_model) limits.default_model = nameOf(limits.default_model);
    }
    const usage = { ...(overview.usage || {}) };
    for (const meter of CREDIT_METERS) if (meter in usage) usage[meter] = percentOnly(usage[meter]);
    return {
        plans_on: overview.enabled === true,
        plan: { ...plan, limits },
        usage,
        balance: { top_up_credits: overview.balance?.topup ?? 0, granted_credits: overview.balance?.promotion ?? 0 },
    };
}

// modelNames: the model picker's names by model id (ai-chat.controller.js MODEL_DISPLAY_NAMES)
export async function runPlansAndUsage(user, args = {}, { modelNames = {} } = {}) {
    const part = ["plans", "mine"].includes(args?.part) ? args.part : "all";
    const nameOf = modelNamer(modelNames);
    const out = { note: NOTE, how_to_read: HOW_TO_READ, where: WHERE };
    if (part !== "mine") Object.assign(out, plansPart(await aiPricingData(), nameOf));
    if (part !== "plans") {
        const overview = await planOverviewFor(user._id);
        if (!overview) return "Error: your Classgrid account was not found.";
        out.you = minePart(overview, nameOf);
    }
    return JSON.stringify(out, null, 2);
}

// The handler for the AI chat (user = the chat's signed-in user)
export function buildPlanInfoHandlers({ user, modelNames = {} }) {
    return {
        [PLAN_INFO_TOOL_NAME]: async (args) => {
            if (!user?._id) return "Error: sign in first.";
            try {
                return await runPlansAndUsage(user, args && typeof args === "object" ? args : {}, { modelNames });
            } catch (e) {
                return `Error: ${e.message}`;
            }
        },
    };
}
