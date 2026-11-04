// Classgrid Code's Settings tab (the gear in its title bar): its own small settings, not the Classgrid app's page.
// Profile (your photo, name and email), Appearance (light, dark, or the same as your computer: it changes the whole
// editor, and our screens follow it), the AI Hub's pages (Plugins, Images, Skills, Connected apps, Usage, AI Credits,
// Upgrade: here instead of a window over the editor) and Docs.
import { useEffect, useState } from "react";
import { BookOpen, Bell, LogOut, Monitor, Moon, Palette, Sun, User } from "lucide-react";
import { SettingsDesktopNotificationsCard } from "@/features/shared/components/settings/SettingsDesktopNotificationsCard";
import { useTheme } from "next-themes";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { AnimatePresence } from "framer-motion";
import { AI_HUB_TABS, AiHubModal } from "@/components/ai/components/AiHubModal";
import { ClassgridLoading } from "@/features/superadmin/components/ClassgridLoading";

type Mode = "light" | "dark" | "system";
type EditorSettingsDesktop = {
  setEditorTheme?: (mode: Mode) => Promise<unknown>;
  openExternal?: (url: string) => Promise<unknown>;
  onSettingsSection?: (fn: (section: string) => void) => () => void;
  signOut?: () => Promise<unknown>;
};
const desk = () => (window as unknown as { classgridDesktop?: EditorSettingsDesktop }).classgridDesktop;
const MODE_KEY = "cg_editor_theme";
const DOCS_URL = "https://classgrid.in/docs";

const SECTIONS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
] as const;
type Section = string;
const known = (s: string | null): s is Section => !!s && [...SECTIONS, ...AI_HUB_TABS].some((x) => x.id === s);
const isHubTab = (s: string) => AI_HUB_TABS.some((t) => t.id === s);

// Every request this tab makes (fetch and XHR), so the loading screen stays until all its pages have their data
let pending = 0;
const waiters = new Set<() => void>();
const bump = (d: number) => { pending = Math.max(0, pending + d); waiters.forEach((f) => f()); };
function countRequests() {
  const w = window as unknown as { __cgCounted?: boolean };
  if (w.__cgCounted) return;
  w.__cgCounted = true;
  // (live connections that stay open, like the chat socket or a stream, aren't loading)
  const live = (url: unknown) => /socket\.io|\/stream|\/events|\/sse\b/i.test(String(url || ""));
  const realFetch = window.fetch.bind(window);
  window.fetch = (...args: Parameters<typeof fetch>) => {
    const req = args[0];
    if (live(typeof req === "string" || req instanceof URL ? req : req.url)) return realFetch(...args);
    bump(1);
    return realFetch(...args).finally(() => bump(-1));
  };
  const open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { __cgUrl?: string }, ...args: unknown[]) {
    this.__cgUrl = String(args[1] || "");
    return (open as (...a: unknown[]) => void).apply(this, args);
  };
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __cgUrl?: string }, ...args: Parameters<XMLHttpRequest["send"]>) {
    if (!live(this.__cgUrl)) {
      bump(1);
      this.addEventListener("loadend", () => bump(-1), { once: true });
    }
    return send.apply(this, args);
  };
}

// The loading screen: until the profile is there and nothing has loaded for a moment (at most 12 s), then never again
function useEverythingLoaded(profileReady: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    const started = Date.now();
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(quiet);
      if (Date.now() - started > 12000) return setReady(true);
      if (profileReady && pending === 0) quiet = setTimeout(() => { if (pending === 0) setReady(true); }, 400);
    };
    waiters.add(check);
    const cap = setTimeout(() => setReady(true), 12000);
    check();
    return () => { waiters.delete(check); clearTimeout(quiet); clearTimeout(cap); };
  }, [profileReady, ready]);
  return ready;
}

