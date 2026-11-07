// Studio's Project tab, a Mastero project in the desktop app: the open chat's link on chat.classgrid.in, as a QR code to
// scan with a phone and a "copy link" window (like Remote Control). The chat goes online only when the user does one of
// these by hand: copying the link (POST /api/ai/sessions/:id/online), or opening it on the website (the server marks it
// then). Until then it stays in the desktop app.
import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/marketing_ui/dialog";
import { fetchWithRescue } from "@/lib/rescue";
import { useChatId } from "./StudioShotsView";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
const chatLink = (id: string) => `https://chat.classgrid.in/c/studio/${id}`;

// The QR code on a white tile, so phones read it in dark mode too
function Qr({ value, size }: { value: string; size: number }) {
  return (
    <div className="shrink-0 rounded-lg bg-white p-2 shadow-sm" style={{ width: size + 16, height: size + 16 }}>
      <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#000000" />
    </div>
  );
}

export function MasteroOnlineCard({ className = "" }: { className?: string }) {
  const chatId = useChatId();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = chatId ? chatLink(chatId) : "";

  const copy = async () => {
    if (!chatId) return;
    const res = await fetchWithRescue(`${backendUrl}/api/ai/sessions/${chatId}/online`, { method: "POST", credentials: "include" }).catch(() => null);
    if (!res?.ok) { toast.error("Couldn't take this chat online. Try again."); return; }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { toast.error("Couldn't copy the link"); }
  };

  return (
    <div className={className}>
      <div className="flex items-start gap-4 p-3">
        <div className="min-w-0 flex-1 flex flex-col gap-1">
          <span className="text-[13px] font-medium">Continue online</span>
          <p className="text-[12px] text-muted-foreground">
            {chatId
              ? <>Open this chat on chat.classgrid.in or your phone. It stays in this app until you open it there or copy its link. Scan the code, or <button type="button" onClick={() => setOpen(true)} className="text-[#3b82f6] hover:underline underline-offset-2 cursor-pointer">copy link</button>.</>
              : "Start a chat in this project to open it on chat.classgrid.in or your phone."}
          </p>
        </div>
        {chatId && (
          <button type="button" onClick={() => setOpen(true)} className="cursor-pointer rounded-lg transition-transform hover:scale-[1.03]" title="Show bigger" aria-label="Show the QR code bigger">
            <Qr value={link} size={72} />
          </button>
        )}
      </div>

      {/* The bigger code with the link to copy */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton={false} overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-none" className="sm:max-w-[26rem] gap-0 p-0 overflow-hidden rounded-xl bg-white dark:!bg-[#1e1e1e] ring-black/10 dark:ring-white/10 shadow-2xl">
          <div className="relative flex items-center justify-center py-8 bg-black/[0.03] dark:bg-black/40 border-b border-black/10 dark:border-white/[0.06]">
            <button type="button" onClick={() => setOpen(false)} className="absolute top-3 right-3 flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer" aria-label="Close">
              <X className="size-4" />
            </button>
            {link && <Qr value={link} size={200} />}
          </div>
          <div className="px-5 pt-4 pb-5">
            <DialogTitle className="text-[15px] font-medium">Open on chat.classgrid.in</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px] text-muted-foreground">Continue this chat from your phone or another computer. Scan the QR code or copy the link below. Copying it puts the chat online.</DialogDescription>
            <div className="mt-3 flex items-center gap-2 h-10 pl-3 pr-1 rounded-lg border border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#161616]">
              <span className="flex-1 min-w-0 truncate font-mono text-[12.5px] text-muted-foreground">{link}</span>
              <button type="button" onClick={copy} className="shrink-0 flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/[0.05] dark:hover:bg-white/[0.06] cursor-pointer" title="Copy link" aria-label="Copy link">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
