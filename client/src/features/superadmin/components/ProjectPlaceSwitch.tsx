// Desktop app only: where a project opens. A cloud project with no copy here shows "Get a copy on this computer"; with
// a copy, "On this computer" / "In the cloud" (remembered per computer); a folder project shows "Also use in the cloud".
import { useState } from "react";
import { Cloud, HardDriveDownload, Monitor } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { getCopyOnThisComputer, onDesktop, openProjectIn, thisComputerCopy, type LocalCopy } from "../utils/projectCopies";

type PlaceProject = { id: string; name?: string; repo?: string | null; location?: "cloud" | "local"; localPath?: string | null; localCopies?: LocalCopy[] };

export function ProjectPlaceSwitch({ project, onChanged, compact = false }: { project: PlaceProject | null | undefined; onChanged?: (p: PlaceProject) => void; compact?: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!project || !onDesktop()) return null;
  const run = async (what: string, fn: () => Promise<PlaceProject | null>) => {
    if (busy) return;
    setBusy(what);
    try { const p = await fn(); if (p) onChanged?.(p); } finally { setBusy(null); }
  };
  const h = compact ? "h-7 text-[12px]" : "h-8 text-sm";
  const btn = `shrink-0 inline-flex items-center gap-1.5 ${h} px-2.5 rounded-full border border-border bg-background text-foreground hover:bg-secondary disabled:opacity-50 whitespace-nowrap`;
  const icon = compact ? "size-3.5" : "size-4";

  // A folder project has no button: it goes online only when the user asks the agent to make a repo and push it,
  // and then it is linked by itself (linkFolderRepo)
  if (project.location === "local") return null;
  if (!project.repo) return null;
  const copy = thisComputerCopy(project);
  if (!copy) {
    return (
      <button type="button" disabled={!!busy} onClick={() => run("copy", () => getCopyOnThisComputer(project))} className={btn} title={`Download ${project.repo} to a folder on this computer`}>
        {busy ? <Spinner className={icon} /> : <HardDriveDownload className={icon} />} Get a copy on this computer
      </button>
    );
  }
  const seg = (on: boolean) => `inline-flex items-center gap-1.5 ${h} px-2.5 rounded-full whitespace-nowrap disabled:opacity-50 ${on ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`;
  return (
    <div className="shrink-0 inline-flex items-center gap-0.5 p-0.5 rounded-full border border-border bg-background" role="group" aria-label="Where this project opens">
      <button type="button" disabled={!!busy} aria-pressed={!!copy.here} onClick={() => !copy.here && run("local", () => openProjectIn(project, "local"))} className={seg(!!copy.here)} title={copy.path}>
        {busy === "local" ? <Spinner className={icon} /> : <Monitor className={icon} />} On this computer
      </button>
      <button type="button" disabled={!!busy} aria-pressed={!copy.here} onClick={() => copy.here && run("cloud", () => openProjectIn(project, "cloud"))} className={seg(!copy.here)} title="Classgrid's cloud computer">
        {busy === "cloud" ? <Spinner className={icon} /> : <Cloud className={icon} />} In the cloud
      </button>
    </div>
  );
}
