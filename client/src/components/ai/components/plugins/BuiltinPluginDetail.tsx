// Detail page of a built-in plugin (Gmail, GitHub, Slack...) in AI Hub > Plugins
import React, { useState } from "react";
import { MessageSquare, Unplug } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { PluginHeader, PluginLogo, StatusLabel, TryPrompts, ToolsSection, InfoSection, FeatureList, solidBtn, type PluginTool } from "./PluginUi";

// Short line, maker and website of each built-in plugin (ids as in INTEGRATIONS_LIST)
export const BUILTIN_META: Record<string, { description: string; developer: string; website: string; login?: string }> = {
  "mcp-notion": { description: "Pages, databases and comments", developer: "Notion Labs", website: "notion.com" },
  gmail: { description: "Read, search and send email", developer: "Google", website: "mail.google.com" },
  gcal: { description: "Events and meetings", developer: "Google", website: "calendar.google.com" },
  gdrive: { description: "Files and folders", developer: "Google", website: "drive.google.com" },
  gclass: { description: "Courses, assignments and announcements", developer: "Google", website: "classroom.google.com" },
  gmeet: { description: "Meeting links for your events", developer: "Google", website: "meet.google.com" },
  gforms: { description: "Forms, quizzes and responses", developer: "Google", website: "forms.google.com" },
  outlook: { description: "Email and calendar", developer: "Microsoft", website: "outlook.com" },
  teams: { description: "Chats, channels and meetings", developer: "Microsoft", website: "teams.microsoft.com" },
  zoom: { description: "Create and list meetings", developer: "Zoom", website: "zoom.us" },
  whatsapp: { description: "Send and read WhatsApp messages", developer: "Meta", website: "business.whatsapp.com", login: "Your WhatsApp Business number" },
  vercel: { description: "Projects, deployments and env variables", developer: "Vercel", website: "vercel.com" },
  slack: { description: "Channels, messages and canvases", developer: "Slack", website: "slack.com" },
  github: { description: "Repos, issues and pull requests", developer: "GitHub", website: "github.com" },
  canva: { description: "Designs, exports and brand templates", developer: "Canva", website: "canva.com" },
  spotify: { description: "Playback, playlists and your library", developer: "Spotify", website: "spotify.com" },
  youtube: { description: "Videos, channels and comments", developer: "Google", website: "youtube.com" },
  supabase: { description: "Projects, database and storage", developer: "Supabase", website: "supabase.com" },
  sanity: { description: "Documents in your Sanity Studio", developer: "Sanity", website: "sanity.io", login: "Your Sanity project ID and token" },
  facebook: { description: "Page posts, messages and insights", developer: "Meta", website: "facebook.com" },
  instagram: { description: "Posts, messages and insights", developer: "Meta", website: "instagram.com" },
};

export function BuiltinPluginDetail({ plugin, connected, connecting, disconnecting, features, prompts, tools, toolsLoading, onBack, onConnect, onDisconnect, onTry }: {
  plugin: any;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  features: string[];
  prompts: string[];
  tools: PluginTool[];
  toolsLoading: boolean;
  onBack: () => void;
  onConnect: () => void;
  onDisconnect: () => Promise<void> | void;
  onTry?: (prompt: string) => void;
}) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const meta = BUILTIN_META[plugin.id];

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col max-w-3xl mx-auto pb-8">
      <PluginHeader
        onBack={onBack}
        logo={<PluginLogo src={plugin.imgUrl} icon={plugin.icon} name={plugin.name} invert={plugin.invertInDarkMode} invertLight={plugin.invertInLightMode} size="lg" />}
        name={plugin.name}
        subtitle={meta?.description || plugin.description || `Use ${plugin.name} with Classgrid AI`}
        status={<StatusLabel tone={connected ? "ok" : "off"} label={connected ? "Connected" : "Not connected"} />}
        action={!connected ? (
          <button onClick={onConnect} disabled={connecting} className={solidBtn}>
            {connecting && <Spinner className="w-4 h-4" />}
            {connecting ? "Connecting..." : "Connect"}
          </button>
        ) : onTry ? (
          <button onClick={() => onTry(prompts[0] || `What can you do with ${plugin.name}?`)} className={solidBtn}>
            <MessageSquare className="w-4 h-4" />
            Try in chat
          </button>
        ) : undefined}
        menu={connected ? [{ label: "Disconnect", icon: Unplug, danger: true, disabled: disconnecting, onClick: () => setConfirmDisconnect(true) }] : undefined}
      />

      {connected && onTry && <TryPrompts name={plugin.name} prompts={prompts.slice(0, 4)} onTry={onTry} />}

      <FeatureList items={features} />

      <ToolsSection tools={tools} loading={toolsLoading} emptyText="No tools listed for this plugin." />

      <InfoSection rows={[
        { label: "Developer", value: meta?.developer },
        { label: "Website", value: meta ? <a href={`https://${meta.website}`} target="_blank" rel="noreferrer" className="hover:underline">{meta.website}</a> : null },
        { label: "Login", value: meta?.login || "Log in with your account (OAuth)" },
        { label: "Made for", value: "Classgrid AI (built in)" },
      ]} />

      <DangerConfirmDialog
        open={confirmDisconnect}
        onOpenChange={(open) => { if (!open && !disconnecting) setConfirmDisconnect(false); }}
        title={`Disconnect ${plugin.name}`}
        description={`Classgrid AI will stop using ${plugin.name}. You can connect it again any time.`}
        warningMessage={`Your ${plugin.name} login is removed from Classgrid.`}
        actionLabel="Disconnect"
        isLoading={disconnecting}
        onConfirm={async () => { await onDisconnect(); setConfirmDisconnect(false); }}
      />
    </div>
  );
}
