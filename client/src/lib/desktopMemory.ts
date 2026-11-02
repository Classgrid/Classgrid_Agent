// Desktop app only: the AI's memory (saved skills and personal settings) of each account is also kept on this
// computer (desktop/memory.js), and a question carries what the user saved in their other accounts here, so
// switching accounts keeps the memory. On the website none of this runs (window.classgridDesktop.saveMemory isn't there).
import { fetchWithRescue } from "./rescue";

export type ComputerMemory = { email: string; name: string; prefs: Record<string, unknown>; skills: { name: string; instructions: string }[]; savedAt: number };
type DesktopMemory = {
  saveMemory: (m: { email?: string; name?: string; prefs: unknown; skills: unknown[] }) => Promise<boolean>;
  otherMemory: () => Promise<ComputerMemory[]>;
  memoryIndex?: () => Promise<string>;
};

const desktop = (): DesktopMemory | null => {
  const d = typeof window !== "undefined" ? (window as any).classgridDesktop : null;
  return d?.saveMemory ? d : null;
};

const apiBase = () => import.meta.env.VITE_API_URL || "https://api.classgrid.in";

// The other accounts' memory, ready to send with the next question
let others: ComputerMemory[] = [];
export const otherAccountsMemory = () => (others.length ? others : undefined);
// The AI's own memory notes on this computer: MEMORY.md, the list of them, sent with every question
let notesIndex = "";
export const memoryNotesIndex = () => notesIndex || undefined;

// Keep this account's memory on the computer and load the other accounts' (at start and after each answer)
export async function syncComputerMemory(user?: { email?: string; name?: string } | null) {
  const d = desktop();
  if (!d) return;
  const get = (url: string) => fetchWithRescue(url, { credentials: "include" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const [skills, prefs] = await Promise.all([get(`${apiBase()}/api/ai/skills`), get(`${apiBase()}/api/ai/preferences`)]);
  if (skills?.skills && prefs?.preferences) {
    await d.saveMemory({ email: user?.email, name: user?.name, prefs: prefs?.preferences || {}, skills: skills?.skills || [] }).catch(() => false);
  }
  others = await d.otherMemory().catch(() => []);
  notesIndex = (await d.memoryIndex?.().catch(() => "")) || "";
}
