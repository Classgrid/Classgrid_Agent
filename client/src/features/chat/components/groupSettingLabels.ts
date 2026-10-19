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
// Readable names for the saved setting values (the dropdowns otherwise show the raw value, e.g. "admin_only")
export const GROUP_SETTING_LABELS: Record<string, string> = {
  private: "Private (Hidden, Invite Only)",
  approval: "Approval Required (Visible, Request to Join)",
  public: "Public / Open (Visible, Instant Join)",
  all: "Members & Admins",
  admin_only: "Only Admins",
  "0": "Off",
  "86400": "24 hours",
  "604800": "7 days",
  "7776000": "90 days",
  general: "General",
  class: "Class",
  department: "Department",
  subject: "Subject",
  team_staff: "Team / Staff",
  official_announcement: "Official / Announcement",
};
