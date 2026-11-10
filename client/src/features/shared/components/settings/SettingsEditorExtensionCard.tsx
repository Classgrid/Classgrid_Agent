// Settings → General (the Classgrid app only): the Classgrid extension in the other code editors on this computer
// (VS Code, Cursor, Windsurf, VSCodium). The app asks once on start (desktop/editors.js); this switch changes the answer.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/marketing_ui/switch";

type Status = { choice: "yes" | "no" | null; editors: { id: string; name: string; installed: boolean }[] };
type Desk = {
  editorExtension?: () => Promise<Status>;
  setEditorExtension?: (on: boolean) => Promise<{ choice: string; results: { name: string; ok: boolean }[] }>;
};
const desk = (): Desk | null => {
  if (import.meta.env.VITE_EDITOR === "1") return null; // Classgrid Code has it built in
  const d = (window as unknown as { classgridDesktop?: Desk }).classgridDesktop;
  return d?.editorExtension ? d : null;
};

export function SettingsEditorExtensionCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    desk()?.editorExtension?.().then(setStatus).catch(() => {});
  }, []);

  if (!desk() || !status) return null;
  const names = status.editors.map((e) => e.name);

  const change = async (on: boolean) => {
    setBusy(true);
    try {
      const res = await desk()!.setEditorExtension!(on);
      const failed = res.results.filter((r) => !r.ok).map((r) => r.name);
      if (on && failed.length) toast.error(`Couldn't add Classgrid to ${failed.join(", ")}. It will try again the next time the app opens.`);
      else if (on && res.results.length) toast.success(`Classgrid added to ${res.results.map((r) => r.name).join(", ")}.`);
      setStatus(await desk()!.editorExtension!());
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">Code editors</h3>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-6 px-5 py-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-medium text-foreground">Add Classgrid to my code editors</span>
            <span className="text-xs text-muted-foreground">
              {names.length
                ? `The Classgrid Agent in ${names.join(", ")} on this computer. ${status.editors.filter((e) => e.installed).map((e) => e.name).join(", ") || "None"} already ${status.editors.filter((e) => e.installed).length === 1 ? "has" : "have"} it.`
                : "No VS Code, Cursor, Windsurf or VSCodium found on this computer."}
            </span>
          </div>
          <Switch checked={status.choice === "yes"} disabled={busy || !names.length} onCheckedChange={change} />
        </div>
      </div>
    </section>
  );
}
