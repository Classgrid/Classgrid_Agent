// Settings, divided into sections (like ChatGPT's settings): the left sidebar lists them (SettingsNav) and the page
// shows the one picked (?section=...). Each section says who sees it and the words search finds it by.
import { useSearchParams } from "react-router-dom";
import { Bell, Globe, Lock, Palette, Settings2, UserRound, type LucideIcon } from "lucide-react";
import { isChatHost } from "@/lib/chatHost";

export type SettingsSectionId = "general" | "notifications" | "privacy" | "account" | "browser" | "platform";
export type SettingsSection = { id: SettingsSectionId; label: string; icon: LucideIcon; words: string };
type Who = { role?: string | null };

const DESKTOP = import.meta.env.VITE_DESKTOP === "1" || import.meta.env.VITE_EDITOR === "1";

export function settingsSections({ role }: Who): SettingsSection[] {
  const chat = isChatHost();
  // The push notifications card (SharedSettingsPage): only for roles that have it on the main site
  const push = !!role && role !== "org_admin" && role !== "super_admin" && role !== "user" && !chat;
  return [
    { id: "general" as const, label: "General", icon: Settings2, words: "appearance theme dark mode light role sidebar" },
    ...(DESKTOP || push ? [{ id: "notifications" as const, label: "Notifications", icon: Bell, words: "notifications sound volume agent grids alerts push" }] : []),
    { id: "privacy" as const, label: "Privacy", icon: Lock, words: "privacy data domain verified identity" },
    { id: "account" as const, label: "Account", icon: UserRound, words: "account password delete role request security" },
    { id: "browser" as const, label: "Browser", icon: Globe, words: "browser history downloads cookies logins site data cache camera microphone location notifications websites permissions block allow" },
    ...(role === "super_admin" ? [{ id: "platform" as const, label: "Platform", icon: Palette, words: "platform branding name logo" }] : []),
  ];
}

// The section shown (?section=), and the page inside it (?view=, like Browser → Browsing history)
export function useSettingsSection(sections: SettingsSection[]) {
  const [params, setParams] = useSearchParams();
  const asked = params.get("section");
  const section = sections.find((s) => s.id === asked)?.id ?? "general";
  const view = params.get("view");
  // Moving between sections replaces the place in the history (the back arrow leaves Settings at once, it doesn't step
  // back through the sections); a page inside a section (Browsing history) is a new place, so back returns from it
  const go = (id: SettingsSectionId, nextView?: string | null) => {
    const p = new URLSearchParams();
    p.set("section", id);
    if (nextView) p.set("view", nextView);
    setParams(p, { replace: !nextView });
  };
  return { section, view, go };
}

// A settings page: /settings, /agent/settings or /superadmin/settings (not Classgrid Code's own /editor/settings)
export const isSettingsPath = (pathname: string) => /\/settings\/?$/.test(pathname) && !pathname.startsWith("/editor/");
