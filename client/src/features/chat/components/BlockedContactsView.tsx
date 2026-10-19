/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// Right panel listing the people I blocked in Grid chat, each with an Unblock button. The list is live:
// it comes from useChatBlocks, which updates over the user's WebSocket channel.
import { ArrowLeft, Ban } from "lucide-react";
import { DEFAULT_USER_AVATAR } from "@/lib/constants";
import type { BlockedContact } from "../services/chatApi";

interface BlockedContactsViewProps {
  blocked: BlockedContact[];
  onUnblock: (userId: string, name?: string) => void;
  onClose: () => void;
}

export function BlockedContactsView({ blocked, onUnblock, onClose }: BlockedContactsViewProps) {
  return (
    <div className="absolute inset-0 z-40 bg-background flex flex-col h-full w-full">
      <div className="h-[60px] flex items-center gap-3 px-4 bg-background border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Ban className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg text-foreground">Blocked contacts</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <p className="px-4 py-3 text-xs text-muted-foreground border-b border-border">
          Blocked contacts can't see when you're online or your profile updates, and their messages never reach you.
        </p>
        {blocked.length === 0 ? (
          <div className="text-center text-muted-foreground h-48 flex flex-col items-center justify-center gap-3">
            <Ban className="w-10 h-10 opacity-20" />
            <p className="text-sm">No blocked contacts</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {blocked.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <img
                  src={c.profilePicture || DEFAULT_USER_AVATAR}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover bg-muted border border-border/50 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.name || "Unknown user"}</p>
                  {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                </div>
                <button
                  onClick={() => onUnblock(c.id, c.name)}
                  className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border border-border hover:bg-accent text-foreground transition-colors"
                >
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
