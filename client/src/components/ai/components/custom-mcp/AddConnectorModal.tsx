// "Add custom connector" form: any remote MCP server as a custom plugin (AI Hub > Plugins)
import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Input } from "../ui/input";
import { cn } from "@/lib/utils";
import { mcpApi, loginToServer, openLoginPopup, type CustomMcpServer } from "./customMcpApi";

const MAX_ICON_BYTES = 2 * 1024 * 1024;

const AUTH_OPTIONS = [
  { id: "oauth", label: "OAuth" },
  { id: "api_key", label: "API key" },
  { id: "none", label: "No login" },
] as const;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (server: CustomMcpServer) => void;
}

export function AddConnectorModal({ isOpen, onClose, onAdded }: Props) {
  const [icon, setIcon] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [authType, setAuthType] = useState<"oauth" | "api_key" | "none">("oauth");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyHeader, setApiKeyHeader] = useState("Authorization");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [scope, setScope] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const reset = () => {
    setIcon(""); setName(""); setDescription(""); setUrl(""); setAuthType("oauth"); setApiKey(""); setApiKeyHeader("Authorization");
    setShowAdvanced(false); setClientId(""); setClientSecret(""); setScope(""); setAgreed(false);
  };
  const close = () => { reset(); onClose(); };

  const pickIcon = (file?: File) => {
    if (!file) return;
    if (file.type !== "image/png") return toast.error("The icon must be a PNG.");
    if (file.size > MAX_ICON_BYTES) return toast.error("The icon must be 2 MB or less.");
    const reader = new FileReader();
    reader.onload = () => setIcon(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const canCreate = name.trim() && /^https:\/\/\S+$/i.test(url.trim()) && agreed && (authType !== "api_key" || apiKey.trim());

  const create = async () => {
    if (!canCreate) return;
    setSaving(true);
    // Opened on the click itself so the browser doesn't block it; filled once the server is added
    const popup = authType === "oauth" ? openLoginPopup() : null;
    try {
      const server = await mcpApi.create({
        name: name.trim(), description: description.trim(), url: url.trim(), iconUrl: icon, authType,
        apiKey: authType === "api_key" ? apiKey.trim() : undefined,
        apiKeyHeader: authType === "api_key" ? apiKeyHeader.trim() : undefined,
        oauthClientId: authType === "oauth" ? clientId.trim() || undefined : undefined,
        oauthClientSecret: authType === "oauth" ? clientSecret || undefined : undefined,
        oauthScope: authType === "oauth" ? scope.trim() || undefined : undefined,
      });
      let final = server;
      if (server.authType === "oauth") {
        final = (await loginToServer(server.id, popup).catch((e) => { toast.error(e.message); return null; })) || server;
      }
      if (final.status === "connected") toast.success(`${final.name} connected`);
      else if (final.status === "error") toast.error(`${final.name}: ${final.lastError || "couldn't connect"}`);
      onAdded(final);
      close();
    } catch (err: any) {
      popup?.close();
      toast.error(err?.message || "Couldn't add the connector.");
    } finally {
      setSaving(false);
    }
  };

  const label = "text-sm font-medium text-foreground";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60" onClick={close}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar bg-background border border-border rounded-2xl shadow-2xl relative p-6"
      >
        <div className="flex items-start justify-between mb-5">
          <h2 className="text-xl font-bold text-foreground">Add custom connector</h2>
          <button onClick={close} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-14 h-14 rounded-xl border border-border bg-muted/30 hover:bg-muted flex items-center justify-center overflow-hidden shrink-0 transition-colors"
              title="Upload icon"
            >
              {icon ? <img src={icon} alt="" className="w-full h-full object-cover" /> : <Plus className="w-5 h-5 text-muted-foreground" />}
            </button>
            <div className="min-w-0">
              <p className={label}>Icon <span className="text-muted-foreground font-normal">(optional)</span></p>
              <p className="text-xs text-muted-foreground">PNG only. Best at 192 × 192 px or larger. Max 2 MB. Leave it empty and we'll use the app's own logo.</p>
              {icon && <button type="button" onClick={() => setIcon("")} className="text-xs text-muted-foreground hover:text-foreground underline mt-0.5">Remove</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/png" className="hidden" onChange={(e) => { pickIcon(e.target.files?.[0]); e.target.value = ""; }} />
          </div>

          <div className="space-y-1.5">
            <p className={label}>Name</p>
            <Input placeholder="Custom tool" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <p className={label}>Description <span className="text-muted-foreground font-normal">(optional)</span></p>
            <Input placeholder="What it does, in a few words" value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <p className={label}>Server URL</p>
            <Input placeholder="https://example.com/mcp" value={url} onChange={(e) => setUrl(e.target.value)} className="font-mono text-sm" />
          </div>

          <div className="space-y-1.5">
            <p className={label}>Authentication</p>
            <div className="inline-flex p-1 rounded-lg bg-muted/60 border border-border">
              {AUTH_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setAuthType(o.id)}
                  className={cn("px-3 py-1.5 rounded-md text-sm transition-colors", authType === o.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {authType === "api_key" && (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
              <div className="space-y-1.5">
                <p className={label}>API key</p>
                <Input type="password" placeholder="Your key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="font-mono text-sm" />
              </div>
              <div className="space-y-1.5">
                <p className={label}>Header</p>
                <Input value={apiKeyHeader} onChange={(e) => setApiKeyHeader(e.target.value)} className="font-mono text-sm" />
              </div>
            </div>
          )}

          {authType === "oauth" && (
            <div className="rounded-xl border border-border">
              <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
                <span>
                  <span className="block text-sm font-medium text-foreground">Advanced OAuth settings</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">Most servers set this up by themselves. Only fill it in if the server gave you a client ID.</span>
                </span>
                <ChevronRight className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform", showAdvanced && "rotate-90")} />
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-3">
                  <Input placeholder="Client ID" value={clientId} onChange={(e) => setClientId(e.target.value)} className="font-mono text-sm" />
                  <Input type="password" placeholder="Client secret (optional)" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="font-mono text-sm" />
                  <Input placeholder="Scopes (optional), e.g. read write" value={scope} onChange={(e) => setScope(e.target.value)} className="font-mono text-sm" />
                  <p className="text-xs text-muted-foreground">Redirect URL to give the server: <span className="font-mono select-all">https://api.classgrid.in/api/custom-mcp/oauth/callback</span></p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Custom MCP servers are run by other companies and can be risky.
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1 w-4 h-4 accent-foreground" />
            <span>
              <span className="block text-sm font-medium text-foreground">I understand and want to continue</span>
              <span className="block text-xs text-muted-foreground mt-0.5">Only connect servers you trust. A server you don't trust could see what you share with it, or trick the AI into changing or deleting data.</span>
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button type="button" variant="outline" onClick={close} className="rounded-full">Cancel</Button>
          <Button
            type="button"
            variant="outline"
            onClick={create}
            disabled={!canCreate || saving}
            className="rounded-full bg-foreground text-background hover:bg-foreground/90 hover:text-background border-foreground disabled:opacity-40"
          >
            {saving ? <Spinner className="w-4 h-4 mr-2" /> : null}
            {authType === "oauth" ? "Create and log in" : "Create"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
