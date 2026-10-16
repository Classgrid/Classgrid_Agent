import { AskAiPanel } from "@/components/ai";

// Project mode: shown inside the normal layout (left sidebar). The middle is kept empty for now (the code editor
// will go here), the right side is the AI panel in its overlay layout.
export function ProjectModePage() {
  return (
    <div className="h-full flex flex-col bg-background text-foreground sm:pr-[400px]">
      <div className="shrink-0 flex items-center h-8 box-content py-4 pl-16 pr-4 border-b border-border">{/* same height as the AI panel header, so both lines meet */}
        <span className="text-sm font-medium">Project Mode</span>
      </div>
      <div className="flex-1" />
      <AskAiPanel open onOpenChange={() => {}} variant="overlay" />
    </div>
  );
}
