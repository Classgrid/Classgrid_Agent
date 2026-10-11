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
  KeyRound
} from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { INTEGRATIONS_LIST } from "./AskAiPanel";
import { Button } from "@/components/marketing_ui/button";
import { WhatsappConfigModal } from "./WhatsappConfigModal";
import { SanityConfigModal } from "./SanityConfigModal";

import { AiImagesGallery } from "./AiImagesGallery";
import { AiUsageBar } from "./AiUsageBar";
import { AiCreditsPanel } from "./credits/AiCreditsPanel";
import { AiUpgradePanel } from "./credits/AiUpgradePanel";
import { AiSkillsPanel } from "./skills/AiSkillsPanel";
import { AiConnectedAppsPanel } from "./connected-apps/AiConnectedAppsPanel";

interface AiHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPrompt?: (prompt: string) => void;
  initialTab?: string;
}

const TABS = [
  { id: "plugins", label: "Plugins", icon: Plug },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "skills", label: "Skills", icon: Zap },
  // Outside apps (Claude, Cursor, ChatGPT) allowed through the Classgrid OAuth consent page
  { id: "connected-apps", label: "Connected apps", icon: KeyRound },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "credits", label: "AI Credits", icon: CreditCard },
  { id: "upgrade", label: "Upgrade", icon: ArrowUpCircle },
];

