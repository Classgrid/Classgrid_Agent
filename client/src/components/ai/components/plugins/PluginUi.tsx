// Shared pieces of the AI Hub > Plugins pages: logo tile, status, page header with actions menu, try-in-chat prompts,
// the collapsible Tools list and the Information table. Built-in plugins and custom connectors use the same ones.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronDown, Copy, MoreHorizontal, Search, Wrench, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const solidBtn = "inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/85 transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0";
export const outlineBtn = "inline-flex items-center justify-center gap-2 h-9 px-4 rounded-full border border-border bg-transparent text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none shrink-0";
export const sectionTitle = "text-[15px] font-semibold text-foreground";

export function PluginLogo({ src, icon: Icon, name, invert, invertLight, size = "md" }: {
  src?: string; icon?: React.ComponentType<{ className?: string }>; name: string; invert?: boolean; invertLight?: boolean; size?: "sm" | "md" | "lg";
}) {
  const [broken, setBroken] = useState(false);
  const box = size === "lg" ? "w-16 h-16 rounded-2xl" : size === "md" ? "w-11 h-11 rounded-xl" : "w-9 h-9 rounded-lg";
  const img = size === "lg" ? "w-9 h-9" : size === "md" ? "w-6 h-6" : "w-5 h-5";
  return (
    <div className={cn(box, "shrink-0 border border-border bg-background flex items-center justify-center overflow-hidden")}>
      {src && !broken ? (
        <img src={src} alt={name} className={cn(img, "object-contain")} onError={() => setBroken(true)}
          style={{ filter: invert ? "var(--icon-invert, none)" : invertLight ? "var(--icon-invert-light, none)" : "none" }} />
      ) : Icon ? (
        <Icon className={cn(img, "text-muted-foreground")} />
      ) : (
        <span className={cn("font-semibold text-muted-foreground", size === "lg" ? "text-2xl" : "text-base")}>{name.trim().charAt(0).toUpperCase() || "?"}</span>
      )}
    </div>
  );
}

export type StatusTone = "ok" | "warn" | "error" | "off";
const DOT: Record<StatusTone, string> = { ok: "bg-emerald-500", warn: "bg-amber-500", error: "bg-destructive", off: "bg-muted-foreground/50" };

export function StatusLabel({ tone, label, className }: { tone: StatusTone; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", DOT[tone])} />
      {label}
    </span>
  );
}

