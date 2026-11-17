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
const HOW_TO_READ = "A limit of -1 means no limit, 0 means not included, null means nothing limits it. Prices are in rupees and include GST; a price of -1 means contact Classgrid. Credits are Classgrid's unit of AI use. resetAt is when a limit refills (UTC; tell the user in India time).";
const WHERE = {
    usage: "Settings > Usage on chat.classgrid.in",
    billing: "Settings > Billing on chat.classgrid.in: the current plan, Upgrade, Buy credits, Auto top-up, the student price and invoices",
    pricing: "https://classgrid.in/pricing",
};

// The plans and top-ups, from the pricing feed
function plansPart(feed) {
    const plans = Array.isArray(feed?.plans) ? feed.plans : [];
    const paid = plans.filter((p) => p.key !== "free" && !p.comingSoon).map((p) => p.name);
    return {
        plans_on: feed?.plansEnabled === true,
        plans,
        // For each model, the plans that include it
        model_plans: feed?.modelPlans || {},
        top_ups: {
            // While plans are on, top-ups are only for the paid plans (Free cannot buy them)
            for_plans: feed?.plansEnabled === true ? paid : "every account (plans are off right now)",
            used: "after the plan's own limits are used up",
            valid_days: feed?.creditValidityDays ?? null,
            credits_per_rupee: feed?.creditsPerInr ?? null,
            min_rupees: feed?.topupMinInr ?? null,
            max_rupees: feed?.topupMaxInr ?? null,
        },
    };
}

// The user's own plan, usage and balance, from the Usage page's overview
function minePart(overview) {
    return {
        plans_on: overview.enabled === true,
        plan: overview.plan,
        usage: overview.usage,
        balance: { top_up_credits: overview.balance?.topup ?? 0, granted_credits: overview.balance?.promotion ?? 0 },
    };
}

export async function runPlansAndUsage(user, args = {}) {
    const part = ["plans", "mine"].includes(args?.part) ? args.part : "all";
    const out = { note: NOTE, how_to_read: HOW_TO_READ, where: WHERE };
    if (part !== "mine") Object.assign(out, plansPart(await aiPricingData()));
    if (part !== "plans") {
        const overview = await planOverviewFor(user._id);
        if (!overview) return "Error: your Classgrid account was not found.";
        out.you = minePart(overview);
    }
    return JSON.stringify(out, null, 2);
}

// The handler for the AI chat (user = the chat's signed-in user)
export function buildPlanInfoHandlers({ user }) {
    return {
        [PLAN_INFO_TOOL_NAME]: async (args) => {
            if (!user?._id) return "Error: sign in first.";
            try {
                return await runPlansAndUsage(user, args && typeof args === "object" ? args : {});
            } catch (e) {
                return `Error: ${e.message}`;
            }
        },
    };
}
