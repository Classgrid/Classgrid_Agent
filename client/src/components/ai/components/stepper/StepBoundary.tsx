import React from "react";
import { AlertTriangle, Copy } from "lucide-react";
import { toast } from "sonner";

/** One step that can't be shown must never break the chat: only that step shows the error, so it can be reported */
export class StepBoundary extends React.Component<{ tool?: string; children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: unknown) { console.error(`[StepBoundary] a step${this.props.tool ? ` (${this.props.tool})` : ""} could not be shown`, error); }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const report = `${this.props.tool ? `Step: ${this.props.tool}\n` : ""}${error.name}: ${error.message}\n${String(error.stack || "").split("\n").slice(1, 6).join("\n")}`;
    return (
      <div className="my-1 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span className="flex-1">This step couldn't be shown{this.props.tool ? ` (${this.props.tool})` : ""}</span>
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(report).then(() => toast.success("Error copied"), () => toast.error("Could not copy")); }}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Copy className="size-3" /> Copy error
          </button>
        </div>
        <div className="mt-1 font-mono text-[11px] text-red-700/90 dark:text-red-300/90 break-words">{error.name}: {error.message}</div>
      </div>
    );
  }
}
