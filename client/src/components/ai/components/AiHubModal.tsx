/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Plug, Zap, TerminalSquare, Settings,  Activity, 
  Coins,  
  ArrowUpCircle,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Settings2,
  Sparkles,
  CreditCard,
  MessageSquare,
  Wand2,
  Image as ImageIcon,
  KeyRound,
  Search,
  Plus
} from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { fetchWithRescue } from "@/lib/rescue";
import { INTEGRATIONS_LIST } from "./AskAiPanel";
import { Button } from "@/components/marketing_ui/button";
import { WhatsappConfigModal } from "./WhatsappConfigModal";
import { SanityConfigModal } from "./SanityConfigModal";

import { AiImagesGallery } from "./AiImagesGallery";
import { AiUsageBar } from "./AiUsageBar";
import { ClaudeUsageBar } from "./credits/ClaudeUsageBar";
import { AiSkillsPanel } from "./skills/AiSkillsPanel";
import { AiConnectedAppsPanel } from "./connected-apps/AiConnectedAppsPanel";
import { AddConnectorModal } from "./custom-mcp/AddConnectorModal";
import { CustomConnectorDetail, CatalogAppDetail, connectorStatus } from "./custom-mcp/CustomConnectorViews";
import { PluginCard, PluginGrid, outlineBtn, type PluginTool } from "./plugins/PluginUi";
import { BuiltinPluginDetail, BUILTIN_META } from "./plugins/BuiltinPluginDetail";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { mcpApi, type CustomMcpServer, type McpCatalogApp } from "./custom-mcp/customMcpApi";

interface AiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPrompt?: (prompt: string) => void;
  initialTab?: string;
  // Classgrid Code's Settings tab: only the tab's page, in place (its own menu is the Settings menu)
  embedded?: boolean;
}

export const AI_HUB_TABS = [
  { id: "plugins", label: "Plugins", icon: Plug },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "skills", label: "Skills", icon: Zap },
  // Outside apps (Claude, Cursor, ChatGPT) allowed through the Classgrid OAuth consent page
  { id: "connected-apps", label: "Connected apps", icon: KeyRound },
  // Usage only: the models' usage. Plan, credits and upgrading live in Settings (owner, 2026-11-14)
  { id: "usage", label: "Usage", icon: Activity },
];

const KEEP_LISTS = import.meta.env.VITE_DESKTOP === "1";

