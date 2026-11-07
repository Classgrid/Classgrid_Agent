// Studio Mode's Uploads tab: the files sent in the open chat (photos, videos, documents), newest first, opening in the
// same viewers as the file tab (PDF pages, sheets, Word pages, pictures, video).
// Desktop app: each file sent in a chat is also kept on this computer (desktop/uploads.js) and opens from there.
// Website: the files are on our storage (R2), where the chat uploaded them.
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FolderOpen, Paperclip, Play, X } from "lucide-react";
import { FileBadge } from "@/components/ai/components/stepper/ProjectToolSteps";
import { FileContent } from "./StudioLocalFileView";

const EASE = [0.22, 1, 0.36, 1] as const;

type LocalUpload = { id: string; name: string; type: string; size: number; at: number; chatId?: string | null; file: string };
type Desktop = {
  uploadsList?: () => Promise<LocalUpload[]>;
  uploadsAdd?: (files: File[], chatId?: string | null) => Promise<{ files?: LocalUpload[]; error?: string }>;
  fileUrl?: (file: string) => string;
  showInFolder?: (file: string) => Promise<void>;
  openPath?: (file: string) => Promise<void>;
};
const desktop = () => (window as unknown as { classgridDesktop?: Desktop }).classgridDesktop;

const UPLOADS_CHANGED_EVENT = "studio:uploads-changed";
const CHAT_UPLOADS_EVENT = "studio:chat-uploads";

/** Desktop app: keep files sent in a chat on this computer too, so the Uploads tab opens them from here */
export function keepUploadsOnPC(files: File[], chatId?: string | null) {
  const d = desktop();
  if (!d?.uploadsAdd || !files.length) return;
  d.uploadsAdd(files, chatId).then(() => window.dispatchEvent(new Event(UPLOADS_CHANGED_EVENT))).catch(() => {});
}

// The open chat's files, sent by the chat (AskAiPanel) whenever they change; kept here for a tab opened later
type ChatFile = { url: string; name: string; mimeType: string; at?: number };
let lastChat: { chatId: string | null; files: ChatFile[] } = { chatId: null, files: [] };
export function publishChatUploads(chatId: string | null, files: ChatFile[]) {
  lastChat = { chatId, files };
  window.dispatchEvent(new Event(CHAT_UPLOADS_EVENT));
}

// One file as the tab shows it: from this computer (file) or online (url)
type Item = { key: string; name: string; type: string; size?: number; at?: number; url: string; file?: string };