/** One card in the plugins grid */
export function PluginCard({ name, description, logo, icon, invert, invertLight, status, onClick }: {
  name: string; description: string; logo?: string; icon?: React.ComponentType<{ className?: string }>; invert?: boolean; invertLight?: boolean;
  status?: { tone: StatusTone; label: string }; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="group w-full text-left flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-background hover:bg-accent/40 hover:border-foreground/20 transition-colors">
      <PluginLogo src={logo} icon={icon} name={name} invert={invert} invertLight={invertLight} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-foreground truncate">{name}</span>
          {status && <StatusLabel tone={status.tone} label={status.label} className="shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{description}</p>
      </div>
    </button>
  );
}

export function PluginGrid({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        {title}{count !== undefined && <span className="ml-1.5 font-medium normal-case tracking-normal">{count}</span>}
      </h4>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">{children}</div>
    </section>
  );
}

export interface MenuItem { label: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void; danger?: boolean; disabled?: boolean }

function ActionsMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} className={cn(outlineBtn, "w-9 px-0")} aria-label="More actions" title="More actions">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-30 min-w-[180px] py-1 rounded-xl border border-border bg-popover shadow-lg animate-in fade-in zoom-in-95 duration-100">
          {items.map((it) => (
            <button
              key={it.label}
              disabled={it.disabled}
              onClick={() => { setOpen(false); it.onClick(); }}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors disabled:opacity-40",
                it.danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent")}
            >
              {it.icon && <it.icon className="w-4 h-4" />}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Back link, logo, name, subtitle and status, with the main action and a ⋯ menu on the right */
export function PluginHeader({ onBack, logo, name, subtitle, status, action, menu }: {
  onBack: () => void; logo: React.ReactNode; name: string; subtitle: string; status?: React.ReactNode; action?: React.ReactNode; menu?: MenuItem[];
}) {
  return (
    <>
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6 pr-10 min-w-0">
        <button onClick={onBack} className="inline-flex items-center gap-1 hover:text-foreground transition-colors group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Plugins
        </button>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground truncate">{name}</span>
      </nav>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 mb-8">
        {logo}
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-foreground truncate">{name}</h2>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{subtitle}</p>
          {status && <div className="mt-2">{status}</div>}
        </div>
        {(action || (menu && menu.length > 0)) && (
          <div className="flex items-center gap-2 shrink-0">
            {action}
            {menu && menu.length > 0 && <ActionsMenu items={menu} />}
          </div>
        )}
      </div>
    </>
  );
}

export function Notice({ tone = "warn", children }: { tone?: "warn" | "error"; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm mb-8 break-words",
      tone === "error" ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400")}>
      {children}
    </div>
  );
}

/** "Try in chat" prompts: each one sends the message to the AI */
export function TryPrompts({ name, prompts, onTry }: { name: string; prompts: string[]; onTry: (p: string) => void }) {
  if (!prompts.length) return null;
  return (
    <section className="mb-8">
      <h3 className={cn(sectionTitle, "mb-3")}>Try in chat</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {prompts.map((p) => (
          <button key={p} onClick={() => onTry(p)} className="group text-left flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-accent/60 hover:border-foreground/20 transition-colors">
            <span className="text-[11px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded-md bg-background border border-border shrink-0 mt-px">{name}</span>
            <span className="text-sm text-foreground/90 flex-1 leading-snug">{p}</span>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-px" />
          </button>
        ))}
      </div>
    </section>
  );
}

export function FeatureList({ items }: { items: string[] }) {
  return (
    <section className="mb-8">
      <h3 className={cn(sectionTitle, "mb-3")}>What it can do</h3>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5">
        {items.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-foreground/70" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export interface PluginTool { name: string; label?: string; description?: string; readOnly?: boolean; destructive?: boolean }

const humanize = (name: string) => {
  const s = name.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function ToolRow({ tool }: { tool: PluginTool }) {
  const [open, setOpen] = useState(false);
  const long = (tool.description || "").length > 140;
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{tool.label || humanize(tool.name)}</p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5 break-all">{tool.name}</p>
        </div>
        {tool.destructive ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 shrink-0">Can delete</span>
        ) : tool.readOnly !== undefined ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground shrink-0">{tool.readOnly ? "Read" : "Write"}</span>
        ) : null}
      </div>
      {tool.description && (
        <p onClick={() => long && setOpen((v) => !v)} className={cn("text-xs text-muted-foreground mt-1.5 leading-relaxed", !open && "line-clamp-2", long && "cursor-pointer")}>
          {tool.description}
        </p>
      )}
    </li>
  );
}

/** The plugin's tools, closed by default: one button opens the full list with search and a Read / Write filter */
export function ToolsSection({ tools, loading, emptyText }: { tools: PluginTool[]; loading?: boolean; emptyText: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "read" | "write">("all");
  const hasKinds = tools.some((t) => t.readOnly !== undefined);
  const reads = tools.filter((t) => t.readOnly === true).length;
  const writes = tools.filter((t) => t.readOnly === false).length;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((t) =>
      (filter === "all" || (filter === "read" ? t.readOnly === true : t.readOnly === false)) &&
      (!q || [t.name, t.label, t.description].some((x) => String(x || "").toLowerCase().includes(q))));
  }, [tools, query, filter]);

  return (
    <section className="mb-8 rounded-xl border border-border overflow-hidden">
      <div className="flex items-center gap-3.5 p-4">
        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Wrench className="w-4 h-4 text-muted-foreground" /></div>
        <div className="min-w-0 flex-1">
          <h3 className={sectionTitle}>Tools{tools.length > 0 && <span className="text-muted-foreground font-medium"> ({tools.length})</span>}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Loading tools..." : tools.length === 0 ? emptyText : hasKinds ? `${reads} read · ${writes} write · Classgrid AI picks the right one for you` : "Classgrid AI picks the right one for you"}
          </p>
        </div>
        {tools.length > 0 && (
          <button onClick={() => setOpen((v) => !v)} className={outlineBtn} aria-expanded={open}>
            {open ? "Hide tools" : "View tools"}
            <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
          </button>
        )}
      </div>
      <div className={cn("grid transition-all duration-200 ease-in-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          {open && (
            <div className="border-t border-border">
              <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-border bg-muted/20">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 transition-colors" />
                </div>
                {hasKinds && (
                  <div className="inline-flex p-1 rounded-lg bg-muted/60 border border-border shrink-0">
                    {(["all", "read", "write"] as const).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={cn("px-3 py-1 rounded-md text-sm transition-colors capitalize", filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {shown.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">No tools match.</p>
              ) : (
                <ul className="divide-y divide-border max-h-[420px] overflow-y-auto custom-scrollbar">
                  {shown.map((t) => <ToolRow key={t.name} tool={t} />)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function CopyValue({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
      <span className="font-mono text-xs truncate">{value}</span>
      <button onClick={() => navigator.clipboard.writeText(value).then(() => toast.success("Copied"), () => {})} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent shrink-0" title="Copy">
        <Copy className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

export function InfoSection({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  const list = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== "");
  if (!list.length) return null;
  return (
    <section className="mb-8">
      <h3 className={cn(sectionTitle, "mb-3")}>Information</h3>
      <dl className="rounded-xl border border-border divide-y divide-border">
        {list.map((r) => (
          <div key={r.label} className="flex items-center gap-4 px-4 py-3 min-w-0">
            <dt className="w-36 shrink-0 text-sm text-muted-foreground">{r.label}</dt>
            <dd className="min-w-0 flex-1 text-sm text-foreground flex justify-end sm:justify-start">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export const formatDate = (d?: string | null) => d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";
export const hostOf = (url?: string) => { try { return url ? new URL(url).hostname.replace(/^(www|mcp|api)\./, "") : ""; } catch { return ""; } };
export const LOGIN_TEXT: Record<string, string> = { oauth: "Log in with your account (OAuth)", api_key: "Your API key", none: "No login needed" };
