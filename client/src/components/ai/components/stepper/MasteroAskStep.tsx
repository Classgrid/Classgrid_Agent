// Mastero's cards in the chat (the AI's mastero_ask tool): after the user's folder was put on GitHub, the AI asks for
// the project's name, then its photo. The card saves the answer itself (the same project rename and logo as the
// Project tab), then tells the AI as the user's next (hidden) message, so it goes on to the next step.
import { useRef, useState } from "react";
import { Check, FolderGit2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { fetchWithRescue } from "@/lib/rescue";
import { apiClient } from "@/lib/apiClient";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
type Shown = { shown?: "name" | "logo"; project_id?: string; project_name?: string; repo?: string | null; logo?: string | null; suggestion?: string | null };

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
  window.dispatchEvent(new Event("studio:projects-changed"));
  return data.project;
}

// active: this is the newest message (an older card was answered already and only shows what was picked)
export function MasteroAskStep({ stepId, args, result, status, active }: { stepId: string; args?: { ask?: string; suggestion?: string }; result?: unknown; status: string; active: boolean }) {
  const info = parse(result);
  const ask = (info?.shown || args?.ask) === "logo" ? "logo" : "name";
  const [answered, setAnswered] = useState<string | null>(() => { try { return localStorage.getItem(doneKey(stepId)); } catch { return null; } });
  const [name, setName] = useState(() => info?.suggestion || args?.suggestion || folderName(info?.project_name));
  const [busy, setBusy] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (status === "loading" || !info) return null;
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
      finish(n, `[Mastero] I named the project "${n}" (saved). Go on with the next Mastero step.`);
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
      finish("photo", "[Mastero] I added the project's photo (saved). Go on with the next Mastero step.");
    } catch (e: any) {
      toast.error(e.message || "Couldn't upload the photo. Try again.");
      throw e; // the crop window shows it failed
    } finally {
      setBusy(false);
    }
  };

  const steps = ["Name", "Photo"];
  const at = ask === "name" ? 0 : 1;
  const shownLogo = logo || (answered === "photo" ? info.logo : null);

  return (
    <div className="relative z-10 ml-10 mr-2 my-1.5 max-w-[460px] rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#171717] overflow-hidden">
      {/* Mastero's steps: name, then photo */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-slate-200 dark:border-[#2a2a2a] text-[12.5px]">
        <span className="font-medium text-slate-800 dark:text-[#e6e6e6]">Mastero</span>
        <span className="text-slate-400 dark:text-[#7d7d7d]">·</span>
        {steps.map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            {i > 0 && <span className="w-4 h-px bg-slate-200 dark:bg-[#333]" />}
            <span className={`flex items-center justify-center size-4 rounded-full text-[10px] ${i < at || (i === at && answered) ? "bg-[#16825d] text-white" : i === at ? "bg-foreground text-background" : "bg-slate-100 dark:bg-[#262626] text-slate-400"}`}>
              {i < at || (i === at && answered) ? <Check className="size-2.5" /> : i + 1}
            </span>
            <span className={i === at ? "text-slate-800 dark:text-[#e6e6e6]" : "text-slate-400 dark:text-[#7d7d7d]"}>{label}</span>
          </span>
        ))}
      </div>

      {ask === "name" ? (
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
              : busy ? <span className="size-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
              : answered ? <FolderGit2 className="size-6" />
              : <><ImagePlus className="size-6" /><span className="text-[11px]">Upload</span></>}
          </button>
          <div className="min-w-0 flex-1 flex flex-col gap-2">
            <p className="text-[13px] text-slate-600 dark:text-[#a9a9a9]">{answered ? (answered === "photo" ? "Photo added." : "No photo for now.") : "Add a photo or logo for the project. It shows in your project lists."}</p>
            {!answered && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={locked} className="h-8 px-3 rounded-md bg-foreground text-background text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-default">Upload photo</button>
                <button type="button" onClick={() => finish("skipped", "[Mastero] I skipped the photo for now. Go on with the next Mastero step.")} disabled={locked} className="h-8 px-3 rounded-md border border-black/10 dark:border-white/[0.1] text-[12.5px] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] disabled:opacity-40 cursor-pointer disabled:cursor-default">Skip</button>
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
