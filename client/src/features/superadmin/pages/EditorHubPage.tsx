// Classgrid Code: the AI hub (Plugins, Images, Skills, Connected apps, Usage, AI Credits, Upgrade) as a big tab in the
// editor, the same window Project Mode opens over the app. Closing it closes the tab; what it sends to the chat goes
// to the Agent panel on the right (classgrid-editor/extension).
import { AiHubModal } from "@/components/ai/components/AiHubModal";

export function EditorHubPage() {
  const tab = new URLSearchParams(window.location.search).get("tab") || "plugins";
  const desktop = (window as any).classgridDesktop;
  return (
    <div className="h-[100dvh] bg-background">
      <AiHubModal
        isOpen
        initialTab={tab}
        onClose={() => desktop?.closeHub?.()}
        onSendPrompt={(text) => desktop?.sendToAgent?.(text)}
      />
    </div>
  );
}