export function AiHubModal({ isOpen, onClose, onSendPrompt, initialTab = "plugins" }: AiHubModalProps) {
  const [activeTab, setActiveTab] = useState(initialTab);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "CLASSGRID_PAYMENT_SUCCESS") {
        setActiveTab("credits");
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
  const [showWhatsappConfig, setShowWhatsappConfig] = useState(false);
  const [showSanityConfig, setShowSanityConfig] = useState(false);


  const backendUrl = typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
    : "";

  // Reset selected plugin if tab changes
  React.useEffect(() => {
     setSelectedPlugin(null);
  }, [activeTab]);

  // ── REAL backend status check on mount ──
  const fetchStatus = async () => {
    try {
      const res = await fetch(backendUrl + "/api/ai-integrations/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.connected && Array.isArray(data.connected)) {
          setConnectedPlugins(data.connected);
        }
      }
    } catch (err) {
      console.error("Failed to fetch integration status:", err);
    } finally {
      setLoadingStatus(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      setLoadingStatus(true);
      fetchStatus();
    }
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
      } else if (id === 'github') {
        endpoint = `/api/auth/github/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else if (id === 'supabase') {
        endpoint = `/api/auth/supabase/connect?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      } else {
        endpoint = `/api/ai-integrations/connect/${id}?returnTo=${encodeURIComponent(window.location.href)}&popup=true`;
      }

      const res = await fetch(backendUrl + endpoint, {
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
        
        if (!popup) {
          setIsConnecting(false);
          toast.error("Popup blocked. Please allow popups for this site.");
          return;
        }

        // Poll backend every 2 seconds to check if token was saved
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(backendUrl + "/api/ai-integrations/status", {
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
          if (popup.closed) {
            // Give 3 more seconds for the backend to finalize the token
            setTimeout(async () => {
              try {
                const finalRes = await fetch(backendUrl + "/api/ai-integrations/status", {
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
        const method = (id === 'slack' || id === 'github') ? 'DELETE' : 'POST';
        const res = await fetch(backendUrl + endpoint, { method, credentials: 'include' });
        if (res.ok) {
          toast.success(`${name} disconnected successfully`);
          await fetchStatus();
        } else {
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
      case "whatsapp": return ["Send WhatsApp messages to students/parents", "Automate customer support replies", "Broadcast important announcements"];
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
      case "whatsapp": return ["Send a WhatsApp reminder to students about the test", "Broadcast the holiday announcement via WhatsApp", "Draft a reply to a parent's inquiry on WhatsApp", "Send the Zoom link to the class WhatsApp group", "Check if there are any unread messages from parents"];
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

  return (
    <>
    <AnimatePresence>
      {isOpen && (
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
                {TABS.map((tab) => {
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
              <div className="p-8 flex-1 overflow-y-auto z-10 relative custom-scrollbar">
                {activeTab === "plugins" ? (
                  selectedPlugin ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col max-w-3xl mx-auto">
                      <button 
                        onClick={() => setSelectedPlugin(null)}
                        className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors w-fit group"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                        Back to plugins
                      </button>

                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-16 h-16 rounded-2xl border border-border flex items-center justify-center shrink-0 bg-background overflow-hidden shadow-sm">
                            {selectedPlugin.imgUrl ? (
                              <img 
                                src={selectedPlugin.imgUrl} 
                                alt={selectedPlugin.name} 
                                className="w-8 h-8 object-contain" 
                                style={{ filter: selectedPlugin.invertInDarkMode ? 'var(--icon-invert, none)' : selectedPlugin.invertInLightMode ? 'var(--icon-invert-light, none)' : 'none' }}
                              />
                            ) : selectedPlugin.icon ? (
                              <selectedPlugin.icon className="w-8 h-8 text-muted-foreground" />
                            ) : null}
                         </div>
                         <div>
                           <h2 className="text-3xl font-bold text-foreground">{selectedPlugin.name}</h2>
                           <p className="text-sm text-muted-foreground">{selectedPlugin.description || `Integrate ${selectedPlugin.name} with your workspace`}</p>
                         </div>
                      </div>

                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 964 295" className="w-full h-auto mb-8 shrink-0" role="img" aria-label={`${selectedPlugin.name} connected to Classgrid`}>
                        <defs>
                          <clipPath id="cardClip">
                            <rect x="28" y="15" width="875" height="270" rx="18"/>
                          </clipPath>
                          <symbol id="chat" viewBox="0 0 16 16">
                            <path d="M8 1.5C4.4 1.5 1.5 3.9 1.5 6.9c0 1.4.6 2.6 1.6 3.5L2.5 14l3.2-1.6c.7.2 1.5.3 2.3.3 3.6 0 6.5-2.4 6.5-5.4S11.6 1.5 8 1.5z"
                                  fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                          </symbol>
                        </defs>

                        {/* outer card */}
                        <rect x="28.5" y="15.5" width="875" height="270" rx="18" className="fill-background stroke-border"/>

                        <g clipPath="url(#cardClip)">
                          {/* faint divider */}
                          <line x1="330" y1="15" x2="330" y2="285" className="stroke-border" strokeWidth="1"/>

                          {/* Dynamic Integration icon */}
                          {selectedPlugin.imgUrl ? (
                             <image x="160" y="112" width="93" height="78" preserveAspectRatio="xMidYMid meet"
                                 href={selectedPlugin.imgUrl} style={{ filter: selectedPlugin.invertInDarkMode ? 'var(--icon-invert, none)' : selectedPlugin.invertInLightMode ? 'var(--icon-invert-light, none)' : 'none' }} />
                          ) : (
                             <foreignObject x="160" y="112" width="93" height="78">
                                <div className="w-full h-full flex items-center justify-center">
                                   {selectedPlugin.icon && <selectedPlugin.icon className="w-16 h-16 text-muted-foreground" />}
                                </div>
                             </foreignObject>
                          )}
                          
                          <text x="206" y="222" textAnchor="middle" fontSize="16" fontWeight="500" className="fill-muted-foreground font-sans">{selectedPlugin.name}</text>

                          {/* connection dots */}
                          <circle cx="282" cy="152" r="4.5" className="fill-emerald-500/30"/>
                          <circle cx="302" cy="152" r="4.5" className="fill-emerald-500/60"/>
                          <circle cx="322" cy="152" r="4.5" className="fill-emerald-500"/>

                          {/* Classgrid panel */}
                          <rect x="350.5" y="70.5" width="600" height="260" rx="14" className="fill-background stroke-border"/>

                          {/* Classgrid logo + name */}
                          <image x="379" y="98" width="24" height="24" preserveAspectRatio="xMidYMid meet"
                                 href="/logo.png" />
                          <text x="418" y="118" fontSize="20" fontWeight="700" className="fill-foreground font-sans">Classgrid</text>

                          {/* chat pill 1 */}
                          <rect x="416" y="151" width="303" height="36" rx="18" className="fill-muted"/>
                          <use href="#chat" x="432" y="161" width="16" height="16" className="text-emerald-500/70" />

                          {/* chat pill 2 (active) */}
                          <rect x="374" y="205" width="225" height="36" rx="18" className="fill-emerald-500/10"/>
                          <use href="#chat" x="392" y="215" width="16" height="16" className="text-emerald-500"/>

                          {/* chat pill 3 (cut off) */}
                          <rect x="518" y="259" width="304" height="36" rx="18" className="fill-muted"/>
                          <use href="#chat" x="534" y="269" width="16" height="16" className="text-emerald-500/70" />
                        </g>
                      </svg>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-3">Features available</h3>
                          <ul className="space-y-3">
                            {getPluginFeatures(selectedPlugin.name, selectedPlugin.id).map((feature, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-muted-foreground text-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-6 pb-2">
                        {connectedPlugins.includes(selectedPlugin.id) ? (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-emerald-500 font-medium px-4 py-2 rounded-lg bg-emerald-500/10 w-fit">
                                <CheckCircle2 className="w-5 h-5" />
                                Connected
                              </div>
                              <Button
                                variant="outline"
                                onClick={() => handleDisconnect(selectedPlugin.id, selectedPlugin.name)}
                                disabled={isDisconnecting}
                                className="h-9 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                              >
                                {isDisconnecting ? <Spinner className="w-4 h-4 mr-2" /> : null}
                                Disconnect
                              </Button>
                            </div>
                            
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-emerald-500" />
                                Try asking the AI
                              </h3>
                              <div className="flex flex-col gap-2">
                                {getDemoMessages(selectedPlugin.id).map((msg, i) => (
                                  <button
                                    key={i}
                                    onClick={() => {
                                      if (onSendPrompt) {
                                        onSendPrompt(msg);
                                        onClose();
                                      }
                                    }}
                                    className="text-left px-4 py-3 rounded-lg border border-border bg-muted/30 hover:bg-accent hover:border-emerald-500/30 transition-all duration-200 text-sm text-muted-foreground hover:text-foreground shadow-sm flex items-center justify-between group"
                                  >
                                    <span>"{msg}"</span>
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-emerald-500" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            variant="outline"
                            onClick={() => handleConnect(selectedPlugin.id, selectedPlugin.name)}
                            disabled={isConnecting}
                            className="relative h-10 rounded-lg border-border bg-accent px-4 md:px-6 text-sm font-medium tracking-tight text-foreground/90 transition-all duration-200 hover:bg-slate-200 dark:hover:bg-accent/80 hover:border-border hover:text-foreground cursor-pointer"
                          >
                            {isConnecting ? (
                              <div className="flex items-center gap-2">
                                <Spinner className="w-4 h-4" />
                                Connecting...
                              </div>
                            ) : "Connect"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                      <h3 className="text-2xl font-bold text-foreground mb-2">Plugins & Integrations</h3>
                      <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                        Connect apps to use in Classgrid. Let Classgrid AI search, sync, and take actions in your workspace tools.
                      </p>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-12">
                        {INTEGRATIONS_LIST.filter(i => i.type !== "action").map((integration) => (
                          <div 
                            key={integration.id} 
                            onClick={() => setSelectedPlugin(integration)}
                            className="group relative bg-background border border-border rounded-xl p-5 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer flex items-center justify-between shadow-sm"
                          >
                            <div className="flex items-center gap-4 min-w-0 pr-4">
                              <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center shrink-0 bg-background overflow-hidden shadow-sm relative">
                                  {integration.imgUrl ? (
                                    <img 
                                      src={integration.imgUrl} 
                                      alt={integration.name} 
                                      className="w-6 h-6 object-contain" 
                                      style={{ filter: integration.invertInDarkMode ? 'var(--icon-invert, none)' : integration.invertInLightMode ? 'var(--icon-invert-light, none)' : 'none' }}
                                    />
                                  ) : integration.icon ? (
                                    <integration.icon className="w-6 h-6 text-muted-foreground" />
                                  ) : null}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-foreground truncate">{integration.name}</span>
                                <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                  {integration.description || "Connect your workspace"}
                                </span>
                              </div>
                            </div>
                            
                            {/* Action Icon */}
                            <div className="shrink-0 pl-2">
                              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ) : activeTab === "images" ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                    <h3 className="text-2xl font-bold text-foreground mb-2">My Generated Images</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                      View and download all the images you've generated across all your chat sessions.
                    </p>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      <AiImagesGallery backendUrl={backendUrl} />
                    </div>
                  </div>
                ) : activeTab === "usage" ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                    <h3 className="text-2xl font-bold text-foreground mb-2">AI Usage</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                      Monitor your AI token usage and limits across your personal account and organization.
                    </p>
                    <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-6 shadow-sm">
                        <AiUsageBar showExactTokens={false} />
                    </div>
                  </div>
                ) : activeTab === "credits" ? (
                  <div className="h-full flex-1 -m-8">
                    <AiCreditsPanel />
                  </div>
                ) : activeTab === "upgrade" ? (
                  <div className="h-full flex-1 -m-8">
                    <AiUpgradePanel />
                  </div>
                ) : activeTab === "skills" ? (
                  <div className="h-full flex-1">
                    <AiSkillsPanel backendUrl={backendUrl} />
                  </div>
                ) : activeTab === "connected-apps" ? (
                  <AiConnectedAppsPanel backendUrl={backendUrl} />
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{TABS.find(t => t.id === activeTab)?.label}</h3>
                    <p className="text-sm text-muted-foreground mb-8 max-w-xl">
                      Manage your {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} configuration here.
                    </p>
                    
                    {/* Empty Placeholder Area */}
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl">
                       <p className="text-muted-foreground text-sm">Content for {activeTab} will go here</p>
                    </div>
                  </>
                )}
              </div>
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
