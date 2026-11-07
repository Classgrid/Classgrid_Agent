// Settings → Mastero: how the AI works with the user's Mastero projects (a folder from their computer put on GitHub
// with Studio's Mastero button: the same project on the computer and in the cloud, GitHub as the master copy).
// Kept on the server (routes/ide.routes.js /mastero-settings), so the app and the website show the same choice.
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/marketing_ui/switch";
import { fetchWithRescue } from "@/lib/rescue";
import { MasteroMark } from "@/components/icons/MasteroMark";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

function Row({ title, desc, children }: { title: string; desc?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4 border-b border-border last:border-b-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-sm font-medium text-foreground">{title}</span>
        {desc && <span className="text-xs text-muted-foreground break-words">{desc}</span>}
      </div>
      {children && <div className="shrink-0 flex items-center gap-2">{children}</div>}
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
      <div className="rounded-xl border border-border bg-card">{children}</div>
    </section>
  );
}

export function SettingsMasteroSection() {
  const [autoPush, setAutoPush] = useState<boolean | null>(null);
  useEffect(() => {
    fetchWithRescue(`${backendUrl}/api/ide/mastero-settings`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAutoPush(d ? d.autoPush !== false : true))
      .catch(() => setAutoPush(true));
  }, []);
  const changePush = async (on: boolean) => {
    const was = autoPush;
    setAutoPush(on);
    const res = await fetchWithRescue(`${backendUrl}/api/ide/mastero-settings`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoPush: on }),
    }).catch(() => null);
    if (!res?.ok) { setAutoPush(was); toast.error("Couldn't save the setting. Try again."); }
  };

  return (
    <div>
      <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground"><MasteroMark className="size-5" /> Mastero</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Mastero projects live on your computer and in the Classgrid cloud, with GitHub as the master copy.{" "}
        <a href="https://classgrid.in/docs/projects-cloud-and-computer" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2 hover:opacity-80">Learn more</a>
      </p>

      <Section title="Pushing to GitHub">
        <Row
          title="Push after every change"
          desc={autoPush === false
            ? "Off: the AI asks you yes or no before it pushes your changes to GitHub."
            : "On: when an answer changes files, the changes go to GitHub by themselves, without asking."}
        >
          <Switch checked={autoPush !== false} disabled={autoPush === null} onCheckedChange={(v) => void changePush(v)} />
        </Row>
      </Section>
    </div>
  );
}