export function EditorSettingsPage() {
  useState(countRequests); // (before the pages below start loading)
  const { data: profile } = useUserProfile();
  const loaded = useEverythingLoaded(!!profile);
  const { setTheme } = useTheme();
  // (the AI panel opens this tab on an AI Hub page, like Plugins: ?section=plugins, or a message while it's open)
  const [section, setSection] = useState<Section>(() => {
    const s = new URLSearchParams(window.location.search).get("section");
    return known(s) ? s : "profile";
  });
  useEffect(() => desk()?.onSettingsSection?.((s) => { if (known(s)) setSection(s); }), []);
  const [mode, setMode] = useState<Mode>(() => {
    try { const m = localStorage.getItem(MODE_KEY); return m === "light" || m === "dark" || m === "system" ? m : "system"; } catch { return "system"; }
  });

  const name = profile?.name || "";
  const email = profile?.email || "";
  const photo = profile?.profilePicture || profile?.photoURL || "";
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  const pickMode = (m: Mode) => {
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch { /* storage blocked */ }
    setTheme(m);
    desk()?.setEditorTheme?.(m);
  };

  const avatar = (size: string, text: string) => photo
    ? <img src={photo} alt="" className={`${size} rounded-full object-cover shrink-0`} />
    : <div className={`${size} rounded-full bg-muted flex items-center justify-center shrink-0 ${text} font-medium text-foreground`}>{initial}</div>;

  return (
    <div className="cg-editor-settings h-[100dvh] overflow-y-auto bg-background text-foreground">
      {/* A narrow tab (the editor split in two, or dragged smaller) keeps the sections on the left as icons only */}
      <div className="max-w-5xl mx-auto flex gap-4 md:gap-10 px-3 md:px-8 py-8 md:py-10">
        {/* Left: who you are, and the sections */}
        <nav className="w-9 md:w-60 shrink-0">
          <div className="flex items-center gap-3 md:px-2 mb-6" title={name || email}>
            {avatar("size-9", "text-sm")}
            <div className="min-w-0 hidden md:block">
              <div className="text-sm font-medium truncate">{name || email}</div>
              <div className="text-xs text-muted-foreground truncate">{email}</div>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                title={label}
                className={`flex items-center justify-center md:justify-start gap-2.5 h-9 px-2.5 rounded-lg text-sm text-left transition-colors ${section === id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                <Icon className="size-4 shrink-0" /> <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
          <div className="my-3 h-px bg-border" />
          <div className="flex flex-col gap-0.5">
            {AI_HUB_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                title={label}
                className={`flex items-center justify-center md:justify-start gap-2.5 h-9 px-2.5 rounded-lg text-sm text-left transition-colors ${section === id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                <Icon className="size-4 shrink-0" /> <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
          <div className="my-3 h-px bg-border" />
          <button
            type="button"
            onClick={() => (desk()?.openExternal ? desk()!.openExternal!(DOCS_URL) : window.open(DOCS_URL, "_blank"))}
            title="Docs"
            className="flex items-center justify-center md:justify-start gap-2.5 h-9 px-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors w-full text-left"
          >
            <BookOpen className="size-4 shrink-0" /> <span className="hidden md:inline">Docs</span> <span className="ml-auto text-xs hidden md:inline">↗</span>
          </button>
          {/* Log out of Classgrid Code only (the Classgrid app and the website stay signed in); opening a project from
              the Classgrid app signs it in again */}
          <button
            type="button"
            onClick={() => desk()?.signOut?.()}
            title="Log out"
            className="flex items-center justify-center md:justify-start gap-2.5 h-9 px-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors w-full text-left"
          >
            <LogOut className="size-4 shrink-0" /> <span className="hidden md:inline">Log out</span>
          </button>
        </nav>

        {/* Right: the chosen section */}
        <main className="flex-1 min-w-0">
          {section === "profile" && (
            <>
              <h1 className="text-xl font-semibold mb-5">Profile</h1>
              <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-5">
                {avatar("size-16", "text-2xl")}
                <div className="min-w-0 grid gap-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Name</div>
                    <div className="text-sm font-medium truncate">{name || "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="text-sm font-medium truncate">{email || "—"}</div>
                  </div>
                </div>
              </div>
            </>
          )}
          {/* (all the AI Hub's pages load at once, behind the loading screen, and stay loaded) */}
          <div className={isHubTab(section) ? "-mt-8 -mx-3 md:-mx-8" : "hidden"}>
            <AiHubModal isOpen onClose={() => {}} initialTab={isHubTab(section) ? section : "plugins"} embedded />
          </div>
          {section === "notifications" && (
            <div className="max-w-2xl"><SettingsDesktopNotificationsCard /></div>
          )}
          {section === "appearance" && (
            <>
              <h1 className="text-xl font-semibold mb-5">Appearance</h1>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3 max-w-xl">
                {([
                  { m: "light", label: "Light", icon: Sun },
                  { m: "dark", label: "Dark", icon: Moon },
                  { m: "system", label: "Same as your PC", icon: Monitor },
                ] as const).map(({ m, label, icon: Icon }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pickMode(m)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-sm text-center whitespace-nowrap transition-colors ${mode === m ? "border-foreground bg-muted" : "border-border bg-card hover:bg-muted/60"}`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Changes the whole editor: the code, the AI panel and this page.</p>
            </>
          )}
        </main>
      </div>
      <AnimatePresence>{!loaded && <ClassgridLoading />}</AnimatePresence>
    </div>
  );
}
