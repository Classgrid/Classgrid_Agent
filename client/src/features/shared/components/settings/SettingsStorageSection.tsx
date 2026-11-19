// Settings > Storage (owner, 2026-11-19: "settings has no storage at all"): how much of the Library's room is used,
// out of what the user's plan gives (Free, Pro and Max each have their own; the server works it out from the plan,
// services/plan-limits.service.js libraryStorageFor), split into files you uploaded and files Classgrid AI made.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileUp, HardDrive, RefreshCw, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { fetchWithRescue } from "@/lib/rescue";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const DESKTOP = import.meta.env.VITE_DESKTOP === "1" || import.meta.env.VITE_EDITOR === "1";

type Part = { bytes: number; count: number };
type Storage = {
  used_bytes: number;
  max_bytes: number;
  percentage: number;
  unlimited?: boolean;
  plan?: { key: string; name: string } | null;
  uploaded?: Part;
  generated?: Part;
};

export function bytesText(bytes: number) {
  const b = Math.max(0, Number(bytes) || 0);
  if (b < 1024) return `${b} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = b / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 ? Math.round(v) : Math.round(v * 10) / 10} ${units[i]}`;
}

// noLibraryLink: Classgrid Code's Settings tab, which has no Library page to open
export function SettingsStorageSection({ noLibraryLink = false }: { noLibraryLink?: boolean } = {}) {
  const navigate = useNavigate();
  const [data, setData] = useState<Storage | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetchWithRescue(`${backendUrl}/api/ai/library/quota`, { credentials: "include" });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openLibrary = () => navigate(`${DESKTOP ? "/c/studio" : "/c/agent"}/library`);

  if (!data && !failed) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-7 w-32 rounded-md" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h2 className="text-xl font-semibold text-foreground">Storage</h2>
        <div className="rounded-xl border border-border bg-card mt-5 p-5 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Your storage could not be loaded right now.</p>
          <button type="button" onClick={load} className="h-8 px-3 rounded-full text-[13px] font-medium border border-border hover:bg-muted cursor-pointer">Try again</button>
        </div>
      </div>
    );
  }

  const pct = data.unlimited ? 0 : Math.min(100, Math.max(0, data.percentage || 0));
  const left = Math.max(0, data.max_bytes - data.used_bytes);
  const barColor = pct > 90 ? "bg-red-500" : pct > 80 ? "bg-amber-400" : "bg-[#7aa7ff]";
  const used = data.used_bytes || 0;
  const share = (b: number) => (used > 0 ? Math.max(b > 0 ? 2 : 0, (b / used) * 100) : 0);
  const rows = [
    { key: "uploaded", label: "Uploaded files", hint: "Files you added to the Library or a chat", icon: FileUp, part: data.uploaded || { bytes: 0, count: 0 }, color: "bg-[#7aa7ff]" },
    { key: "generated", label: "AI-generated files", hint: "Pictures, PDFs and documents Classgrid AI made for you", icon: Sparkles, part: data.generated || { bytes: 0, count: 0 }, color: "bg-violet-400" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Storage</h2>
        <button type="button" onClick={load} disabled={busy} title="Refresh"
          className="size-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer disabled:opacity-50">
          <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* The plan's room */}
      <div className="rounded-xl border border-border bg-card mt-5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="size-10 shrink-0 rounded-lg bg-muted flex items-center justify-center"><HardDrive className="size-5 text-foreground" /></span>
            <div className="min-w-0">
              <div className="text-[15px] font-medium text-foreground">Library storage</div>
              <div className="text-[13px] text-muted-foreground truncate">
                {data.plan?.name ? `${data.plan.name} plan` : "Your account"}
                {data.unlimited ? " · Unlimited" : ` · ${bytesText(data.max_bytes)} included`}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[15px] font-medium tabular-nums text-foreground">{bytesText(used)}</div>
            <div className="text-[12px] text-muted-foreground tabular-nums">{data.unlimited ? "used" : `of ${bytesText(data.max_bytes)}`}</div>
          </div>
        </div>

        {!data.unlimited && (
          <>
            <div className="h-2 rounded-full bg-black/[0.07] dark:bg-white/[0.1] overflow-hidden mt-4">
              <div className={`h-full rounded-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted-foreground tabular-nums">
              <span>{Math.round(pct)}% used</span>
              <span>{bytesText(left)} left</span>
            </div>
            {pct > 80 && (
              <p className="mt-3 text-[13px] text-red-500">Your storage is almost full. Delete files in the Library, or upgrade your plan for more space.</p>
            )}
          </>
        )}

        {/* What fills it: one bar split by who made the files */}
        {used > 0 && (
          <div className="mt-5 h-1.5 rounded-full overflow-hidden flex bg-black/[0.05] dark:bg-white/[0.06]">
            {rows.map((r) => <div key={r.key} className={`h-full ${r.color}`} style={{ width: `${share(r.part.bytes)}%` }} />)}
          </div>
        )}
      </div>

      {/* The breakdown */}
      <h3 className="text-[13px] font-semibold text-foreground mt-7 mb-2">What's using your storage</h3>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 px-5 py-4">
            <span className={`size-2.5 shrink-0 rounded-full ${r.color}`} />
            <r.icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-foreground">{r.label}</div>
              <div className="text-[12px] text-muted-foreground truncate">{r.hint}</div>
            </div>
            <div className="text-right shrink-0 tabular-nums">
              <div className="text-sm text-foreground">{bytesText(r.part.bytes)}</div>
              <div className="text-[12px] text-muted-foreground">{r.part.count} file{r.part.count === 1 ? "" : "s"}</div>
            </div>
          </div>
        ))}
      </div>

      {!noLibraryLink && (
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={openLibrary}
            className="h-9 px-4 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-90 cursor-pointer">
            Manage files in Library
          </button>
        </div>
      )}
    </div>
  );
}
