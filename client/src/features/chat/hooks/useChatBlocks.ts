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
// WhatsApp-style blocking for Grid chat. The block list is loaded once and kept live over the
// user's Socket.IO channel: the server emits "user:block_updated" to both people on every block/unblock.
import { useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchBlocks, blockUser, unblockUser, type ChatBlocks, type BlockedContact } from "../services/chatApi";
import { useRealtimeChannel } from "./useRealtimeChat";

const KEY = ["chat-blocks"];
const EMPTY: ChatBlocks = { blocked: [], blockedMe: [] };

export function useChatBlocks(currentUserId: string | null | undefined, onChange?: (e: { userId: string; blocked: boolean; by: "me" | "them" }) => void) {
  const queryClient = useQueryClient();
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const { data = EMPTY } = useQuery({
    queryKey: KEY,
    queryFn: fetchBlocks,
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });

  useRealtimeChannel(currentUserId ? `user:${currentUserId}` : null, {
    block_updated: (p: { userId: string; blocked: boolean; by: "me" | "them" }) => {
      if (!p?.userId) return;
      queryClient.setQueryData<ChatBlocks>(KEY, (prev = EMPTY) => {
        if (p.by === "them") {
          const set = new Set(prev.blockedMe);
          if (p.blocked) set.add(p.userId); else set.delete(p.userId);
          return { ...prev, blockedMe: [...set] };
        }
        if (!p.blocked) return { ...prev, blocked: prev.blocked.filter((b) => b.id !== p.userId) };
        return prev;
      });
      // A block from another tab of mine needs the contact's name/picture, so refetch.
      if (p.by === "me" && p.blocked) queryClient.invalidateQueries({ queryKey: KEY });
      onChangeRef.current?.(p);
    },
  });

  const blockedIds = useMemo(() => new Set(data.blocked.map((b) => b.id)), [data.blocked]);
  const blockedMeIds = useMemo(() => new Set(data.blockedMe), [data.blockedMe]);
  /** Anyone on either side of a block: hide their presence and typing. */
  const hiddenIds = useMemo(() => new Set([...blockedIds, ...blockedMeIds]), [blockedIds, blockedMeIds]);

  const block = useCallback(async (contact: BlockedContact) => {
    const prev = queryClient.getQueryData<ChatBlocks>(KEY) || EMPTY;
    queryClient.setQueryData<ChatBlocks>(KEY, { ...prev, blocked: [...prev.blocked.filter((b) => b.id !== contact.id), contact] });
    try {
      await blockUser(contact.id);
      toast.success(`${contact.name || "Contact"} blocked`);
    } catch (e: any) {
      queryClient.setQueryData(KEY, prev);
      toast.error(e?.response?.data?.error || "Failed to block");
    }
  }, [queryClient]);

  const unblock = useCallback(async (userId: string, name?: string) => {
    const prev = queryClient.getQueryData<ChatBlocks>(KEY) || EMPTY;
    queryClient.setQueryData<ChatBlocks>(KEY, { ...prev, blocked: prev.blocked.filter((b) => b.id !== userId) });
    try {
      await unblockUser(userId);
      toast.success(`${name || "Contact"} unblocked`);
    } catch (e: any) {
      queryClient.setQueryData(KEY, prev);
      toast.error(e?.response?.data?.error || "Failed to unblock");
    }
  }, [queryClient]);

  return { blocked: data.blocked, blockedIds, blockedMeIds, hiddenIds, block, unblock };
}
