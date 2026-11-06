// Settings → Browser: the built-in browser's data, downloads and what websites can do. The desktop app has its own
// browser on this computer (desktop/browser.js); the website's Studio browser runs online (its logins can be
// cleared here). Website permissions (sites the AI always opens or never opens) are for both, kept on the server.
import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Download, FolderOpen, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/marketing_ui/switch";
import { apiClient } from "@/lib/apiClient";
import { useSettingsSection, settingsSections } from "@/features/shared/settings/settingsSections";

type Perm = "allow" | "block";
type LocalSettings = { camera: Perm; microphone: Perm; location: Perm; notifications: Perm; downloadDir: string; askWhere: boolean };
type HistoryItem = { url: string; title: string; at: number };
type DownloadItem = { id: string; name: string; url: string; file: string; size: number; state: string; at: number; exists: boolean };
type Desk = {
  browserSettings?: (patch?: Partial<LocalSettings>) => Promise<LocalSettings | null>;
  browserPickDownloadDir?: () => Promise<string | null>;
  browserHistory?: (q?: string) => Promise<HistoryItem[]>;
  browserHistoryClear?: () => Promise<boolean>;
  browserHistoryRemove?: (url: string, at: number) => Promise<boolean>;
  browserDownloads?: (q?: string) => Promise<DownloadItem[]>;
  browserDownloadAct?: (id: string, action: "open" | "show" | "remove" | "clear") => Promise<boolean>;
  browserClearData?: () => Promise<boolean>;
};
// The Classgrid app's own browser (not in Classgrid Code, and not on the website)
const desk = (): Desk | null => {
  const d = (window as unknown as { classgridDesktop?: Desk }).classgridDesktop;
  return d?.browserSettings ? d : null;
};

function Row({ title, desc, children }: { title: string; desc?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {desc && <span className="text-xs text-muted-foreground break-words">{desc}</span>}
      </div>
      {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}
    </div>
  );
}
function Section({ title, action, desc, children }: { title: string; action?: React.ReactNode; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4 mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="rounded-xl border border-border bg-card">{children}</div>
    </section>
  );
}
const btn = "h-8 px-3 rounded-lg text-[13px] font-medium bg-black/[0.05] dark:bg-white/[0.07] hover:bg-black/[0.08] dark:hover:bg-white/[0.11] text-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none";
const dangerBtn = "h-8 px-3 rounded-lg text-[13px] font-medium bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 transition-colors cursor-pointer disabled:opacity-50";

