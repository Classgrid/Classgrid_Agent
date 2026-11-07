// Studio's Project tab, desktop app: Mastero puts a folder project on GitHub in one step (a new repo with the name the
// user types, the folder's code pushed to it, the project linked to it), and Push sends the folder's changes with the
// commit message the user types. Server: routes/ide.routes.js /mastero and /push-here.
import { useEffect, useState } from "react";
import { ArrowRight, Check, Copy, ExternalLink, FolderGit2, Globe, Lock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { fetchWithRescue } from "@/lib/rescue";
import { linkFolderRepo, remember, thisDeviceId } from "../utils/projectCopies";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const GITHUB_ICON = "https://cdn.classgrid.in/classgrid_intgration/github-icon.svg";
const dialogCls = "gap-0 p-0 overflow-hidden rounded-xl bg-white dark:!bg-[#1e1e1e] ring-black/10 dark:ring-white/10 shadow-2xl";
const btn = "h-8 px-3 rounded-md text-[13px] transition-[background-color,opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 cursor-pointer disabled:cursor-default";
const cancelCls = `${btn} border border-black/10 dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`;
const goCls = `${btn} bg-foreground text-background font-medium hover:opacity-90`;
const boxCls = "rounded-lg border border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#161616]";

type Project = { id: string; name: string; repo: string | null; logo?: string | null };
type Account = { login: string | null; name: string | null; avatar: string | null };

const NEW_SERVER = "This needs the newest Classgrid server, which isn't live yet. Try again after the next update.";
async function post(path: string, body: Record<string, unknown>) {
  const res = await fetchWithRescue(`${backendUrl}/api/ide${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: thisDeviceId(), ...body }),
  }).catch(() => null);
  if (!res) return { ok: false, data: { error: "Classgrid can't be reached. Check your internet, then try again." } };
  if (res.status === 404) return { ok: false, data: { error: NEW_SERVER } };
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
}

// The user's GitHub account (who the repo will belong to): undefined while checking, null when not connected
function useGithubAccount(open: boolean) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  useEffect(() => {
    if (!open) return;
    let off = false;
    setAccount(undefined);
    const check = () => fetchWithRescue(`${backendUrl}/api/ide/github/me`, { credentials: "include" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!off) setAccount(r.ok ? d : null); })
      .catch(() => { if (!off) setAccount(null); });
    check();
    // GitHub connected in the computer's browser meanwhile: shown when the user comes back to the app
    window.addEventListener("focus", check);
    return () => { off = true; window.removeEventListener("focus", check); };
  }, [open]);
  return account;
}
const connectGithub = () => window.dispatchEvent(new CustomEvent("open-ai-hub", { detail: { tab: "plugins", quiet: true } }));

// After the repo is made and pushed, the chat's AI takes over (a hidden message): it asks for the project's name and
// photo with its Mastero cards (mastero_ask), then tells the user what a Mastero project is
function startMasteroChat(repo: string, folder: string, isPrivate: boolean) {
  const text = [
    `[Mastero] I pressed Mastero in Studio's Project tab. Classgrid already did this: made the ${isPrivate ? "private" : "public"} GitHub repo ${repo}, pushed the code in my folder ${folder} to it from my computer, and linked the project to it. It is now a Mastero project: the same project on my computer and in the Classgrid cloud, and GitHub is its master copy.`,
    "Finish Mastero with me, one step at a time:",
    '1. Call mastero_ask with ask "name" and a short, nice name suggestion, then end your answer.',
    '2. When I answer, call mastero_ask with ask "logo", then end your answer.',
    "3. When that's done, tell me in short, clear points:",
    "- It's a Mastero project now and GitHub is its master copy.",
    "- After every answer that changes files, the changes are pushed to GitHub (Settings → Mastero can switch that to asking yes or no first). From my computer they go to the folder's own branch (main for a new repo).",
    "- If I'm not happy with a change: the Review / Undo box under your answer takes it back while the project is open, and a change already on GitHub you undo with git revert and push that (GitHub's history is never rewritten).",
    "- To use it in the cloud too (website, phone), the Classgrid GitHub app must be installed on this repo: Projects page → Install app. In the cloud, pushes go to a classgrid/ branch with a pull request that I merge on GitHub, and my computer gets them with a pull the next time it opens.",
    "- Code runs in the Classgrid cloud only for Node.js (Node 20 / TypeScript) and Python (3.13). Go, Flutter, Java, C++ and others: you can read, write and push them in the cloud, and they run on my computer. On my computer you can do everything.",
    "- The cloud keeps the code only while it's in use: it leaves the server 5 minutes after the code editor closes (30 minutes without use in Studio); unpushed work is saved to a classgrid-backup-… branch on GitHub first.",
    "- It can go live on my own Vercel account when I ask.",
    "Then give me these links, one line each: https://classgrid.in/docs/mastero (Mastero projects), https://classgrid.in/docs/projects-cloud-and-computer (cloud and computer), https://classgrid.in/docs/connect-github (GitHub and the Classgrid app), https://classgrid.in/docs/pull-requests-and-backups (pushes and backups), https://classgrid.in/docs/review-and-undo (review and undo), https://classgrid.in/docs/deploy-with-vercel (going live).",
  ].join("\n");
  window.dispatchEvent(new CustomEvent("agent:ask", { detail: { text, hidden: true } }));
}

// Who the repo goes to: the GitHub account, or a button to connect one
function AccountRow({ account, onConnect }: { account: Account | null | undefined; onConnect: () => void }) {
  return (
    <div className={`${boxCls} flex items-center gap-2.5 h-12 px-3`}>
      {account === undefined ? (
        <>
          <span className="size-6 rounded-full bg-black/[0.06] dark:bg-white/[0.08] animate-pulse" />
          <span className="h-3 w-32 rounded bg-black/[0.06] dark:bg-white/[0.08] animate-pulse" />
        </>
      ) : account ? (
        <>
          {account.avatar ? <img src={account.avatar} alt="" className="size-6 rounded-full" /> : <img src={GITHUB_ICON} alt="" className="size-5 dark:invert" />}
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium">{account.name || account.login}</p>
            {account.login && <p className="truncate text-[11.5px] text-muted-foreground">github.com/{account.login}</p>}
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[11.5px] text-[#16825d] dark:text-[#4ec9b0]"><span className="size-1.5 rounded-full bg-current" />Connected</span>
        </>
      ) : (
        <>
          <img src={GITHUB_ICON} alt="" className="size-5 dark:invert opacity-70" />
          <p className="min-w-0 flex-1 text-[13px] text-muted-foreground">GitHub isn't connected</p>
          <button type="button" onClick={onConnect} className={`${goCls} h-7 px-2.5 text-[12px]`}>Connect GitHub</button>
        </>
      )}
    </div>
  );
}

// The top of the card: the project going to GitHub (a check on GitHub once it's there)
function Hero({ project, done }: { project: Project; done?: boolean }) {
  const tile = "size-14 rounded-2xl border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#1e1e1e] overflow-hidden flex items-center justify-center shadow-sm";
  return (
    <div className="relative flex items-center justify-center gap-4 h-32 bg-black/[0.03] dark:bg-black/30 border-b border-black/10 dark:border-white/[0.06]">
      <div className={tile}>{project.logo ? <img src={project.logo} alt="" className="size-full object-cover" /> : <FolderGit2 className="size-6 text-muted-foreground" />}</div>
      <div className="flex items-center gap-1 text-muted-foreground/60">
        <span className="w-8 border-t border-dashed border-current" />
        <ArrowRight className="size-4" />
      </div>
      <div className="relative">
        <div className={tile}><img src={GITHUB_ICON} alt="" className="size-7 dark:invert" /></div>
        {done && <span className="absolute -bottom-1.5 -right-1.5 size-6 rounded-full bg-[#16825d] text-white flex items-center justify-center ring-2 ring-white dark:ring-[#1e1e1e]"><Check className="size-3.5" /></span>}
      </div>
    </div>
  );
}

const folderOf = (name: string) => name.split(/[\\/]/).filter(Boolean).pop() || name;
const repoName = (name: string) => name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const STEPS = ["Making the repo", "Pushing your code", "Linking the project"];

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1a1a1a]">{children}</div>;
}

