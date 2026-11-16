// People on a live doc, shown with their real profile photo (owner, 2026-11-16: "show the actual profile photo, not
// N or S"). A person who never set a photo, or whose photo does not load, gets the first letter of their name.
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DocReader } from "./liveDocsApi";
import { menuCard, menuNote } from "./docLook";

const SIZES = { xs: "size-5 text-[10px]", sm: "size-6 text-[11px]", md: "size-8 text-[13px]", lg: "size-10 text-[15px]" } as const;

export function PersonPhoto({ name, photo, size = "md", className }: { name: string; photo?: string; size?: keyof typeof SIZES; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return photo && broken !== photo ? (
    <img
      src={photo}
      alt=""
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => setBroken(photo)}
      className={cn("shrink-0 rounded-full bg-muted object-cover", SIZES[size], className)}
    />
  ) : (
    <span aria-hidden className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full bg-foreground/10 font-semibold text-foreground", SIZES[size], className)}>
      {letter}
    </span>
  );
}

/** Who has the doc open right now: their photos side by side; a click lists them by name. */
export function ReadersRow({ readers, max = 4 }: { readers: DocReader[]; max?: number }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, [open]);
  if (readers.length === 0) return null;
  const shown = readers.slice(0, max);
  const more = readers.length - shown.length;
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${readers.length} ${readers.length === 1 ? "person is" : "people are"} here now`}
        title="Who is here now"
        className="flex cursor-pointer items-center -space-x-1.5 rounded-full p-0.5 outline-none transition-colors hover:bg-black/5 focus-visible:ring-1 focus-visible:ring-ring dark:hover:bg-white/10"
      >
        {shown.map((r) => (
          <span key={r.id} className="inline-flex rounded-full ring-2 ring-background">
            <PersonPhoto name={r.name} photo={r.photo} size="sm" />
          </span>
        ))}
        {more > 0 && (
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">+{more}</span>
        )}
      </button>
      {open && (
        <div role="dialog" aria-label="Here now" className={cn("absolute right-0 top-full mt-1.5 w-[230px]", menuCard)}>
          <div className={menuNote}>Here now</div>
          <ul className="max-h-64 overflow-y-auto">
            {readers.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl px-3 py-1.5">
                <PersonPhoto name={r.name} photo={r.photo} size="sm" />
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere] text-[14px]">{r.name || "Someone"}{r.me && <span className="text-slate-500 dark:text-white/60"> (you)</span>}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
