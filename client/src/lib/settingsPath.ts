// The Settings page's address for the app the user is in (chat.classgrid.in: /agent/settings; the super admin
// dashboard: /superadmin/settings), with the section to open. goToSettings: a full move there (the website and the
// desktop app); in Classgrid Code the AI panel asks the editor to open its Settings tab at that section instead.
export type SettingsSectionName = "general" | "notifications" | "privacy" | "account" | "browser" | "mastero" | "usage" | "billing" | "platform";

export function settingsPath(section: SettingsSectionName, extra = ""): string {
  const base = typeof window !== "undefined" && window.location.pathname.startsWith("/superadmin") ? "/superadmin/settings" : "/agent/settings";
  return `${base}?section=${section}${extra}`;
}

/** Opens Settings at a section. `extra` adds to the address, like "&ai_payment=success" after a payment. */
export function goToSettings(section: SettingsSectionName, extra = "") {
  if (typeof window === "undefined") return;
  if (import.meta.env.VITE_EDITOR === "1") {
    const desk = (window as unknown as { classgridDesktop?: { openSettings?: (section?: string) => Promise<unknown> } }).classgridDesktop;
    if (desk?.openSettings) { void desk.openSettings(section); return; }
    window.location.assign(`/editor/settings?section=${section}${extra}`);
    return;
  }
  window.location.assign(settingsPath(section, extra));
}
