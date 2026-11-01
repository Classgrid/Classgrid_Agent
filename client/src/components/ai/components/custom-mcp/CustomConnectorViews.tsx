// Custom connectors in AI Hub > Plugins: logo, list card and the detail pages (log in, tools, turn off, remove)
import React, { useState } from "react";
import { ChevronRight, LogIn, LogOut, MessageSquare, Plug, Power, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/marketing_ui/spinner";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { cn } from "@/lib/utils";
import { mcpApi, loginToServer, openLoginPopup, iconFilter, type CustomMcpServer, type McpCatalogApp } from "./customMcpApi";
import {
  PluginHeader, PluginLogo, StatusLabel, Notice, TryPrompts, ToolsSection, InfoSection, FeatureList, CopyValue,
  solidBtn, sectionTitle, formatDate, hostOf, LOGIN_TEXT, type MenuItem, type PluginTool, type StatusTone,
} from "../plugins/PluginUi";

export function ConnectorLogo({ src, name, invert, className }: { src?: string; name: string; invert?: boolean; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return <span className={cn("flex items-center justify-center font-semibold text-muted-foreground", className)}>{name.trim().charAt(0).toUpperCase() || "?"}</span>;
  }
  return <img src={src} alt={name} className={cn("object-contain", className)} style={{ filter: iconFilter(invert) }} onError={() => setBroken(true)} />;
}

const STATUS_TEXT: Record<CustomMcpServer["status"], string> = { connected: "Connected", needs_login: "Needs login", error: "Can't connect" };
const STATUS_TONE: Record<CustomMcpServer["status"], StatusTone> = { connected: "ok", needs_login: "warn", error: "error" };

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

/** Status of a custom connector, for its card and page */
export const connectorStatus = (s: CustomMcpServer): { tone: StatusTone; label: string } =>
  !s.enabled ? { tone: "off", label: "Turned off" } : { tone: STATUS_TONE[s.status], label: STATUS_TEXT[s.status] };

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

  const connected = server.status === "connected";
  const status = connectorStatus(server);
  const tools: PluginTool[] = server.tools.map((t) => ({
    name: t.name,
    label: t.title || undefined,
    description: t.description,
    readOnly: typeof t.annotations?.readOnlyHint === "boolean" ? t.annotations.readOnlyHint : undefined,
    destructive: t.annotations?.destructiveHint === true && t.annotations?.readOnlyHint !== true,
  }));
  const menu: MenuItem[] = [
    { label: busy === "refresh" ? "Refreshing..." : "Refresh tools", icon: RefreshCw, disabled: !!busy, onClick: () => run("refresh", async () => { onChanged(await mcpApi.refresh(server.id)); toast.success("Tools refreshed"); }) },
    { label: server.enabled ? "Turn off" : "Turn on", icon: Power, disabled: !!busy, onClick: () => run("toggle", async () => onChanged(await mcpApi.update(server.id, { enabled: !server.enabled }))) },
    ...(server.authType === "oauth" && connected ? [{ label: "Log out", icon: LogOut, disabled: !!busy, onClick: () => run("logout", async () => onChanged(await mcpApi.logout(server.id))) }] : []),
    { label: "Disconnect", icon: Unplug, danger: true, disabled: !!busy, onClick: () => setConfirmRemove(true) },
  ];
  const host = hostOf(server.url);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col max-w-3xl mx-auto pb-8">
      <PluginHeader
        onBack={onBack}
        logo={<PluginLogo src={server.iconUrl} name={server.name} invert={server.invertInDarkMode} size="lg" />}
        name={server.name}
        subtitle={server.description || "Custom connector"}
        status={<StatusLabel tone={status.tone} label={status.label} />}
        action={!connected ? (
          <button onClick={login} disabled={!!busy} className={solidBtn}>
            {busy === "login" ? <Spinner className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {server.authType === "oauth" ? "Log in" : "Try again"}
          </button>
        ) : onTry && server.enabled ? (
          <button onClick={() => onTry(`What can you do with ${server.name}?`)} className={solidBtn}>
            <MessageSquare className="w-4 h-4" />
            Try in chat
          </button>
        ) : undefined}
        menu={menu}
      />

      {server.status === "error" && server.lastError && <Notice tone="error">{server.lastError}</Notice>}
      {server.status === "needs_login" && <Notice>Log in to {server.name} so Classgrid AI can use it.</Notice>}
      {connected && !server.enabled && <Notice>{server.name} is turned off. Classgrid AI won't use it until you turn it on from the ⋯ menu.</Notice>}

      {connected && server.enabled && onTry && (
        <TryPrompts name={server.name} prompts={[`What can you do with ${server.name}?`, `Use ${server.name} to show me my latest items`]} onTry={onTry} />
      )}

      <ToolsSection tools={tools} emptyText={connected ? "This server has no tools." : "Log in to see what this connector can do."} />

      <InfoSection rows={[
        { label: "Developer", value: host },
        { label: "Server URL", value: <CopyValue value={server.url} /> },
        { label: "Login", value: LOGIN_TEXT[server.authType] },
        { label: "Added", value: formatDate(server.createdAt) },
        { label: "Tools updated", value: formatDate(server.toolsFetchedAt) },
      ]} />

      <p className="text-xs text-muted-foreground">This connector is run by {host || "another company"}, not Classgrid. Classgrid AI asks you before it sends, deletes or changes anything.</p>

      <DangerConfirmDialog
        open={confirmRemove}
        onOpenChange={(open) => { if (!open && busy !== "remove") setConfirmRemove(false); }}
        title={`Disconnect ${server.name}`}
        description={`Classgrid AI will stop using ${server.name}. You can connect it again any time.`}
        warningMessage={`Your ${server.name} login is removed from Classgrid.`}
        actionLabel="Disconnect"
        isLoading={busy === "remove"}
        onConfirm={() => run("remove", async () => { await mcpApi.remove(server.id); setConfirmRemove(false); onRemoved(server.id); toast.success(`${server.name} disconnected`); })}
      />
    </div>
  );
}

const inputCls = "w-full h-10 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 transition-colors";

/** Detail page of a known MCP app that isn't added yet */
export function CatalogAppDetail({ app, onBack, onAdded }: { app: McpCatalogApp; onBack: () => void; onAdded: (s: CustomMcpServer) => void }) {
  const [busy, setBusy] = useState(false);
  // Apps with their own address per user (n8n): the user types it, and logs in or gives an access token
  const [ownUrl, setOwnUrl] = useState("");
  const [useToken, setUseToken] = useState(false);
  const [token, setToken] = useState("");
  const authType = app.askUrl && useToken ? "api_key" : app.auth;
  // Apps that only connect with the user's own API key (Render)
  const keyOnly = app.auth === "api_key";
  const ready = (!app.askUrl || (/^https:\/\/\S+$/i.test(ownUrl.trim()) && (!useToken || token.trim()))) && (!keyOnly || !!token.trim());
  const connect = async () => {
    if (!ready) return;
    setBusy(true);
    const popup = authType === "oauth" ? openLoginPopup() : null;
    try {
      const created = await mcpApi.create({
        name: app.name, description: app.description, url: app.askUrl ? ownUrl.trim() : app.url, authType, catalogId: app.id, iconUrl: app.logo,
        apiKey: authType === "api_key" ? token.trim() : undefined,
      });
      const final = authType === "oauth" ? (await loginToServer(created.id, popup)) || created : created;
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
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col max-w-3xl mx-auto pb-8">
      <PluginHeader
        onBack={onBack}
        logo={<PluginLogo src={app.logo} name={app.name} invert={app.invertInDarkMode} size="lg" />}
        name={app.name}
        subtitle={app.description}
        status={<StatusLabel tone="off" label="Not connected" />}
        action={
          <button onClick={connect} disabled={busy || !ready} className={solidBtn} title={ready ? undefined : "Fill in the details below first"}>
            {busy ? <Spinner className="w-4 h-4" /> : <Plug className="w-4 h-4" />}
            Connect
          </button>
        }
      />

      {(app.askUrl || keyOnly) && (
        <section className="mb-8 rounded-xl border border-border p-5 space-y-4">
          <div>
            <h3 className={sectionTitle}>Set up</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Fill this in, then click Connect.</p>
          </div>
          {app.askUrl && (
            <>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Your {app.name} address</p>
                <input value={ownUrl} onChange={(e) => setOwnUrl(e.target.value)} placeholder={app.askUrl.placeholder} className={inputCls} />
                {ownUrl.trim() && !/^https:\/\/\S+$/i.test(ownUrl.trim())
                  ? <p className="text-xs text-destructive">This should be a web address starting with https://, like {app.askUrl.placeholder}</p>
                  : <p className="text-xs text-muted-foreground">{app.askUrl.hint}</p>}
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer w-fit">
                <input type="checkbox" checked={useToken} onChange={(e) => setUseToken(e.target.checked)} className="w-4 h-4 accent-foreground" />
                Use an access token instead of logging in
              </label>
              {useToken && <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Access token" className={inputCls} />}
            </>
          )}
          {keyOnly && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Your {app.name} API key</p>
              <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="API key" className={inputCls} />
              {app.keyHint && <p className="text-xs text-muted-foreground">{app.keyHint}</p>}
            </div>
          )}
        </section>
      )}

      <FeatureList items={[
        `Let Classgrid AI use ${app.name} for you`,
        app.auth === "oauth" ? `Log in with your own ${app.name} account` : keyOnly ? `Connect with your own ${app.name} API key` : "No login needed",
        "Classgrid AI asks you before it sends, deletes or changes anything",
        "Turn it off or remove it any time",
      ]} />

      <ToolsSection tools={[]} emptyText={`Connect ${app.name} to see its tools.`} />

      <InfoSection rows={[
        { label: "Developer", value: hostOf(app.url) },
        { label: "Login", value: LOGIN_TEXT[app.auth] },
        { label: "Server URL", value: app.url ? <CopyValue value={app.url} /> : "Your own address" },
      ]} />
    </div>
  );
}
