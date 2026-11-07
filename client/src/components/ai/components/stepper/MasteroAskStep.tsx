// Mastero's cards in the chat (the AI's mastero_ask tool): after the user's folder was put on GitHub, the AI asks for
// the project's name, then its photo (optional: Skip), then Finish. One card at a time, on the chat box. The card saves
// the answer itself (the same project rename and logo as the Project tab), then tells the AI as the user's next
// (hidden) message, so it goes on to the next step. Cancel tells the AI too, so it can offer to try again.
import { useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Check, FolderGit2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { fetchWithRescue } from "@/lib/rescue";
import { apiClient } from "@/lib/apiClient";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";
import { remember } from "@/features/superadmin/utils/projectCopies";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
type Shown = { shown?: "name" | "logo" | "confirm"; project_id?: string; project_name?: string; repo?: string | null; logo?: string | null; suggestion?: string | null };

const parse = (result: unknown): Shown | null => {
  try { const d = typeof result === "string" ? JSON.parse(result) : result; return d && typeof d === "object" && (d as Shown).project_id ? (d as Shown) : null; } catch { return null; }
};
const tellAi = (text: string) => window.dispatchEvent(new CustomEvent("agent:ask", { detail: { text, hidden: true } }));
const doneKey = (id: string) => `cg_mastero_done:${id}`;
const folderName = (name = "") => name.split(/[\\/]/).filter(Boolean).pop() || name;

async function saveProject(id: string, body: Record<string, unknown>) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide/projects/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  const data = res ? await res.json().catch(() => ({})) : {};
  if (!res?.ok) throw new Error(data.error || "Couldn't save it. Try again.");
  keep(data.project);
  return data.project;
}

// The saved project list gets the answer too (the new name, photo or mastero: true), so the sidebar's sections and
// the pickers are right even when no picker or Project Mode is open. remember() tells the lists to reload.
function keep(project: unknown) {
  if (project && typeof project === "object" && (project as { id?: string }).id) remember(project as Parameters<typeof remember>[0]);
  else window.dispatchEvent(new Event("studio:projects-changed"));
}

// The chat box shows this card (AskAiPanel's masteroAsk): the AI's mastero_ask came back with its project and the user
// hasn't answered or cancelled it yet. Asked on every render, so an answered card leaves at once; after a reload an
// unanswered card is found again (an answered one is followed by its hidden answer, so it isn't the newest anyway).
export function masteroCardOpen(step: { id?: string; status?: string; result?: unknown } | null | undefined): boolean {
  if (!step?.id || step.status !== "success" || !parse(step.result)) return false;
  try { return !localStorage.getItem(doneKey(step.id)); } catch { return true; }
}