// Allow / Block, side by side
function Choice<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center rounded-lg bg-black/[0.05] dark:bg-white/[0.07] p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`h-7 px-3 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${value === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
const ALLOW_BLOCK: { id: Perm; label: string }[] = [{ id: "allow", label: "Allow" }, { id: "block", label: "Block" }];

// A button that asks once more before it does something that can't be undone
function ConfirmButton({ label, confirm, onConfirm }: { label: string; confirm: string; onConfirm: () => Promise<void> | void }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!asking) return <button type="button" className={btn} onClick={() => setAsking(true)}>{label}</button>;
  return (
    <>
      <button type="button" className={btn} onClick={() => setAsking(false)} disabled={busy}>Cancel</button>
      <button type="button" className={dangerBtn} disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setAsking(false); } }}>{busy ? "Clearing…" : confirm}</button>
    </>
  );
}

const dayOf = (at: number) => new Date(at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
const timeOf = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const hostOf = (u: string) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return u; } };
const sizeOf = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : n >= 1e3 ? `${Math.round(n / 1e3)} KB` : `${n || 0} bytes`);
// (our server's site icons, as on the AI's source chips)
const API_ORIGIN = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const favicon = (u: string) => `${API_ORIGIN}/api/ai/favicon?domain=${encodeURIComponent(hostOf(u))}`;

// "Settings › Browser › Browsing history", with a back arrow
function SubHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <button type="button" onClick={onBack} className="flex items-center justify-center size-7 rounded-md hover:bg-black/[0.05] dark:hover:bg-white/[0.07] hover:text-foreground cursor-pointer" aria-label="Back"><ArrowLeft className="size-4" /></button>
        <span>Settings</span><ChevronRight className="size-3.5" />
        <button type="button" onClick={onBack} className="hover:text-foreground cursor-pointer">Browser</button><ChevronRight className="size-3.5" />
        <span className="text-foreground">{title}</span>
      </div>
      <h2 className="text-2xl font-semibold text-foreground mt-6">{title}</h2>
    </>
  );
}
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mt-5">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-11 pl-11 pr-4 rounded-full border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40" />
    </div>
  );
}

// Browsing history: grouped by day (newest first), search, remove one, clear all
function HistoryPage({ onBack }: { onBack: () => void }) {
  const d = desk()!;
  const [q, setQ] = useState("");
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [closed, setClosed] = useState<string[]>([]);
  const load = () => d.browserHistory?.(q).then(setItems).catch(() => setItems([]));
  useEffect(() => { const t = setTimeout(load, 150); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q]);
  const days = useMemo(() => {
    const out: { day: string; items: HistoryItem[] }[] = [];
    for (const h of items || []) {
      const day = dayOf(h.at);
      if (out[out.length - 1]?.day !== day) out.push({ day, items: [] });
      out[out.length - 1]!.items.push(h);
    }
    return out;
  }, [items]);
  return (
    <div>
      <SubHeader title="Browsing history" onBack={onBack} />
      <SearchBox value={q} onChange={setQ} placeholder="Search browsing history" />
      <div className="flex items-center justify-between mt-8 mb-3">
        <h3 className="text-sm font-semibold text-foreground">All-time history</h3>
        <div className="flex items-center gap-2">
          <ConfirmButton label="Clear browsing history" confirm="Clear all" onConfirm={async () => { await d.browserHistoryClear?.(); toast.success("Browsing history cleared"); load(); }} />
        </div>
      </div>
      {items && !items.length && <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">{q ? "Nothing matches your search" : "No pages visited yet"}</div>}
      <div className="flex flex-col gap-2.5">
        {days.map(({ day, items: list }) => {
          const open = !closed.includes(day);
          return (
            <div key={day} className="rounded-xl border border-border bg-card">
              <button type="button" onClick={() => setClosed((c) => (open ? [...c, day] : c.filter((x) => x !== day)))} className="w-full flex items-center justify-between px-5 h-12 cursor-pointer">
                <span className="text-sm font-semibold text-foreground">{day}</span>
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="border-t border-border px-2 py-1">
                  {list.map((h) => (
                    <div key={`${h.at}-${h.url}`} className="group flex items-center gap-3 h-11 px-3 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                      <img src={favicon(h.url)} alt="" className="size-4 shrink-0 rounded-sm" loading="lazy" />
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground" title={h.title || h.url}>{h.title || h.url}</span>
                      <span className="hidden sm:block max-w-[220px] truncate text-[13px] text-muted-foreground">{hostOf(h.url)}</span>
                      <span className="w-[72px] shrink-0 text-right text-[13px] text-muted-foreground tabular-nums">{timeOf(h.at)}</span>
                      <button type="button" aria-label="Remove from history" title="Remove from history" onClick={async () => { await d.browserHistoryRemove?.(h.url, h.at); load(); }}
                        className="flex items-center justify-center size-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer"><X className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Download history: search, open, show in folder, remove one, clear all (the files themselves stay)
function DownloadsPage({ onBack }: { onBack: () => void }) {
  const d = desk()!;
  const [q, setQ] = useState("");
  const [items, setItems] = useState<DownloadItem[] | null>(null);
  const load = () => d.browserDownloads?.(q).then(setItems).catch(() => setItems([]));
  useEffect(() => { const t = setTimeout(load, 150); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q]);
  const act = async (id: string, action: "open" | "show" | "remove") => {
    const ok = await d.browserDownloadAct?.(id, action);
    if (!ok && action !== "remove") toast.error("That file is no longer there");
    if (action === "remove") load();
  };
  return (
    <div>
      <SubHeader title="Download history" onBack={onBack} />
      <SearchBox value={q} onChange={setQ} placeholder="Search download history" />
      <div className="flex items-center justify-between mt-8 mb-3">
        <h3 className="text-sm font-semibold text-foreground">All-time history</h3>
        {!!items?.length && <ConfirmButton label="Clear all" confirm="Clear download history" onConfirm={async () => { await d.browserDownloadAct?.("", "clear"); load(); }} />}
      </div>
      {items && !items.length ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 flex flex-col items-center text-center">
          <Download className="size-6 text-muted-foreground" />
          <p className="mt-3 text-[15px] font-semibold text-foreground">{q ? "Nothing matches your search" : "No downloads yet"}</p>
          {!q && <p className="mt-1 text-sm text-muted-foreground">Files downloaded from the built-in browser will appear here</p>}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card px-2 py-1">
          {(items || []).map((x) => (
            <div key={x.id} className="group flex items-center gap-3 min-h-14 px-3 py-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm ${x.exists ? "text-foreground" : "text-muted-foreground line-through"}`} title={x.file || x.name}>{x.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {hostOf(x.url)} · {x.state === "completed" ? sizeOf(x.size) : x.state === "progressing" ? "Downloading…" : x.state === "cancelled" ? "Cancelled" : "Failed"} · {dayOf(x.at)}, {timeOf(x.at)}
                  {x.state === "completed" && !x.exists && " · Deleted"}
                </p>
              </div>
              {x.exists && <button type="button" className={btn} onClick={() => act(x.id, "open")}>Open</button>}
              {x.exists && <button type="button" title="Show in folder" aria-label="Show in folder" className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer" onClick={() => act(x.id, "show")}><FolderOpen className="size-4" /></button>}
              <button type="button" title="Remove from history" aria-label="Remove from history" className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer" onClick={() => act(x.id, "remove")}><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Website permissions: sites the AI's browser always opens (no asking) or never opens; the others follow the mode
function WebsitePermissions() {
  const [sites, setSites] = useState<{ host: string; rule: "allow" | "block" }[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newHost, setNewHost] = useState("");
  const [newRule, setNewRule] = useState<"allow" | "block">("block");
  const load = () => apiClient.get("/api/ai/browser-sites").then((r) => setSites(r.data?.sites || [])).catch(() => setSites([]));
  useEffect(() => { void load(); }, []);
  const save = async (host: string, rule: "allow" | "block" | "ask") => {
    try { await apiClient.put("/api/ai/browser-sites", { host, rule }); await load(); return true; }
    catch (e: any) { toast.error(e?.response?.data?.error || "Couldn't save that website"); return false; }
  };
  return (
    <Section
      title="Website permissions"
      desc="Websites the AI's browser always opens without asking, or never opens. Others follow your permission mode."
      action={<button type="button" className={btn} onClick={() => setAdding((v) => !v)}>{adding ? "Cancel" : "+ Add"}</button>}
    >
      {adding && (
        <form className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-border" onSubmit={async (e) => { e.preventDefault(); if (await save(newHost, newRule)) { setNewHost(""); setAdding(false); } }}>
          <input autoFocus value={newHost} onChange={(e) => setNewHost(e.target.value)} placeholder="example.com"
            className="flex-1 min-w-[180px] h-9 px-3 rounded-lg border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-ring/40" />
          <Choice value={newRule} options={[{ id: "allow", label: "Always allow" }, { id: "block", label: "Block" }]} onChange={setNewRule} />
          <button type="submit" className={btn} disabled={!newHost.trim()}>Save</button>
        </form>
      )}
      {sites?.map((s) => (
        <Row key={s.host} title={s.host}>
          <Choice value={s.rule} options={[{ id: "allow", label: "Always allow" }, { id: "block", label: "Block" }]} onChange={(v) => void save(s.host, v)} />
          <button type="button" aria-label={`Remove ${s.host}`} title="Remove (ask again)" onClick={() => void save(s.host, "ask")}
            className="flex items-center justify-center size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.06] dark:hover:bg-white/[0.08] cursor-pointer"><X className="size-4" /></button>
        </Row>
      ))}
      {sites && !sites.length && !adding && <p className="px-5 py-4 text-xs text-muted-foreground">Only websites with their own rule appear here</p>}
    </Section>
  );
}

export function SettingsBrowserSection({ role }: { role?: string | null }) {
  const local = desk();
  const { view, go } = useSettingsSection(settingsSections({ role }));
  const [s, setS] = useState<LocalSettings | null>(null);
  useEffect(() => { local?.browserSettings?.().then(setS).catch(() => {}); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const set = async (patch: Partial<LocalSettings>) => { const next = await local?.browserSettings?.(patch); if (next) setS(next); };

  if (local && view === "history") return <HistoryPage onBack={() => go("browser")} />;
  if (local && view === "downloads") return <DownloadsPage onBack={() => go("browser")} />;

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground">Browser</h2>
      <p className="text-sm text-muted-foreground mt-1">The built-in browser's data, downloads, and what websites can do.</p>

      <Section title="General">
        {local ? (
          <>
            <Row title="Browsing data" desc="Clear browsing history, logins, site data, cache, and download history from the built-in browser">
              <ConfirmButton label="Clear browsing data" confirm="Clear everything" onConfirm={async () => { await local.browserClearData?.(); toast.success("Browsing data cleared"); }} />
            </Row>
            <Row title="Browsing history" desc="View and manage pages visited in the built-in browser">
              <button type="button" className={btn} onClick={() => go("browser", "history")}>Manage</button>
            </Row>
          </>
        ) : (
          <Row title="Browsing data" desc="Clear the logins, cookies, history and cache of Studio's online browser. It starts empty next time.">
            <ConfirmButton label="Clear browsing data" confirm="Clear everything" onConfirm={async () => {
              try { await apiClient.delete("/api/ai/browser-data"); toast.success("Browsing data cleared"); }
              catch { toast.error("Couldn't clear the browser's data. Try again."); }
            }} />
          </Row>
        )}
      </Section>

      {local && s && (
        <Section title="Downloads">
          <Row title="Location" desc={s.downloadDir}>
            <button type="button" className={btn} onClick={async () => { const dir = await local.browserPickDownloadDir?.(); if (dir) setS({ ...s, downloadDir: dir }); }}>Change</button>
          </Row>
          <Row title="Ask where to save downloads" desc="Show a save dialog for downloads you start in the built-in browser">
            <Switch checked={s.askWhere} onCheckedChange={(v) => void set({ askWhere: v })} />
          </Row>
          <Row title="Download history" desc="View and manage files downloaded from the built-in browser">
            <button type="button" className={btn} onClick={() => go("browser", "downloads")}>Manage</button>
          </Row>
        </Section>
      )}

      {local && s && (
        <Section title="Site permissions" desc="What websites in the built-in browser may use on this computer">
          <Row title="Camera" desc="Websites can ask to use your camera"><Choice value={s.camera} options={ALLOW_BLOCK} onChange={(v) => void set({ camera: v })} /></Row>
          <Row title="Microphone" desc="Websites can ask to use your microphone"><Choice value={s.microphone} options={ALLOW_BLOCK} onChange={(v) => void set({ microphone: v })} /></Row>
          <Row title="Location" desc="Websites can ask where you are"><Choice value={s.location} options={ALLOW_BLOCK} onChange={(v) => void set({ location: v })} /></Row>
          <Row title="Notifications" desc="Websites can ask to show notifications"><Choice value={s.notifications} options={ALLOW_BLOCK} onChange={(v) => void set({ notifications: v })} /></Row>
        </Section>
      )}

      <WebsitePermissions />
    </div>
  );
}
