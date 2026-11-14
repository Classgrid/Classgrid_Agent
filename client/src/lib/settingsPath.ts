// The Settings page's address for the app the user is in (chat.classgrid.in: /agent/settings; the super admin
// dashboard: /superadmin/settings), with the section to open. goToSettings: a full move there (works from the chat,
// the desktop app and Classgrid Code alike).
export type SettingsSectionName = "general" | "notifications" | "privacy" | "account" | "browser" | "mastero" | "platform" | "plan" | "usage" | "billing";

export function settingsPath(section: SettingsSectionName): string {
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/superadmin") ? "/superadmin/settings" : "/agent/settings";
  return `${base}?section=${section}`;
}

export function goToSettings(section: SettingsSectionName) {
  if (typeof window === "undefined") return;
  window.location.assign(settingsPath(section));
}
