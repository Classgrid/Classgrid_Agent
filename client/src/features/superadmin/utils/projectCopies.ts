// One project in both places: a cloud project with a copy on this computer (desktop app), kept the same as the cloud
// through GitHub (server: routes/ide.routes.js /copy, /where, /sync, /cloud). The website always uses the cloud.
import { toast } from "sonner";
import { fetchWithRescue } from "@/lib/rescue";
import { getSocket } from "@/lib/socketClient";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const LIST_KEY = "cg_studio_projects";
// Sent with the project after anything here changes it, so every screen shows the new state
export const PROJECT_PLACE_EVENT = "classgrid:project-place-changed";

export type LocalCopy = { deviceId: string; path: string; at?: string; here?: boolean };
type PlaceProject = { id: string; name?: string; repo?: string | null; location?: "cloud" | "local"; localPath?: string | null; localCopies?: LocalCopy[] };
type Desktop = { isDesktop?: boolean; deviceId?: string; pickFolder?: () => Promise<string | null> };
const desktop = () => (window as unknown as { classgridDesktop?: Desktop }).classgridDesktop;

export const thisDeviceId = (): string | null => desktop()?.deviceId || null;
export const onDesktop = (): boolean => !!desktop()?.isDesktop;

// This computer's copy of a cloud project (desktop app only), or null
export function thisComputerCopy(project: PlaceProject | null | undefined): LocalCopy | null {
  const id = thisDeviceId();
  if (!id || !project || project.location === "local") return null;
  return (project.localCopies || []).find((c) => c.deviceId === id) || null;
}

async function api(path: string, body: Record<string, unknown>) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: thisDeviceId(), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

// The saved project list (read for the Files tab and the open project) gets the project's new place at once
function remember(project: PlaceProject) {
  try {
    const list = JSON.parse(localStorage.getItem(LIST_KEY) || "[]") as PlaceProject[];
    const next = list.map((p) => (p.id === project.id ? { ...p, repo: project.repo ?? p.repo, location: project.location, localPath: project.localPath, localCopies: project.localCopies } : p));
    localStorage.setItem(LIST_KEY, JSON.stringify(next));
  } catch { /* storage blocked */ }
  window.dispatchEvent(new CustomEvent(PROJECT_PLACE_EVENT, { detail: { project } }));
  window.dispatchEvent(new Event("studio:projects-changed"));
}

const errorText = (data: { error?: string }) => (data.error === "github_not_connected" ? "Connect GitHub in AI Hub first." : data.error || "Something went wrong. Try again.");

// "Get a copy on this computer": pick any folder on any drive; when that drive is too full, say so and pick again
export async function getCopyOnThisComputer(project: PlaceProject): Promise<PlaceProject | null> {
  const d = desktop();
  if (!d?.pickFolder) { toast.error("Open Classgrid's desktop app to get a copy on this computer."); return null; }
  for (;;) {
    const folder = await d.pickFolder();
    if (!folder) return null;
    const id = toast.loading(`Downloading ${project.name || "the project"} from GitHub…`);
    const { res, data } = await api(`/projects/${project.id}/copy`, { folder }).catch(() => ({ res: null, data: {} as Record<string, string> }));
    toast.dismiss(id);
    if (res?.ok && data.project) {
      remember(data.project);
      toast.success(data.message || "The project is on this computer now.", { duration: 8000 });
      return data.project;
    }
    if (data.code === "no_space") { toast.error(data.error, { duration: 12000 }); continue; } // pick another drive
    toast.error(errorText(data), { duration: 10000 });
    return null;
  }
}

// Open the project "On this computer" or "In the cloud" (remembered for this computer)
export async function openProjectIn(project: PlaceProject, where: "local" | "cloud", skipSave = false): Promise<PlaceProject | null> {
  const id = toast.loading(where === "local" ? "Opening…" : "Switching to the cloud…");
  const { res, data } = await api(`/projects/${project.id}/where`, { where, skipSave }).catch(() => ({ res: null, data: {} as Record<string, any> }));
  toast.dismiss(id);
  if (data.project) remember(data.project);
  if (res?.ok) {
    if (data.message) toast.success(data.message, { duration: 6000 });
    return data.project || null;
  }
  // The computer's work couldn't be pushed: the user may still switch, and that work stays on this computer
  if (where === "cloud" && !skipSave && data.code && data.code !== "app_not_open") {
    return new Promise((resolve) => {
      toast.error(errorText(data), {
        duration: 20000,
        action: { label: "Use the cloud anyway", onClick: () => { openProjectIn(project, "cloud", true).then(resolve); } },
        onDismiss: () => resolve(null),
        onAutoClose: () => resolve(null),
      });
    });
  }
  toast.error(errorText(data), { duration: 10000 });
  return null;
}

// Leaving the project on this computer: its work goes to GitHub, so the cloud has it next time
export async function saveThisComputerCopy(project: PlaceProject): Promise<void> {
  if (!thisComputerCopy(project)?.here) return;
  const { res, data } = await api(`/projects/${project.id}/sync`, {}).catch(() => ({ res: null, data: {} as Record<string, string> }));
  if (!res?.ok) toast.error(errorText(data), { duration: 10000 });
  else if (data.message && !/^Nothing new/.test(data.message)) toast.success(data.message);
}

// A project from the saved project list (Project Mode and the Studio picker keep it fresh)
export function savedProject(id: string | null | undefined): PlaceProject | null {
  if (!id) return null;
  try { return (JSON.parse(localStorage.getItem(LIST_KEY) || "[]") as PlaceProject[]).find((p) => p.id === id) || null; } catch { return null; }
}

// The place actions for a project's menu (desktop app only): get a copy here, or switch where it opens. A folder
// project has none: it goes online only when the user asks the agent to make a repo and push it (then it is linked)
export function placeActions(project: PlaceProject | null | undefined): { label: string; run: () => Promise<unknown> }[] {
  if (!project || !onDesktop()) return [];
  if (project.location === "local") return [];
  if (!project.repo) return [];
  const copy = thisComputerCopy(project);
  if (!copy) return [{ label: "Get a copy on this computer", run: () => getCopyOnThisComputer(project) }];
  return [copy.here ? { label: "Open in the cloud", run: () => openProjectIn(project, "cloud") } : { label: "Open on this computer", run: () => openProjectIn(project, "local") }];
}

// One short line when Classgrid saved a project's work to GitHub by itself (after an answer that changed files)
export function listenProjectSaved(): () => void {
  const socket = getSocket();
  if (!socket) return () => {};
  const on = (d: { message?: string }) => { if (d?.message) (/couldn't/.test(d.message) ? toast.error : toast.success)(d.message, { duration: 6000 }); };
  socket.on("project-saved", on);
  return () => { socket.off("project-saved", on); };
}

// A folder project whose folder is on GitHub (the user asked the agent to make a repo and push it): link that repo, so
// the same project works in the cloud too. Nothing is pushed or uploaded. Quiet when the folder isn't on GitHub yet.
export async function linkFolderRepo(project: PlaceProject): Promise<PlaceProject | null> {
  if (project.location !== "local" || !onDesktop()) return null;
  const { res, data } = await api(`/projects/${project.id}/cloud`, {}).catch(() => ({ res: null, data: {} as Record<string, string> }));
  if (!res?.ok || !data.project) {
    if (data.code === "repo_taken") toast.error(errorText(data), { duration: 10000 });
    return null;
  }
  remember(data.project);
  toast.success(data.message || "This project works in the cloud too now.", { duration: 8000 });
  return data.project;
}
// Kept for older callers: the same as linking (it never pushes)
export const alsoUseInCloud = linkFolderRepo;