// ── Mastero: name the repo, then it's made, pushed and linked ────────────────────────────────────────────────
export function MasteroDialog({ project, open, onClose, onDone }: { project: Project; open: boolean; onClose: () => void; onDone: (project: Project) => void }) {
  const account = useGithubAccount(open);
  const [name, setName] = useState("");
  const [isPrivate, setPrivate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ repo: string; repoUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!open) return;
    setName(repoName(folderOf(project.name))); // a project named by its folder's path: the folder's name
    setPrivate(true);
    setError(null);
    setDone(null);
    setCopied(false);
  }, [open, project.name]);
  // The steps while it works (one request: the push is the long part, so it shows soon after starting)
  useEffect(() => {
    if (!busy) return;
    setStep(0);
    const t = setTimeout(() => setStep(1), 2500);
    return () => clearTimeout(t);
  }, [busy]);

  const wanted = repoName(name);
  const go = async () => {
    if (!wanted || busy || !account) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await post(`/projects/${project.id}/mastero`, { name: wanted, private: isPrivate });
      if (!ok) {
        // The folder is already on GitHub: it's linked to that repo instead
        if (data.code === "folder_has_repo") {
          const linked = await linkFolderRepo({ ...project, location: "local" });
          if (linked?.repo) { setDone({ repo: linked.repo, repoUrl: `https://github.com/${linked.repo}` }); onDone(linked as Project); startMasteroChat(linked.repo, folderOf(project.name), isPrivate); return; }
        }
        setError(data.error === "github_not_connected" ? "GitHub isn't connected. Connect it, then try again." : data.error || "Couldn't put this project on GitHub. Try again.");
        if (data.repo) window.dispatchEvent(new Event("studio:projects-changed"));
        return;
      }
      setStep(2);
      setDone({ repo: data.repo, repoUrl: data.repoUrl });
      if (data.project) { remember(data.project); onDone(data.project); }
      startMasteroChat(data.repo, folderOf(project.name), isPrivate);
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!done) return;
    try { await navigator.clipboard.writeText(done.repoUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { toast.error("Couldn't copy the link"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none" className={`sm:max-w-[27rem] ${dialogCls}`}>
        <Hero project={project} done={!!done} />
        {done ? (
          <>
            <div className="px-5 pt-4 pb-5">
              <DialogTitle className="text-[15px] font-medium">{folderOf(project.name)} is on GitHub</DialogTitle>
              <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">Your code is pushed and the project is linked. Classgrid AI takes it from here in the chat: it asks for the project's name and photo.</DialogDescription>
              <div className={`${boxCls} mt-3 flex items-center gap-2 h-10 pl-3 pr-1`}>
                <span className="flex-1 min-w-0 truncate font-mono text-[12.5px] text-muted-foreground">{done.repoUrl}</span>
                <button type="button" onClick={copy} className="shrink-0 flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer" title="Copy link" aria-label="Copy link">
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                </button>
              </div>
            </div>
            <Footer>
              <button type="button" onClick={onClose} className={cancelCls}>Done</button>
              <a href={done.repoUrl} target="_blank" rel="noreferrer" className={`${goCls} inline-flex items-center gap-1.5`}>Open on GitHub <ExternalLink className="size-3.5" /></a>
            </Footer>
          </>
        ) : (
          <>
            <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
              <div>
                <DialogTitle className="text-[15px] font-medium">Mastero</DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">Makes a GitHub repo for this project, pushes your code to it and links it.</DialogDescription>
              </div>
              <AccountRow account={account} onConnect={() => { connectGithub(); onClose(); }} />
              {busy ? (
                <div className="flex flex-col gap-2 py-1">
                  {STEPS.map((label, i) => (
                    <div key={label} className={`flex items-center gap-2.5 text-[13px] ${i > step ? "text-muted-foreground/60" : ""}`}>
                      {i < step ? <Check className="size-4 text-[#16825d] dark:text-[#4ec9b0]" />
                        : i === step ? <span className="size-4 flex items-center justify-center"><span className="size-3.5 rounded-full border-2 border-muted-foreground/30 border-t-foreground animate-spin" /></span>
                        : <span className="size-4 flex items-center justify-center"><span className="size-1.5 rounded-full bg-current" /></span>}
                      {label}{i === 1 && i === step ? <span className="text-muted-foreground"> · a big folder takes a minute</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[12px] text-muted-foreground" htmlFor="mastero-name">Repo name</label>
                    <div className="flex items-center h-9 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] focus-within:border-black/30 dark:focus-within:border-white/25">
                      {account?.login && <span className="shrink-0 pl-3 pr-1 text-[13px] text-muted-foreground">{account.login} /</span>}
                      <input
                        id="mastero-name"
                        autoFocus
                        data-no-ring
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") go(); }}
                        maxLength={60}
                        className={`min-w-0 flex-1 h-full ${account?.login ? "pl-1" : "pl-3"} pr-3 bg-transparent text-[13px] outline-none`}
                      />
                    </div>
                    {name.trim() && wanted !== name.trim() && <p className="text-[12px] text-muted-foreground">On GitHub it will be <span className="font-mono text-foreground/80">{wanted || "…"}</span></p>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([true, false] as const).map((priv) => (
                      <button
                        key={String(priv)}
                        type="button"
                        onClick={() => setPrivate(priv)}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${isPrivate === priv ? "border-foreground/40 bg-black/[0.03] dark:bg-white/[0.04]" : "border-black/10 dark:border-white/[0.08] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"}`}
                      >
                        {priv ? <Lock className="size-4 mt-0.5 shrink-0" /> : <Globe className="size-4 mt-0.5 shrink-0" />}
                        <span className="leading-tight">
                          <span className="block text-[13px] font-medium">{priv ? "Private" : "Public"}</span>
                          <span className="block text-[11.5px] text-muted-foreground">{priv ? "Only you can see it" : "Anyone can see it"}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {error && <p className="rounded-md bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <Footer>
              <button type="button" onClick={onClose} disabled={busy} className={cancelCls}>Cancel</button>
              <button type="button" onClick={go} disabled={!wanted || busy || !account} className={goCls}>{busy ? "Working…" : "Make repo and push"}</button>
            </Footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Push: the commit message, then the folder's changes go to GitHub ─────────────────────────────────────────
export function PushDialog({ project, open, onClose, onDone }: { project: Project; open: boolean; onClose: () => void; onDone: () => void }) {
  const account = useGithubAccount(open);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setMessage(""); setError(null); } }, [open]);

  const go = async () => {
    if (!message.trim() || busy || !account) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, data } = await post(`/projects/${project.id}/push-here`, { message: message.trim() });
      if (!ok) {
        setError(data.error === "github_not_connected" ? "GitHub isn't connected. Connect it, then try again." : data.error || "Couldn't push. Try again.");
        return;
      }
      toast.success(data.message || "Pushed to GitHub");
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogContent showCloseButton={false} overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none" className={`sm:max-w-[26rem] ${dialogCls}`}>
        <div className="px-5 pt-4 pb-5 flex flex-col gap-3">
          <div>
            <DialogTitle className="text-[15px] font-medium">Push to GitHub</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">Your changes on this computer go to <span className="font-mono text-foreground/80">{project.repo}</span>.</DialogDescription>
          </div>
          <AccountRow account={account} onConnect={() => { connectGithub(); onClose(); }} />
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] text-muted-foreground" htmlFor="push-message">Commit message</label>
            <input
              id="push-message"
              autoFocus
              data-no-ring
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") go(); }}
              placeholder="What changed?"
              maxLength={200}
              disabled={busy}
              className="w-full h-9 px-3 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] text-[13px] outline-none focus:border-black/30 dark:focus:border-white/25"
            />
          </div>
          {busy && <p className="text-[12.5px] text-muted-foreground flex items-center gap-2"><span className="size-3 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />Pushing…</p>}
          {error && <p className="rounded-md bg-red-500/10 px-3 py-2 text-[12.5px] text-red-600 dark:text-red-400">{error}</p>}
        </div>
        <Footer>
          <button type="button" onClick={onClose} disabled={busy} className={cancelCls}>Cancel</button>
          <button type="button" onClick={go} disabled={!message.trim() || busy || !account} className={goCls}>{busy ? "Pushing…" : "Push"}</button>
        </Footer>
      </DialogContent>
    </Dialog>
  );
}