const DOC_EXT = /\.(pdf|docx?|xlsx?|xlsm|csv|ods|pptx?|odt|odp|rtf|txt|md|json)$/i;
const kindOf = (f: Item) => (f.type.startsWith("image/") ? "photo" : f.type.startsWith("video/") ? "video" : DOC_EXT.test(f.name) ? "doc" : "other");
const sizeText = (n = 0) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} bytes`);
const time = (at?: number) => (at ? new Date(at).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }) : "");
const extLabel = (name: string) => (name.match(/\.([a-z0-9]{1,5})$/i)?.[1] || "file").toUpperCase();
const details = (f: Item) => [f.size ? sizeText(f.size) : "", time(f.at)].filter(Boolean).join(" · ");

export function StudioUploadsView() {
  const reduce = useReducedMotion();
  const [chat, setChat] = useState(lastChat);
  const [onPC, setOnPC] = useState<LocalUpload[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const onChat = () => setChat(lastChat);
    window.addEventListener(CHAT_UPLOADS_EVENT, onChat);
    return () => window.removeEventListener(CHAT_UPLOADS_EVENT, onChat);
  }, []);
  useEffect(() => setOpen(null), [chat.chatId]);
  // Desktop app: the copies kept on this computer
  useEffect(() => {
    const d = desktop();
    if (!d?.uploadsList) return;
    const load = () => d.uploadsList!().then(setOnPC).catch(() => {});
    load();
    window.addEventListener(UPLOADS_CHANGED_EVENT, load);
    return () => window.removeEventListener(UPLOADS_CHANGED_EVENT, load);
  }, []);

  // This chat's files, newest first; one kept on this computer opens from there
  const items = useMemo(() => {
    const seen = new Set<string>();
    const list: Item[] = [];
    for (const f of [...chat.files].reverse()) {
      const key = `${f.name}|${f.url.slice(0, 200)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const here = onPC.find((x) => x.name === f.name && (!x.chatId || !chat.chatId || x.chatId === chat.chatId));
      list.push(here
        ? { key, name: f.name, type: f.mimeType || here.type, size: here.size, at: f.at, file: here.file, url: desktop()?.fileUrl?.(here.file) || f.url }
        : { key, name: f.name, type: f.mimeType, at: f.at, url: f.url });
    }
    return list;
  }, [chat, onPC]);
  const at = open ? items.findIndex((f) => f.key === open) : -1;
  const current = at >= 0 ? items[at]! : null;

  // Arrow keys move through the open file; Escape closes it
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest?.("input, textarea, [contenteditable]")) return;
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowLeft" && at > 0) setOpen(items[at - 1]!.key);
      else if (e.key === "ArrowRight" && at < items.length - 1) setOpen(items[at + 1]!.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, at, items]);

  const iconBtn = "flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-default";

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div className="shrink-0 flex items-center gap-2 h-12 px-4 border-b border-border text-[13px] text-muted-foreground">
        <Paperclip className="size-4" />
        <span>{items.length ? `${items.length} file${items.length === 1 ? "" : "s"} uploaded in this chat` : "Uploads"}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-3 [scrollbar-width:thin]">
        {!items.length ? (
          <div className="h-full flex items-center justify-center px-6">
            <div className="max-w-sm text-center flex flex-col items-center gap-3">
              <div className="flex items-center justify-center size-12 rounded-full border border-border"><Paperclip className="size-5 text-muted-foreground" /></div>
              <p className="text-base font-medium">No uploads yet</p>
              <p className="text-sm text-muted-foreground">Photos, videos and documents you send in this chat show up here.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {items.map((f) => (
              <motion.button
                key={f.key}
                type="button"
                onClick={() => setOpen(f.key)}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="group flex flex-col text-left rounded-lg border border-border overflow-hidden bg-background hover:border-foreground/25 transition-colors cursor-pointer"
              >
                <Thumb f={f} />
                <div className="px-2.5 py-2 min-w-0 w-full">
                  <p className="truncate text-[12.5px] font-medium" title={f.name}>{f.name}</p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{details(f) || extLabel(f.name)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* One file, open in its viewer */}
      <AnimatePresence>
        {current && (
          <motion.div
            key="viewer"
            className="absolute inset-0 z-20 flex flex-col bg-background"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="shrink-0 flex items-center gap-1 h-12 px-2 border-b border-border">
              <button className={iconBtn} onClick={() => setOpen(null)} title="Close" aria-label="Close"><X className="size-4" /></button>
              <FileBadge path={current.name} />
              <div className="flex-1 min-w-0 px-1">
                <p className="truncate text-[13px] font-medium" title={current.name}>{current.name}</p>
                <p className="truncate text-[11.5px] text-muted-foreground">{[details(current), `${at + 1} of ${items.length}`].filter(Boolean).join(" · ")}</p>
              </div>
              <button className={iconBtn} disabled={at <= 0} onClick={() => setOpen(items[at - 1]!.key)} title="Newer" aria-label="Newer"><ChevronLeft className="size-4" /></button>
              <button className={iconBtn} disabled={at >= items.length - 1} onClick={() => setOpen(items[at + 1]!.key)} title="Older" aria-label="Older"><ChevronRight className="size-4" /></button>
              {current.file ? (
                <>
                  <button className={iconBtn} onClick={() => desktop()?.showInFolder?.(current.file!)} title="Show in File Explorer" aria-label="Show in File Explorer"><FolderOpen className="size-4" /></button>
                  <button className={iconBtn} onClick={() => desktop()?.openPath?.(current.file!)} title="Open with your computer's app" aria-label="Open with your computer's app"><ExternalLink className="size-4" /></button>
                </>
              ) : (
                <a className={iconBtn} href={current.url} target="_blank" rel="noopener noreferrer" download={current.name} title="Download" aria-label="Download"><Download className="size-4" /></a>
              )}
            </div>
            <div className="relative flex-1 min-h-0 bg-[#f5f5f5] dark:bg-[#141414]">
              <FileContent key={current.key} url={current.url} name={current.name} size={current.size} path={current.file} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// A card's picture: the photo, the video's first frame, or the file's icon and kind
function Thumb({ f }: { f: Item }) {
  const [failed, setFailed] = useState(false);
  const k = kindOf(f);
  return (
    <div className="relative w-full aspect-[16/10] overflow-hidden bg-secondary flex items-center justify-center">
      {k === "photo" && !failed ? (
        <img src={f.url} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
      ) : k === "video" && !failed ? (
        <>
          <video src={`${f.url}#t=0.1`} preload="metadata" muted playsInline onError={() => setFailed(true)} className="size-full object-cover" />
          <span className="absolute flex items-center justify-center size-8 rounded-full bg-black/55 text-white"><Play className="size-4 fill-current" /></span>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          <span className="[&_svg]:!size-8 [&>span]:size-8"><FileBadge path={f.name} /></span>
          <span className="text-[10.5px] font-medium tracking-wide text-muted-foreground">{extLabel(f.name)}</span>
        </div>
      )}
    </div>
  );
}