export function AiHubModal({ isOpen, onClose, onSendPrompt, initialTab = "plugins", embedded = false }: AiHubModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CLASSGRID_PAYMENT_SUCCESS") {
        setActiveTab("usage");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const [selectedPlugin, setSelectedPlugin] = useState<any>(null);
  const [connectedPlugins, setConnectedPlugins] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const statusLoaded = React.useRef(false);
  const [showWhatsappConfig, setShowWhatsappConfig] = useState(false);
  const [showSanityConfig, setShowSanityConfig] = useState(false);
  // Custom connectors (custom MCP servers) and known MCP apps
  const [customServers, setCustomServers] = useState<CustomMcpServer[]>([]);
  const [mcpCatalog, setMcpCatalog] = useState<McpCatalogApp[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<McpCatalogApp | null>(null);
  const [showAddConnector, setShowAddConnector] = useState(false);
  const [pluginQuery, setPluginQuery] = useState("");
  const [pluginFilter, setPluginFilter] = useState<"all" | "connected" | "available">("all");
  // Tools of each built-in plugin, for the Tools list on its page
  const [builtinTools, setBuiltinTools] = useState<Record<string, PluginTool[]>>({});
  const [toolsLoading, setToolsLoading] = useState(false);


  const backendUrl = typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
    : "";

  // Reset selected plugin if tab changes
  React.useEffect(() => {
     setSelectedPlugin(null);
     setSelectedCustomId(null);
     setSelectedApp(null);
  }, [activeTab]);

  const loadCustomServers = () => mcpApi.list().then(setCustomServers).catch(() => {});
  // The desktop app and Classgrid Code load the plugin lists once in the background and keep them, so Plugins opens
  // with the list already there (refreshed quietly) instead of grey boxes every time. The website is unchanged.
  React.useEffect(() => {
    if (!KEEP_LISTS) return;
    fetchStatus();
    loadCustomServers();
    mcpApi.catalog().then(setMcpCatalog).catch(() => {});
  }, []);
  React.useEffect(() => {
    if (!isOpen) return;
    loadCustomServers();
    mcpApi.catalog().then(setMcpCatalog).catch(() => {});
    // A login finished in another window: show the new status
    const onFocus = () => loadCustomServers();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [isOpen]);

  const upsertServer = (s: CustomMcpServer) => setCustomServers((prev) => prev.some((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [...prev, s]);
  const q = pluginQuery.trim().toLowerCase();
  const matches = (...texts: (string | undefined)[]) => !q || texts.some((t) => String(t || "").toLowerCase().includes(q));
  const selectedCustom = customServers.find((s) => s.id === selectedCustomId) || null;
  // Only connectors that really got connected (logged in at least once) show under "Your connectors";
  // one whose login never finished stays in "More apps"
  const connectedServers = customServers.filter((s) => s.status === "connected" || !!s.toolsFetchedAt);
  const addedCatalogIds = new Set(connectedServers.map((s) => s.catalogId).filter(Boolean));
  const customMatches = connectedServers.filter((s) => matches(s.name, s.description));
  const builtinMatches = INTEGRATIONS_LIST.filter((i) => i.type !== "action" && matches(i.name, i.description));
  const catalogMatches = mcpCatalog.filter((a) => !addedCatalogIds.has(a.id) && matches(a.name, a.description));
  const builtinConnected = builtinMatches.filter((i) => connectedPlugins.includes(i.id));
  const builtinOther = builtinMatches.filter((i) => !connectedPlugins.includes(i.id));
  const shownCount = (pluginFilter !== "available" ? customMatches.length + builtinConnected.length : 0) + (pluginFilter !== "connected" ? builtinOther.length + catalogMatches.length : 0);

  // ── REAL backend status check on mount ──
  const fetchStatus = async () => {
    try {
      const res = await fetchWithRescue(backendUrl + "/api/ai-integrations/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.connected && Array.isArray(data.connected)) {
          setConnectedPlugins(data.connected);
        }
        statusLoaded.current = true;
      }
    } catch (err) {
      console.error("Failed to fetch integration status:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      if (!KEEP_LISTS || !statusLoaded.current) setLoadingStatus(true);
      fetchStatus();
    }
  }, [isOpen]);
  // Desktop app: a login finished in the computer's browser shows here when the user comes back to the app
  React.useEffect(() => {
    if (!isOpen || import.meta.env.VITE_DESKTOP !== "1") return;
    const again = () => { fetchStatus(); };
    window.addEventListener("focus", again);
    return () => window.removeEventListener("focus", again);
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || Object.keys(builtinTools).length) return;
    setToolsLoading(true);
    fetchWithRescue(backendUrl + "/api/ai-integrations/tools", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.plugins) setBuiltinTools(d.plugins); })
      .catch(() => {})
      .finally(() => setToolsLoading(false));
  }, [isOpen]);

  const handleConnect = async (id: string, name: string) => {
    setIsConnecting(true);
    try {
      const isGoogle = ['gmail', 'gcal', 'gdrive', 'gclass', 'gmeet', 'gforms', 'youtube'].includes(id);
      const isMicrosoft = id === 'outlook' || id === 'teams';
      
      if (id === 'whatsapp') {
        setIsConnecting(false);
        setShowWhatsappConfig(true);
        return;
      }
      
      if (id === 'sanity') {
        setIsConnecting(false);
        setShowSanityConfig(true);
        return;
      }
      
      let endpoint = '';
      if (id === 'facebook' || id === 'instagram') {
        endpoint = `/api/auth/meta/oauth?type=${id}`;
      } else if (isGoogle) {
        const service = id === 'gcal' ? 'calendar' : id === 'gdrive' ? 'drive' : id === 'gclass' ? 'classroom' : id === 'gmeet' ? 'meet' : id === 'gforms' ? 'forms' : id === 'youtube' ? 'youtube' : 'gmail';
        endpoint = `/api/google-workspace/connect?service=${service}&returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (isMicrosoft) {
        endpoint = `/api/auth/microsoft/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'mcp-notion') {
        endpoint = `/api/auth/notion/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'vercel') {
        endpoint = `/api/auth/vercel/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'zoom') {
        endpoint = `/api/zoom/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'slack') {
        endpoint = `/api/auth/slack/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'canva') {
        endpoint = `/api/auth/canva/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'spotify') {
        endpoint = `/api/auth/spotify/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'github') {
        endpoint = `/api/auth/github/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'supabase') {
        endpoint = `/api/auth/supabase/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else {
        endpoint = `/api/ai-integrations/connect/${id}?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      }

      const res = await fetchWithRescue(backendUrl + endpoint, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      
      const data = await res.json();
      if (data.url) {
        // Open OAuth in a popup window
        const width = 600;
        const height = 700;
        const left = (window.innerWidth - width) / 2;
        const top = (window.innerHeight - height) / 2;
        const popup = window.open(
          data.url, 
          'OAuth', 
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
        );
        
        // Desktop app: the login opens in the computer's own browser (no window here), so only the polling below
        // tells when it's done
        const inBrowser = !popup && !!(window as unknown as { classgridDesktop?: { isDesktop?: boolean } }).classgridDesktop?.isDesktop;
        if (!popup && !inBrowser) {
          setIsConnecting(false);
          toast.error("Popup blocked. Please allow popups for this site.");
          return;
        }

        // Poll backend every 2 seconds to check if token was saved
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetchWithRescue(backendUrl + "/api/ai-integrations/status", {
              method: "GET",
              headers: { "Content-Type": "application/json" },
              credentials: "include"
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              if (statusData.connected && statusData.connected.includes(id)) {
                // REAL connection confirmed by backend!
                clearInterval(pollInterval);
                setConnectedPlugins(statusData.connected);
                setIsConnecting(false);
                toast.success(`${name} connected successfully!`);
                if (popup && !popup.closed) popup.close();
                
                // Wake up the AI automatically!
                if (onSendPrompt) {
                  onSendPrompt(`[SYSTEM: I have successfully connected ${name}! Please proceed with executing the original task I requested.]`);
                }
              }
            }
          } catch (e) {
            // Ignore polling errors
          }

          // If user closed the popup manually, stop polling after a grace period
          if (popup?.closed) {
            // Give 3 more seconds for the backend to finalize the token
            setTimeout(async () => {
              try {
                const finalRes = await fetchWithRescue(backendUrl + "/api/ai-integrations/status", {
                  method: "GET",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include"
                });
                if (finalRes.ok) {
                  const finalData = await finalRes.json();
                  if (finalData.connected && finalData.connected.includes(id)) {
                    setConnectedPlugins(finalData.connected);
                    toast.success(`${name} connected successfully!`);
                  }
                }
              } catch (e) { /* ignore */ }
              clearInterval(pollInterval);
              setIsConnecting(false);
            }, 3000);
          }
        }, 2000);

        // Safety timeout — stop polling after 2 minutes max
        setTimeout(() => {
          clearInterval(pollInterval);
          setIsConnecting(false);
        }, 120000);

      } else if (data.success) {
        // Direct connection (no OAuth popup needed, e.g. MCP plugins)
        toast.success(`${name} connected successfully!`);
        await fetchStatus(); // Refresh from backend
        setIsConnecting(false);
      } else {
        toast.error(data.message || `Failed to connect ${name}`);
        setIsConnecting(false);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error connecting to ${name}`);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (id: string, name: string) => {
    setIsDisconnecting(true);
    try {
      const isGoogle = ['gmail', 'gcal', 'gdrive', 'gclass', 'gmeet', 'gforms', 'youtube'].includes(id);
      const isMicrosoft = id === 'outlook' || id === 'teams';
      
      let endpoint = '';
      if (isGoogle) {
        endpoint = `/api/google-workspace/disconnect?service=${id}`;
      } else if (isMicrosoft) {
        endpoint = `/api/auth/microsoft/disconnect`;
      } else if (id === 'mcp-notion') {
        endpoint = `/api/auth/notion/disconnect`;
      } else if (id === 'vercel') {
        endpoint = `/api/auth/vercel/disconnect`;
      } else if (id === 'zoom') {
        endpoint = `/api/zoom/disconnect`;
      } else if (id === 'slack') {
        endpoint = `/api/auth/slack/disconnect`;
      } else if (id === 'canva') {
        endpoint = `/api/auth/canva/disconnect`;
      } else if (id === 'spotify') {
        endpoint = `/api/auth/spotify/disconnect`;
      } else if (id === 'github') {
        endpoint = `/api/auth/github/disconnect`;
      } else if (id === 'supabase') {
        endpoint = `/api/auth/supabase/disconnect`;
      } else if (id === 'sanity') {
        endpoint = `/api/sanity/disconnect`;
      } else if (id === 'facebook' || id === 'instagram') {
        endpoint = `/api/auth/meta/disconnect/${id}`;
      } else {
        endpoint = `/api/ai-integrations/disconnect/${id}`;
      }

      if (endpoint) {
        // Shown as disconnected at once; the server is told behind (put back if it says no)
        const before = connectedPlugins;
        setConnectedPlugins((list) => list.filter((x) => x !== id));
        toast.success(`${name} disconnected successfully`);
        const method = (id === 'slack' || id === 'github' || id === 'canva' || id === 'spotify') ? 'DELETE' : 'POST';
        const res = await fetchWithRescue(backendUrl + endpoint, { method, credentials: 'include' });
        if (res.ok) {
          window.dispatchEvent(new Event("classgrid:integrations-changed")); // e.g. Project Mode re-checks GitHub
          void fetchStatus();
        } else {
          setConnectedPlugins(before);
          toast.error(`Failed to disconnect ${name}`);
        }
      } else {
        toast.error(`Cannot disconnect ${name} from here`);
      }
    } catch (err) {
      toast.error(`Error disconnecting from ${name}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  const getPluginFeatures = (name: string, id?: string) => {
    switch (id) {
      case "image": return ["Generate custom images from text prompts", "High-quality, photorealistic renders", "Visualize ideas instantly"];
      case "web": return ["Search the web in real-time", "Fetch up-to-date news and articles", "Fact-check information automatically"];
      case "mcp-cursor": return ["Allow Classgrid AI to access your Cursor workspace", "Sync code context and files seamlessly", "Generate and apply code snippets directly"];
      case "mcp-chatgpt": return ["Connect ChatGPT memory and context", "Use specialized GPTs inside Classgrid", "Streamlined AI conversations"];
      case "mcp-claude": return ["Integrate Claude's large context window", "Access Anthropic's advanced reasoning capabilities", "Analyze complex documents natively"];
      case "mcp-notion": return ["Search through Notion pages and databases", "Auto-draft content and sync to Notion", "Organize knowledge automatically"];
      case "gmail": return ["Draft, read, and reply to emails", "Summarize long email threads", "Automate inbox organization"];
      case "gcal": return ["Schedule meetings directly from chat", "View upcoming events and reminders", "Manage calendar conflicts intelligently"];
      case "gdrive": return ["Search documents, sheets, and presentations", "Summarize Drive files on demand", "Generate content based on existing files"];
      case "gclass": return ["Access course materials and assignments", "Draft student feedback and grading rubrics", "Sync class announcements automatically"];
      case "gmeet": return ["Generate Google Meet links instantly", "Summarize meeting transcripts", "Share meeting context with attendees"];
      case "gforms": return ["Generate custom surveys and quizzes", "Analyze form responses automatically", "Sync forms to classrooms"];
      case "outlook": return ["Manage Outlook emails seamlessly", "Summarize corporate communications", "Sync calendar and inbox data"];
      case "teams": return ["Send and read Microsoft Teams messages", "Summarize channel discussions", "Schedule Teams meetings automatically"];
      case "zoom": return ["Create Zoom meetings directly", "Retrieve recording summaries", "Invite participants effortlessly"];
      case "whatsapp": return ["Send WhatsApp messages to your contacts", "Automate customer support replies", "Broadcast important announcements"];
      case "vercel": return ["Trigger Vercel deployments", "Monitor project build status", "Manage environment variables seamlessly"];
      case "youtube": return ["Search for educational videos automatically", "Fetch channel statistics and views", "Analyze video comments and engagement"];
      case "supabase": return ["Query your Postgres database naturally", "List and manage storage buckets", "Check active projects and configurations"];
      case "sanity": return ["Query documents from your Sanity Studio", "Draft new content and articles", "Update metadata and fields programmatically"];
      case "meta": return ["Post updates to Facebook and Instagram", "Draft social media content", "Schedule cross-platform announcements"];
      default: return [
        `Allow Classgrid AI to access your ${name} workspace`,
        `Search and sync data automatically`,
        `Take actions directly from the chat interface`
      ];
    }
  };

  const getDemoMessages = (id?: string) => {
    switch (id) {
      case "mcp-notion": return ["Search my Notion for recent strategy docs", "Draft a new project spec and save to Notion", "Summarize the onboarding database in Notion", "Find the meeting notes from last Tuesday", "Create a new page in Notion for team goals"];
      case "gmail": return ["Read my unread emails from today", "Draft an email to the marketing team about the launch", "Summarize the email thread about Q3 budget", "Find the email from John sent last week", "Reply to the latest email from Sarah saying I'll review it"];
      case "gcal": return ["What's on my calendar for tomorrow?", "Schedule a 30 min sync with the engineering team for Friday", "Cancel my 2 PM meeting today", "When am I free next week?", "Move my 1-on-1 to Thursday afternoon"];
      case "gdrive": return ["Find the Q2 financial report in Drive", "Summarize the product roadmap presentation", "Search Drive for all documents mentioning 'AI integration'", "Create a new folder in Drive for Marketing Assets", "List all files I modified yesterday"];
      case "gclass": return ["List all active assignments in my Biology class", "Draft feedback for the recent essay submissions", "Create a new announcement for tomorrow's quiz", "Show me the grading rubric for the final project", "Which students haven't submitted the homework?"];
      case "gmeet": return ["Create a new Google Meet link for a quick sync", "Schedule a Google Meet for my next class", "Share the Meet link with the attendees", "Summarize the transcript from yesterday's team sync", "Start a meeting and invite the product team"];
      case "outlook": return ["Check my unread Outlook emails", "Draft a professional response to the client", "Find the invoice attachment from last month", "Summarize the weekly digest email", "Delete spam emails from my inbox"];
      case "teams": return ["Send a message to the general channel about the update", "Read the latest messages in the design channel", "Schedule a Teams meeting for the weekly standup", "Summarize the discussion in the engineering team", "Reply to Mark in Teams saying I'm on it"];
      case "zoom": return ["Schedule a Zoom meeting for 3 PM tomorrow", "Create an instant Zoom link for a quick chat", "Find the recording of the last town hall", "Summarize the Zoom transcript from the strategy session", "Cancel my scheduled Zoom meeting for today"];
      case "whatsapp": return ["Send me a WhatsApp reminder about tomorrow's meeting", "Broadcast the launch announcement via WhatsApp", "Draft a reply to a customer's question on WhatsApp", "Send the Zoom link to the team on WhatsApp", "Check if there are any unread WhatsApp messages"];
      case "vercel": return ["Check the status of the latest production deployment", "Trigger a new deployment for the staging branch", "List all active environment variables", "Show me the build logs for the last failed deployment", "Roll back to the previous successful Vercel build"];
      case "youtube": return ["Search YouTube for Next.js tutorials", "What is the sub count of MrBeast?", "Find the top comments on my latest video"];
      case "supabase": return ["List all my Supabase projects", "Query the users table for active accounts", "Show me the files in the 'avatars' storage bucket"];
      case "sanity": return ["List all published blog posts", "Create a new article draft about AI", "Update the title of the latest announcement"];
      case "facebook": return ["Post 'Happy Diwali' to my Facebook Page", "Draft a new promotional post for Facebook", "Update my followers about the new feature"];
      case "instagram": return ["Post to my Instagram Business account", "Draft a caption for an Instagram post", "Check my latest Instagram insights"];
      case "mcp-cursor": return ["Analyze the AiHubModal.tsx file in my Cursor workspace", "Find where the OAuth redirect is handled in the codebase", "Explain the authentication flow in the backend", "Draft a new React component for the settings page", "Fix the linting errors in the user controller"];
      case "mcp-chatgpt": return ["Ask ChatGPT to review this text for tone", "Generate a creative story using ChatGPT", "Brainstorm 5 marketing ideas", "Translate this document to French", "Explain quantum computing simply"];
      case "mcp-claude": return ["Analyze this 50-page PDF document", "Extract the key arguments from this research paper", "Compare these two long contracts", "Write a detailed technical specification", "Help me debug this complex logic issue"];
      default: return ["Show me what you can do with this plugin", "Search for recent activity", "List available commands", "Sync my latest data", "Help me automate a workflow"];
    }
  };

  // The chosen tab's page: inside the AI Hub window, or (embedded) right inside Classgrid Code's Settings tab
  const tabContent = (tab: string) => (
              <div className={cn("p-8 z-10 relative custom-scrollbar", !embedded && "flex-1 overflow-y-auto")}>
                {tab === "plugins" ? (
                  selectedCustom ? (
                    <CustomConnectorDetail
                      server={selectedCustom}
                      onBack={() => setSelectedCustomId(null)}
                      onChanged={upsertServer}
                      onRemoved={(id) => { setCustomServers((prev) => prev.filter((s) => s.id !== id)); setSelectedCustomId(null); }}
                      onTry={onSendPrompt ? (msg) => { onSendPrompt(msg); onClose(); } : undefined}
                    />
                  ) : selectedApp ? (
                    <CatalogAppDetail
                      app={selectedApp}
                      onBack={() => setSelectedApp(null)}
                      onAdded={(s) => { upsertServer(s); setSelectedApp(null); setSelectedCustomId(s.id); }}
                    />
                  ) : selectedPlugin ? (
                    <BuiltinPluginDetail
                      plugin={selectedPlugin}
                      connected={connectedPlugins.includes(selectedPlugin.id)}
                      connecting={isConnecting}
                      disconnecting={isDisconnecting}
                      features={getPluginFeatures(selectedPlugin.name, selectedPlugin.id)}
                      prompts={getDemoMessages(selectedPlugin.id)}
                      tools={builtinTools[selectedPlugin.id] || []}
                      toolsLoading={toolsLoading}
                      onBack={() => setSelectedPlugin(null)}
                      onConnect={() => handleConnect(selectedPlugin.id, selectedPlugin.name)}
                      onDisconnect={() => handleDisconnect(selectedPlugin.id, selectedPlugin.name)}
                      onTry={onSendPrompt ? (msg) => { onSendPrompt(msg); onClose(); } : undefined}
                    />
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pr-10">
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">Plugins</h3>
                          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
                            Connect your apps so Classgrid AI can search, read and take actions in them for you.
                          </p>
                        </div>
                        <button onClick={() => setShowAddConnector(true)} className={outlineBtn}>
                          <Plus className="w-4 h-4" />
                          Add connector
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 mb-8">
                        <div className="relative flex-1">
                          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            value={pluginQuery}
                            onChange={(e) => setPluginQuery(e.target.value)}
                            placeholder="Search plugins"
                            className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/30 transition-colors"
                          />
                        </div>
                        <div className="inline-flex p-1 rounded-lg bg-muted/60 border border-border shrink-0 self-start">
                          {([["all", "All"], ["connected", "Connected"], ["available", "Not connected"]] as const).map(([id, label]) => (
                            <button
                              key={id}
                              onClick={() => setPluginFilter(id)}
                              className={cn("px-3 h-8 rounded-md text-sm transition-colors", pluginFilter === id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {loadingStatus ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border">
                              <Skeleton className="w-11 h-11 rounded-xl" />
                              <div className="flex-1 space-y-2">
                                <Skeleton className="h-3.5 w-28" />
                                <Skeleton className="h-3 w-44" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <>
                          {pluginFilter !== "available" && (customMatches.length > 0 || builtinConnected.length > 0) && (
                            <PluginGrid title="Connected" count={customMatches.length + builtinConnected.length}>
                              {builtinConnected.map((i) => (
                                <PluginCard key={i.id} name={i.name} description={BUILTIN_META[i.id]?.description || i.description || ""} logo={i.imgUrl} icon={i.icon}
                                  invert={i.invertInDarkMode} invertLight={i.invertInLightMode} status={{ tone: "ok", label: "Connected" }} onClick={() => setSelectedPlugin(i)} />
                              ))}
                              {customMatches.map((s) => (
                                <PluginCard key={s.id} name={s.name} description={s.description || `${s.tools.length} tools`} logo={s.iconUrl}
                                  invert={s.invertInDarkMode} status={connectorStatus(s)} onClick={() => setSelectedCustomId(s.id)} />
                              ))}
                            </PluginGrid>
                          )}

                          {pluginFilter !== "connected" && builtinOther.length > 0 && (
                            <PluginGrid title="Built-in" count={builtinOther.length}>
                              {builtinOther.map((i) => (
                                <PluginCard key={i.id} name={i.name} description={BUILTIN_META[i.id]?.description || i.description || "Connect your workspace"} logo={i.imgUrl} icon={i.icon}
                                  invert={i.invertInDarkMode} invertLight={i.invertInLightMode} onClick={() => setSelectedPlugin(i)} />
                              ))}
                            </PluginGrid>
                          )}

                          {pluginFilter !== "connected" && catalogMatches.length > 0 && (
                            <PluginGrid title="More apps" count={catalogMatches.length}>
                              {catalogMatches.map((a) => (
                                <PluginCard key={a.id} name={a.name} description={a.description} logo={a.logo} invert={a.invertInDarkMode} onClick={() => setSelectedApp(a)} />
                              ))}
                            </PluginGrid>
                          )}

                          {!shownCount && (
                            <div className="flex flex-col items-center justify-center gap-3 py-12 px-4 border-2 border-dashed border-border rounded-xl text-center">
                              <Search className="w-6 h-6 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground max-w-sm">
                                {q
                                  ? <>No plugins match "{pluginQuery}". You can add any app that has an MCP server with <button onClick={() => setShowAddConnector(true)} className="text-foreground font-medium hover:underline">Add connector</button>.</>
                                  : pluginFilter === "connected" ? "Nothing connected yet. Pick an app to connect it." : "Every plugin is connected."}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                ) : tab === "images" ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                    <h3 className="text-2xl font-bold text-foreground mb-2">My Generated Images</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                      View and download all the images you've generated across all your chat sessions.
                    </p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <AiImagesGallery backendUrl={backendUrl} />
                    </div>
                  </div>
                ) : tab === "usage" ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                    <h3 className="text-2xl font-bold text-foreground mb-2">AI Usage</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                      Monitor your AI token usage and limits across your personal account and organization.
                    </p>
                    <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-sm">
                        <AiUsageBar showExactTokens={false} />
                    </div>
                    <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-sm mt-4">
                        <ClaudeUsageBar />
                    </div>
                  </div>
                ) : tab === "skills" ? (
                  <div className="h-full flex-1">
                    <AiSkillsPanel backendUrl={backendUrl} />
                  </div>
                ) : tab === "connected-apps" ? (
                  <AiConnectedAppsPanel backendUrl={backendUrl} />
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{AI_HUB_TABS.find(t => t.id === tab)?.label}</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                      Manage your {AI_HUB_TABS.find(t => t.id === tab)?.label.toLowerCase()} configuration here.
                    </p>
                    
                    {/* Empty Placeholder Area */}
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl">
                       <p className="text-muted-foreground text-sm">Content for {tab} will go here</p>
                    </div>
                  </>
                )}
              </div>
  );
  // (embedded in Classgrid Code's Settings: every page stays loaded, so moving between them never shows loading again)
  const hubContent = embedded
    ? <>{AI_HUB_TABS.map((t) => <div key={t.id} className={t.id === activeTab ? undefined : "hidden"}>{tabContent(t.id)}</div>)}</>
    : tabContent(activeTab);

  return (
    <>
    {embedded && hubContent}
    <AnimatePresence>
      {isOpen && !embedded && (
        <motion.div
          key="ai-hub-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl h-[80vh] flex flex-col md:flex-row bg-background border border-border rounded-2xl shadow-xl overflow-hidden relative"
          >

            {/* ── Left Sidebar ── */}
            <div className="w-full md:w-[240px] shrink-0 border-r border-border bg-sidebar flex flex-col pt-4">

              {/* Tabs */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
                {AI_HUB_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive 
                          ? "bg-muted text-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Right Content Area ── */}
            <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
              {hubContent}
            </div>

            {/* Close Button (placed at the end so it renders on top) */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-[100] p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

    <WhatsappConfigModal 
      isOpen={showWhatsappConfig} 
      onClose={() => setShowWhatsappConfig(false)}
      backendUrl={backendUrl}
      onSuccess={async () => {
        await fetchStatus();
      }}
    />

    <AddConnectorModal
      isOpen={showAddConnector}
      onClose={() => setShowAddConnector(false)}
      onAdded={(s) => { upsertServer(s); setSelectedCustomId(s.id); }}
    />

    <SanityConfigModal 
      isOpen={showSanityConfig} 
      onClose={() => setShowSanityConfig(false)}
      backendUrl={backendUrl}
      onSuccess={async () => {
        await fetchStatus();
      }}
    />


    </>
  );
}
