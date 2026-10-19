/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

// Tremor Raw chartUtils.ts

export type AvailableChartColorsKeys =
  | "slate"
  | "gray"
  | "zinc"
  | "neutral"
  | "stone"
  | "red"
  | "orange"
  | "amber"
  | "yellow"
  | "lime"
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "sky"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "fuchsia"
  | "pink"
  | "rose";

export const AvailableChartColors: AvailableChartColorsKeys[] = [
  "blue",
  "cyan",
  "sky",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "pink",
  "rose",
];

export const constructCategoryColors = (
  categories: string[],
  colors: AvailableChartColorsKeys[],
): Map<string, AvailableChartColorsKeys> => {
  const categoryColors = new Map<string, AvailableChartColorsKeys>();
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length] as AvailableChartColorsKeys);
  });
  return categoryColors;
};

const colorMap: Record<AvailableChartColorsKeys, Record<"bg" | "fill" | "stroke" | "text", string>> = {
  slate: { bg: "bg-slate-500 dark:bg-slate-500", fill: "fill-slate-500 dark:fill-slate-500", stroke: "stroke-slate-500 dark:stroke-slate-500", text: "text-slate-500 dark:text-slate-500" },
  gray: { bg: "bg-gray-500 dark:bg-gray-500", fill: "fill-gray-500 dark:fill-gray-500", stroke: "stroke-gray-500 dark:stroke-gray-500", text: "text-gray-500 dark:text-gray-500" },
  zinc: { bg: "bg-zinc-500 dark:bg-zinc-500", fill: "fill-zinc-500 dark:fill-zinc-500", stroke: "stroke-zinc-500 dark:stroke-zinc-500", text: "text-zinc-500 dark:text-zinc-500" },
  neutral: { bg: "bg-neutral-500 dark:bg-neutral-500", fill: "fill-neutral-500 dark:fill-neutral-500", stroke: "stroke-neutral-500 dark:stroke-neutral-500", text: "text-neutral-500 dark:text-neutral-500" },
  stone: { bg: "bg-stone-500 dark:bg-stone-500", fill: "fill-stone-500 dark:fill-stone-500", stroke: "stroke-stone-500 dark:stroke-stone-500", text: "text-stone-500 dark:text-stone-500" },
  red: { bg: "bg-red-500 dark:bg-red-500", fill: "fill-red-500 dark:fill-red-500", stroke: "stroke-red-500 dark:stroke-red-500", text: "text-red-500 dark:text-red-500" },
  orange: { bg: "bg-orange-500 dark:bg-orange-500", fill: "fill-orange-500 dark:fill-orange-500", stroke: "stroke-orange-500 dark:stroke-orange-500", text: "text-orange-500 dark:text-orange-500" },
  amber: { bg: "bg-amber-500 dark:bg-amber-500", fill: "fill-amber-500 dark:fill-amber-500", stroke: "stroke-amber-500 dark:stroke-amber-500", text: "text-amber-500 dark:text-amber-500" },
  yellow: { bg: "bg-yellow-500 dark:bg-yellow-500", fill: "fill-yellow-500 dark:fill-yellow-500", stroke: "stroke-yellow-500 dark:stroke-yellow-500", text: "text-yellow-500 dark:text-yellow-500" },
  lime: { bg: "bg-lime-500 dark:bg-lime-500", fill: "fill-lime-500 dark:fill-lime-500", stroke: "stroke-lime-500 dark:stroke-lime-500", text: "text-lime-500 dark:text-lime-500" },
  green: { bg: "bg-green-500 dark:bg-green-500", fill: "fill-green-500 dark:fill-green-500", stroke: "stroke-green-500 dark:stroke-green-500", text: "text-green-500 dark:text-green-500" },
  emerald: { bg: "bg-emerald-500 dark:bg-emerald-500", fill: "fill-emerald-500 dark:fill-emerald-500", stroke: "stroke-emerald-500 dark:stroke-emerald-500", text: "text-emerald-500 dark:text-emerald-500" },
  teal: { bg: "bg-teal-500 dark:bg-teal-500", fill: "fill-teal-500 dark:fill-teal-500", stroke: "stroke-teal-500 dark:stroke-teal-500", text: "text-teal-500 dark:text-teal-500" },
  cyan: { bg: "bg-cyan-500 dark:bg-cyan-500", fill: "fill-cyan-500 dark:fill-cyan-500", stroke: "stroke-cyan-500 dark:stroke-cyan-500", text: "text-cyan-500 dark:text-cyan-500" },
  sky: { bg: "bg-sky-500 dark:bg-sky-500", fill: "fill-sky-500 dark:fill-sky-500", stroke: "stroke-sky-500 dark:stroke-sky-500", text: "text-sky-500 dark:text-sky-500" },
  blue: { bg: "bg-blue-500 dark:bg-blue-500", fill: "fill-blue-500 dark:fill-blue-500", stroke: "stroke-blue-500 dark:stroke-blue-500", text: "text-blue-500 dark:text-blue-500" },
  indigo: { bg: "bg-indigo-500 dark:bg-indigo-500", fill: "fill-indigo-500 dark:fill-indigo-500", stroke: "stroke-indigo-500 dark:stroke-indigo-500", text: "text-indigo-500 dark:text-indigo-500" },
  violet: { bg: "bg-violet-500 dark:bg-violet-500", fill: "fill-violet-500 dark:fill-violet-500", stroke: "stroke-violet-500 dark:stroke-violet-500", text: "text-violet-500 dark:text-violet-500" },
  purple: { bg: "bg-purple-500 dark:bg-purple-500", fill: "fill-purple-500 dark:fill-purple-500", stroke: "stroke-purple-500 dark:stroke-purple-500", text: "text-purple-500 dark:text-purple-500" },
  fuchsia: { bg: "bg-fuchsia-500 dark:bg-fuchsia-500", fill: "fill-fuchsia-500 dark:fill-fuchsia-500", stroke: "stroke-fuchsia-500 dark:stroke-fuchsia-500", text: "text-fuchsia-500 dark:text-fuchsia-500" },
  pink: { bg: "bg-pink-500 dark:bg-pink-500", fill: "fill-pink-500 dark:fill-pink-500", stroke: "stroke-pink-500 dark:stroke-pink-500", text: "text-pink-500 dark:text-pink-500" },
  rose: { bg: "bg-rose-500 dark:bg-rose-500", fill: "fill-rose-500 dark:fill-rose-500", stroke: "stroke-rose-500 dark:stroke-rose-500", text: "text-rose-500 dark:text-rose-500" },
};

export const getColorClassName = (
  color: AvailableChartColorsKeys,
  type: "bg" | "fill" | "stroke" | "text"
): string => {
  return colorMap[color]?.[type] || `${type}-${color}-500 dark:${type}-${color}-500`;
};

export const getYAxisDomain = (
  autoMinValue: boolean,
  minValue: number | undefined,
  maxValue: number | undefined,
) => {
  const minDomain = autoMinValue ? "auto" : minValue ?? 0;
  const maxDomain = maxValue ?? "auto";
  return [minDomain, maxDomain];
};
