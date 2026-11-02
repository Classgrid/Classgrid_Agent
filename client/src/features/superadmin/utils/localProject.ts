// Projects that are a folder on this computer (desktop app): the app lists and reads the folder itself,
// the server only knows where the folder is.
type FilesListing = { files?: { path: string; type: string; size?: number | null }[]; error?: string; [k: string]: unknown };
type DesktopFiles = {
  listFiles?: (folder: string) => Promise<FilesListing>;
  readFile?: (folder: string, path: string) => Promise<Record<string, unknown> & { error?: string }>;
};
const desktop = () => (window as unknown as { classgridDesktop?: DesktopFiles }).classgridDesktop;

// The folder of a project picked on this computer, from the saved project list (null for cloud projects)
export function localFolderOf(projectId: string | null | undefined): string | null {
  if (!projectId) return null;
  try {
    const list = JSON.parse(localStorage.getItem("cg_studio_projects") || "[]") as { id: string; location?: string; localPath?: string | null; localCopies?: { deviceId: string; path: string; here?: boolean }[] }[];
    const p = list.find((x) => x.id === projectId);
    if (p?.location === "local") return p.localPath || null;
    // A cloud project set to "On this computer" in this desktop app: its copy here
    const device = (window as unknown as { classgridDesktop?: { deviceId?: string } }).classgridDesktop?.deviceId;
    const copy = device ? (p?.localCopies || []).find((c) => c.deviceId === device && c.here) : null;
    return copy?.path || null;
  } catch {
    return null;
  }
}

const NOT_HERE = "This project is a folder on a computer. Open it in the Classgrid desktop app on that computer.";

export async function listLocalFiles(folder: string): Promise<FilesListing> {
  const d = desktop();
  if (!d?.listFiles) return { error: NOT_HERE };
  return d.listFiles(folder);
}

export async function readLocalFile(folder: string, path: string): Promise<Record<string, unknown> & { error?: string }> {
  const d = desktop();
  if (!d?.readFile) return { error: NOT_HERE };
  return d.readFile(folder, path);
}
