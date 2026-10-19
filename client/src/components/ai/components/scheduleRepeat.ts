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
// Label for a repeating AI schedule (server: utils/schedule-repeat.js), e.g. "Repeats daily · until 16 Oct"
export type ScheduleRepeat = {
  repeat?: "once" | "daily" | "weekly" | "custom";
  repeat_days?: number[];
  repeat_until?: string;
  run_count?: number;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function repeatLabel(s: ScheduleRepeat): string | null {
  if (!s.repeat || s.repeat === "once") return null;
  const what = s.repeat === "custom"
    ? `every ${(s.repeat_days || []).map((d) => DAY_NAMES[d]).filter(Boolean).join(", ")}`
    : s.repeat;
  const until = s.repeat_until
    ? ` · until ${new Date(s.repeat_until).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
    : "";
  const sent = s.run_count ? ` · sent ${s.run_count}×` : "";
  return `Repeats ${what}${until}${sent}`;
}