// active: the AI isn't answering now (while it is, the card is locked, so a click can't mix a second answer into it)
// className: where it sits (on the chat box it takes the box's width)
export function MasteroAskStep({ stepId, args, result, status, active, className = "ml-10 mr-2 my-1.5 max-w-[460px]" }: { stepId: string; args?: { ask?: string; suggestion?: string }; result?: unknown; status: string; active: boolean; className?: string }) {
  const info = parse(result);
  const asked = info?.shown || args?.ask;
  const ask = asked === "logo" ? "logo" : asked === "confirm" ? "confirm" : "name";
  const [answered, setAnswered] = useState<string | null>(() => { try { return localStorage.getItem(doneKey(stepId)); } catch { return null; } });
  const [name, setName] = useState(() => info?.suggestion || args?.suggestion || folderName(info?.project_name));
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // The AI's suggested name arrives with the step's result (after a reload too): put it in the box once
  const suggested = info?.suggestion || args?.suggestion || "";
  useEffect(() => { if (suggested && !name) setName(suggested); }, [suggested]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading" || !info || answered) return null; // answered: the AI goes on, the card leaves the chat box
  const finish = (what: string, message: string) => {
    try { localStorage.setItem(doneKey(stepId), what); } catch { /* storage blocked */ }
    setAnswered(what);
    tellAi(message);
  };
  const locked = !active || !!answered || busy;

  const saveName = async () => {
    const n = name.trim().slice(0, 80);
    if (!n || locked) return;
    setBusy(true);
    try {
      await saveProject(info.project_id!, { name: n });
      finish(n, `[SYSTEM: Mastero] I named the project "${n}" (saved). Go on with the next Mastero step.`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Pick a picture."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Pick a picture smaller than 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(String(ev.target?.result || ""));
    reader.readAsDataURL(file);
  };
  const saveLogo = async (blob: Blob) => {
    setBusy(true);
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const { data } = await apiClient.post("/api/user/upload-url", { fileName: `project-logo-${Date.now()}.${ext}`, fileType: blob.type });
      const put = await fetch(data.uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": blob.type } });
      if (!put.ok) throw new Error("Couldn't upload the photo. Try again.");
      await saveProject(info.project_id!, { logo: data.publicUrl });
      setLogo(data.publicUrl);
      finish("photo", "[SYSTEM: Mastero] I added the project's photo (saved). Go on with the next Mastero step.");
    } catch (e: any) {
      toast.error(e.message || "Couldn't upload the photo. Try again.");
      throw e; // the crop window shows it failed
    } finally {
      setBusy(false);
    }
  };

  // The last step: only the user's confirmation makes it a Mastero project (its section, Push and the pushes after
  // every answer start then)
  const confirm = async () => {
    if (locked) return;
    setBusy(true);
    try {
      const res = await fetchWithRescue(`${backendUrl}/api/ide/projects/${info.project_id}/mastero-confirm`, { method: "POST", credentials: "include" }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (!res?.ok) throw new Error(data.error || "Couldn't finish Mastero. Try again.");
      keep(data.project); // mastero: true in the saved list, so the "Mastero projects" section shows it now
      finish("confirmed", "[SYSTEM: Mastero] I confirmed: it is a Mastero project now. Now tell me how it works, as you were asked at the start.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const steps = ["Name", "Photo", "Finish"];
  const at = ask === "name" ? 0 : ask === "logo" ? 1 : 2;
  const shownLogo = logo || (answered === "photo" ? info.logo : null);

  return (
    <div className={`relative z-10 ${className} rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] overflow-hidden shadow-sm`}>
      {/* One step at a time: name, then photo, then the user's confirmation */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-200 dark:border-[#2a2a2a] text-[12.5px]">
        <span className="font-medium text-slate-800 dark:text-[#e6e6e6]">Mastero</span>
        <span className="text-slate-400 dark:text-[#7d7d7d]">·</span>
        <span className="text-slate-800 dark:text-[#e6e6e6]">{steps[at]}</span>
        {/* Cancel: Mastero stops here (nothing more is saved) and the AI hears it, so it can offer to try again */}
        <button
          type="button"
          onClick={() => finish("cancelled", `[SYSTEM: Mastero] I cancelled the Mastero ${steps[at]!.toLowerCase()} step, so Mastero isn't finished. In one short line, ask me if I want to try it again; if I say yes, show the same card again with mastero_ask.`)}
          disabled={locked}
          className="ml-auto h-7 px-2.5 rounded-md text-[12.5px] text-slate-500 dark:text-[#8a8a8a] hover:text-slate-800 dark:hover:text-[#e6e6e6] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] disabled:opacity-40 cursor-pointer disabled:cursor-default"
        >
          Cancel
        </button>
      </div>

      {ask === "confirm" ? (
        <div className="p-3.5 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 rounded-xl border border-slate-200 dark:border-[#2a2a2a] overflow-hidden flex items-center justify-center bg-slate-50 dark:bg-[#1d1d1d]">
              {info.logo ? <img src={info.logo} alt="" className="size-full object-cover" /> : <FolderGit2 className="size-5 text-slate-400" />}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14px] font-medium text-slate-800 dark:text-[#e6e6e6]">{info.project_name}</p>
              {info.repo && <p className="truncate text-[12px] font-mono text-slate-500 dark:text-[#8a8a8a]">{info.repo}</p>}
            </div>
          </div>
          <p className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">Click Finish to make it a Mastero project. It works on this computer and in the Classgrid cloud, and your changes are pushed to GitHub after every answer (you can change that in Settings → Mastero).</p>
          <div className="flex justify-end">
            <button type="button" onClick={confirm} disabled={locked} className="h-9 px-4 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default">
              {busy ? "Finishing…" : "Finish"}
            </button>
          </div>
        </div>
      ) : ask === "name" ? (
        <div className="p-3.5 flex flex-col gap-2.5">
          <p className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">What should this project be called in Classgrid?</p>
          {answered ? (
            <p className="flex items-center gap-2 text-[14px] font-medium"><Check className="size-4 text-[#16825d] dark:text-[#4ec9b0]" />{answered}</p>
          ) : (
            <div className="flex items-center gap-2">
              <input
                data-no-ring
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
                maxLength={80}
                disabled={locked}
                placeholder="Project name"
                className="flex-1 min-w-0 h-9 px-3 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] text-[13px] outline-none focus:border-black/30 dark:focus:border-white/25 disabled:opacity-60"
              />
              <button type="button" onClick={saveName} disabled={locked || !name.trim()} className="shrink-0 h-9 px-3.5 rounded-md bg-foreground text-background text-[13px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default">
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={locked}
            className="size-20 shrink-0 rounded-xl border border-dashed border-black/15 dark:border-white/15 overflow-hidden flex flex-col items-center justify-center gap-1 text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1d1d1d] cursor-pointer disabled:cursor-default disabled:hover:bg-transparent"
          >
            {shownLogo ? <img src={shownLogo} alt="" className="size-full object-cover" />
              : busy ? <Spinner className="size-5" />
              : answered ? <FolderGit2 className="size-6" />
              : <><ImagePlus className="size-6" /><span className="text-[11px]">Upload</span></>}
          </button>
          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <p className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">{answered ? (answered === "photo" ? "Photo added." : "No photo for now.") : "Add a photo or logo for the project (optional). It shows in your project lists. Skip it if you don't have one."}</p>
            {!answered && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={locked} className="h-8 px-3 rounded-md bg-foreground text-background text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default">Upload photo</button>
                <button type="button" onClick={() => finish("skipped", "[SYSTEM: Mastero] I skipped the photo for now. Go on with the next Mastero step.")} disabled={locked} className="h-8 px-3 rounded-md border border-black/10 dark:border-white/[0.1] text-[12.5px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] disabled:opacity-40 cursor-pointer disabled:cursor-default">Skip</button>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
          <ImageCropperModal isOpen={!!cropSrc} onClose={() => setCropSrc(null)} imageSrc={cropSrc || ""} aspectRatio={1} title="Crop project photo" onCropComplete={saveLogo} />
        </div>
      )}
    </div>
  );
}
