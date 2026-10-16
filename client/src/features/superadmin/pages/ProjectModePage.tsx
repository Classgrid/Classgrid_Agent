import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { AskAiPanel } from "@/components/ai";

// Project mode: full screen. Left side is kept empty for now (the code editor will go here),
// right side is the AI panel in its overlay layout.
export function ProjectModePage() {
  const { pathname } = useLocation();
  const agentPath = pathname.startsWith("/superadmin") ? "/superadmin/agent" : "/c/agent";
  return (
    <div className="fixed inset-0 bg-background text-foreground">
      <div className="h-full sm:pr-[400px] flex flex-col">
        <div className="shrink-0 flex items-center h-8 box-content py-4 px-4 border-b border-border">{/* same height as the AI panel header, so both lines meet */}
          <Link
            to={agentPath}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
          <span className="ml-4 text-sm font-medium">Project Mode</span>
        </div>
        <div className="flex-1" />
      </div>
      <AskAiPanel open onOpenChange={() => {}} variant="overlay" />
    </div>
  );
}
