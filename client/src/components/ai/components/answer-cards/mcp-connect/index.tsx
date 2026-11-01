// Connect card in the AI's answer: when the AI adds a custom connector (custom_mcp_connector), it shows the app's
// logo and a Log in button. After the login the AI is told to carry on with the task by itself.
import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { ConnectorLogo } from "../../custom-mcp/CustomConnectorViews";
import { loginToServer, mcpApi, openLoginPopup } from "../../custom-mcp/customMcpApi";

interface CardData { id: string; name: string; description?: string; iconUrl?: string; invertInDarkMode?: boolean; status: "needs_login" | "connected" | "error"; authType: string; toolCount?: number; lastError?: string }

/** The newest card per connector from this answer's custom_mcp_connector steps */
export function collectMcpCards(steps: any[]): CardData[] {
  const byId = new Map<string, CardData>();
  for (const s of steps || []) {
    if (s?.type !== "tool" || s.tool !== "custom_mcp_connector" || s.status === "loading") continue;
    try {
      const data = typeof s.result === "string" ? JSON.parse(s.result) : s.result;
      if (data?.card?.id) byId.set(data.card.id, data.card);
    } catch { /* plain text result: no card */ }
  }
  return [...byId.values()];
}

function ConnectCard({ card, onConnected }: { card: CardData; onConnected?: (name: string) => void }) {
  const [state, setState] = useState(card);
  const [busy, setBusy] = useState(false);

  // The saved answer can be old: read the real status once
  useEffect(() => {
    mcpApi.list().then((list) => {
      const s = list.find((x) => x.id === card.id);
      if (s) setState((prev) => ({ ...prev, status: s.status, toolCount: s.tools.length, lastError: s.lastError }));
      else setState((prev) => ({ ...prev, status: "error", lastError: "This connector was removed." }));
    }).catch(() => {});
  }, [card.id]);

  const login = async () => {
    setBusy(true);
    const popup = state.authType === "oauth" ? openLoginPopup() : null;
    try {
      const s = state.authType === "oauth" ? await loginToServer(state.id, popup) : await mcpApi.refresh(state.id);
      if (!s) return;
      setState((prev) => ({ ...prev, status: s.status, toolCount: s.tools.length, lastError: s.lastError }));
      if (s.status === "connected") {
        toast.success(`${s.name} connected`);
        onConnected?.(s.name);
      } else if (s.status === "error") toast.error(s.lastError || "Couldn't connect");
    } catch (err: any) {
      popup?.close();
      toast.error(err?.message || "Couldn't log in.");
    } finally {
      setBusy(false);
    }
  };

  const removed = state.lastError === "This connector was removed.";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center shrink-0 bg-background overflow-hidden">
        <ConnectorLogo src={state.iconUrl} name={state.name} invert={state.invertInDarkMode} className="w-7 h-7" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground truncate">{state.name}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">
          {state.status === "connected"
            ? `Connected${state.toolCount ? ` · ${state.toolCount} tools` : ""}`
            : state.status === "needs_login" ? (state.description || `Log in to let Classgrid AI use ${state.name}`) : (state.lastError || "Couldn't connect")}
        </p>
      </div>
      {state.status === "connected" ? (
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground shrink-0"><CheckCircle2 className="w-4 h-4" />Connected</span>
      ) : removed ? (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0"><AlertCircle className="w-4 h-4" />Removed</span>
      ) : (
        <Button
          variant="outline"
          onClick={login}
          disabled={busy}
          className="h-9 shrink-0 rounded-full px-4 text-sm font-medium bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background"
        >
          {busy ? <Spinner className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
          {state.authType === "oauth" ? "Log in" : "Try again"}
        </Button>
      )}
    </div>
  );
}

export function McpConnectCards({ steps, onConnected }: { steps: any[]; onConnected?: (name: string) => void }) {
  const cards = collectMcpCards(steps);
  if (!cards.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {cards.map((c) => <ConnectCard key={c.id} card={c} onConnected={onConnected} />)}
    </div>
  );
}
