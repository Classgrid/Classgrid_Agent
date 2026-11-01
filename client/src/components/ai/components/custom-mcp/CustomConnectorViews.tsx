// Custom connectors in AI Hub > Plugins: logo, list card and the detail page (log in, tools, turn off, remove)
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, LogIn, RefreshCw, Trash2, Wrench, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";
import { mcpApi, loginToServer, openLoginPopup, iconFilter, type CustomMcpServer, type McpCatalogApp } from "./customMcpApi";

export function ConnectorLogo({ src, name, invert, className }: { src?: string; name: string; invert?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <span className={cn("flex items-center justify-center font-semibold text-muted-foreground", className)}>{name.trim().charAt(0).toUpperCase() || "?"}</span>;
  }
  return <img src={src} alt={name} className={cn("object-contain", className)} style={{ filter: iconFilter(invert) }} onError={() => setBroken(true)} />;
}

const STATUS_TEXT: Record<CustomMcpServer["status"], string> = { connected: "Connected", needs_login: "Needs login", error: "Can't connect" };

/** One card in the plugins grid (custom connector or a known MCP app) */
export function ConnectorCard({ name, description, logo, invert, badge, onClick }: { name: string; description: string; logo?: string; invert?: boolean; badge?: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-background border border-border rounded-xl p-5 hover:border-foreground/20 hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-between shadow-sm"
    >
      <div className="flex items-center gap-4 min-w-0 pr-4">
        <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center shrink-0 bg-background overflow-hidden shadow-sm">
          <ConnectorLogo src={logo} name={name} invert={invert} className="w-6 h-6" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-foreground truncate flex items-center gap-2">
            {name}
            {badge && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-border text-muted-foreground">{badge}</span>}
          </span>
          <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{description || "Custom connector"}</span>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
    </div>
  );
}

const secondaryBtn = "h-9 px-4 rounded-lg border-border bg-accent text-sm font-medium text-foreground/90 hover:bg-slate-200 dark:hover:bg-accent/80 hover:text-foreground";

/** Detail page of a custom connector */
export function CustomConnectorDetail({ server, onBack, onChanged, onRemoved, onTry }: {
  server: CustomMcpServer;
  onBack: () => void;
  onChanged: (s: CustomMcpServer) => void;
  onRemoved: (id: string) => void;
  onTry?: (prompt: string) => void;
}) {
  const [busy, setBusy] = useState<"" | "login" | "refresh" | "remove" | "toggle" | "logout">("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  const run = async (kind: typeof busy, fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); } catch (err: any) { toast.error(err?.message || "Something went wrong."); } finally { setBusy(""); }
  };

  const login = () => {
    const popup = server.authType === "oauth" ? openLoginPopup() : null;
    return run("login", async () => {
      const s = server.authType === "oauth" ? await loginToServer(server.id, popup) : await mcpApi.refresh(server.id);
      if (s) {
        onChanged(s);
        if (s.status === "connected") toast.success(`${s.name} connected`);
        else if (s.status === "error") toast.error(s.lastError || "Couldn't connect");
      }
    });
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors w-fit group">
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to plugins
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl border border-border flex items-center justify-center shrink-0 bg-background overflow-hidden shadow-sm">
          <ConnectorLogo src={server.iconUrl} name={server.name} invert={server.invertInDarkMode} className="w-8 h-8" />
        </div>
        <div className="min-w-0">
          <h2 className="text-3xl font-bold text-foreground truncate">{server.name}</h2>
          <p className="text-sm text-muted-foreground">{server.description || "Custom connector (MCP)"}</p>
          <p className="text-xs text-muted-foreground font-mono truncate mt-1">{server.url}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <span className={cn(
          "flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg",
          server.status === "connected" ? "text-emerald-600 dark:text-emerald-500 bg-emerald-500/10" : server.status === "error" ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted"
        )}>
          {server.status === "connected" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {STATUS_TEXT[server.status]}{!server.enabled && " · Off"}
        </span>
        {server.status !== "connected" && (
          <Button variant="outline" onClick={login} disabled={!!busy} className={secondaryBtn}>
            {busy === "login" ? <Spinner className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
            {server.authType === "oauth" ? "Log in" : "Try again"}
          </Button>
        )}
        <Button variant="outline" onClick={() => run("refresh", async () => onChanged(await mcpApi.refresh(server.id)))} disabled={!!busy} className={secondaryBtn}>
          {busy === "refresh" ? <Spinner className="w-4 h-4 mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Refresh tools
        </Button>
        <Button variant="outline" onClick={() => run("toggle", async () => onChanged(await mcpApi.update(server.id, { enabled: !server.enabled })))} disabled={!!busy} className={secondaryBtn}>
          {busy === "toggle" ? <Spinner className="w-4 h-4 mr-2" /> : null}
          {server.enabled ? "Turn off" : "Turn on"}
        </Button>
        {server.authType === "oauth" && server.status === "connected" && (
          <Button variant="outline" onClick={() => run("logout", async () => onChanged(await mcpApi.logout(server.id)))} disabled={!!busy} className={secondaryBtn}>
            Log out
          </Button>
        )}
        {confirmRemove ? (
          <span className="flex items-center gap-2">
            <Button variant="outline" onClick={() => run("remove", async () => { await mcpApi.remove(server.id); onRemoved(server.id); toast.success(`${server.name} removed`); })} disabled={!!busy} className="h-9 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30">
              {busy === "remove" ? <Spinner className="w-4 h-4 mr-2" /> : null}
              Yes, remove
            </Button>
            <Button variant="ghost" onClick={() => setConfirmRemove(false)} className="h-9 px-3 text-sm">Cancel</Button>
          </span>
        ) : (
          <Button variant="outline" onClick={() => setConfirmRemove(true)} disabled={!!busy} className="h-9 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20">
            <Trash2 className="w-4 h-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {server.status === "error" && server.lastError && (
        <p className="text-sm text-destructive mb-6 break-words">{server.lastError}</p>
      )}

      {server.status === "connected" && onTry && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Zap className="w-4 h-4" />Try asking the AI</h3>
          <div className="flex flex-col gap-2">
            {[`What can you do with ${server.name}?`, `Use ${server.name} to show me my latest items`].map((msg) => (
              <button key={msg} onClick={() => onTry(msg)} className="text-left px-4 py-3 rounded-lg border border-border bg-muted/30 hover:bg-accent hover:border-foreground/20 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground shadow-sm flex items-center justify-between group">
                <span>"{msg}"</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pb-8">
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><Wrench className="w-4 h-4" />Tools ({server.tools.length})</h3>
        {server.tools.length === 0 ? (
          <p className="text-sm text-muted-foreground">{server.status === "connected" ? "This server has no tools." : "Log in to see what this connector can do."}</p>
        ) : (
          <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden">
            {server.tools.map((t) => (
              <li key={t.name} className="px-4 py-3">
                <p className="text-sm font-medium text-foreground font-mono">{t.name}</p>
                {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{t.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Detail page of a known MCP app that isn't added yet */
export function CatalogAppDetail({ app, onBack, onAdded }: { app: McpCatalogApp; onBack: () => void; onAdded: (s: CustomMcpServer) => void }) {
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setBusy(true);
    const popup = app.auth === "oauth" ? openLoginPopup() : null;
    try {
      const created = await mcpApi.create({ name: app.name, description: app.description, url: app.url, authType: app.auth, catalogId: app.id, iconUrl: app.logo });
      const final = app.auth === "oauth" ? (await loginToServer(created.id, popup)) || created : created;
      // It only counts as added once the login really worked
      if (final.status === "connected") {
        toast.success(`${final.name} connected`);
        onAdded(final);
      } else if (final.status === "error") toast.error(`${final.name}: ${final.lastError || "couldn't connect"}`);
      else toast(`${app.name} isn't connected yet. Finish the login to add it.`);
    } catch (err: any) {
      popup?.close();
      toast.error(err?.message || "Couldn't connect.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors w-fit group">
        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Back to plugins
      </button>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl border border-border flex items-center justify-center shrink-0 bg-background overflow-hidden shadow-sm">
          <ConnectorLogo src={app.logo} name={app.name} invert={app.invertInDarkMode} className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-foreground">{app.name}</h2>
          <p className="text-sm text-muted-foreground">{app.description}</p>
        </div>
      </div>
      <ul className="space-y-3 mb-6">
        {[`Let Classgrid use ${app.name} for you`, app.auth === "oauth" ? `Log in with your own ${app.name} account` : "No login needed", `Made by ${app.name}, connected through MCP`].map((f) => (
          <li key={f} className="flex items-start gap-3 text-muted-foreground text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Button variant="outline" onClick={connect} disabled={busy} className={cn(secondaryBtn, "h-10 w-fit px-6")}>
        {busy ? <Spinner className="w-4 h-4 mr-2" /> : null}
        {app.auth === "oauth" ? "Connect and log in" : "Connect"}
      </Button>
    </div>
  );
}
