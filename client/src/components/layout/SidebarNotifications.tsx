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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import * as Icons from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/marketing_ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/marketing_ui/popover";
import { Switch } from "@/components/marketing_ui/switch";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useUserChannel, useRealtimeChannel } from "@/features/chat/hooks/useRealtimeChat";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

type SidebarNotificationsProps = {
  settingsPath?: string;
};

export function SidebarNotifications({ settingsPath = "/settings" }: SidebarNotificationsProps) {
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"inbox" | "archive" | "settings">("inbox");
  
  // Listen for real-time chat updates to instantly refresh the bell
  useUserChannel(currentUser?._id || null, {
    onThreadUpdated: (payload: any) => {
      if (payload?.action === 'new_group' || (payload?.threadId && payload?.message)) {
        // The server saves the bell entry just after this ping, so refresh again shortly after
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ["notifications"] }), 1500);
      }
    },
  });

  // Live bell: new notifications arrive and archive moves sync across all my tabs/devices
  useRealtimeChannel(currentUser?._id ? `user:${currentUser._id}` : null, {
    notification_new: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    notifications_read: (p: { id?: string; all?: boolean }) => {
      queryClient.setQueryData<{ notifications: NotificationItem[]; unreadCount: number }>(["notifications"], (prev) => {
        if (!prev) return prev;
        const notifications = prev.notifications.map((n) => (p?.all || n._id === p?.id ? { ...n, isRead: true } : n));
        return { notifications, unreadCount: notifications.filter((n) => !n.isRead).length };
      });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await apiClient.get<{ notifications: NotificationItem[], unreadCount: number }>("/api/notifications");
      return res.data;
    },
    refetchInterval: 30000,
  });

  const { data: preferences } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const res = await apiClient.get<{ preferences: Record<string, boolean> }>("/api/notifications/preferences");
      return res.data.preferences;
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPrefs: Record<string, boolean>) => 
      apiClient.put("/api/notifications/preferences", { preferences: newPrefs }),
    // Flip the switch at once; roll back if saving fails
    onMutate: async (newPrefs) => {
      await queryClient.cancelQueries({ queryKey: ["notification-preferences"] });
      const prev = queryClient.getQueryData<Record<string, boolean>>(["notification-preferences"]);
      queryClient.setQueryData(["notification-preferences"], newPrefs);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["notification-preferences"], ctx.prev);
      toast.error("Couldn't save notification setting");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["notification-preferences"] })
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => apiClient.put(`/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => apiClient.put("/api/notifications/read-all"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.notifications || [];

  const inboxNotifs = notifications.filter((n) => !n.isRead);
  const archiveNotifs = notifications.filter((n) => n.isRead);
  const displayNotifs = tab === "inbox" ? inboxNotifs : archiveNotifs;

  return (
    <Popover>
      <PopoverTrigger className="relative w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Icons.Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-background" />
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-80 min-w-80 rounded-xl shadow-xl border border-border bg-popover text-popover-foreground p-0 overflow-hidden"
        side="bottom"
        align="end"
        sideOffset={8}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 bg-background/50">
          <div className="flex items-center gap-4 text-sm">
            <div 
              role="button"
              tabIndex={0}
              onClick={() => setTab("inbox")}
              className={`font-semibold py-2 -mb-[9px] cursor-pointer ${tab === 'inbox' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground border-b-2 border-transparent hover:text-foreground'}`}
            >
              Inbox {inboxNotifs.length > 0 && <span className="ml-1 bg-muted px-1.5 py-0.5 rounded-full text-[10px]">{inboxNotifs.length}</span>}
            </div>
            <div 
              role="button"
              tabIndex={0}
              onClick={() => setTab("archive")}
              className={`font-semibold py-2 -mb-[9px] cursor-pointer ${tab === 'archive' ? 'text-foreground border-b-2 border-foreground' : 'text-muted-foreground border-b-2 border-transparent hover:text-foreground'}`}
            >
              Archive
            </div>
          </div>
            <div 
              role="button"
              tabIndex={0}
              onClick={() => setTab("settings")}
              className={`cursor-pointer ${tab === 'settings' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icons.Settings className="w-4 h-4" />
            </div>
        </div>

        {/* Settings Panel */}
        {tab === "settings" && (
          <div className="p-4 flex flex-col gap-4 max-h-[300px] overflow-y-auto">
            <h4 className="font-semibold text-sm border-b border-border pb-2">Notification Preferences</h4>
            {[
              { id: "global", label: "All Notifications", desc: "Master switch for all in-app alerts" },
              { id: "chat", label: "Grid messages", desc: "New messages in DMs and groups" },
            ].map((setting) => (
              <div key={setting.id} className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <div className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {setting.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {setting.desc}
                  </div>
                </div>
                <Switch 
                  checked={preferences ? preferences[setting.id] !== false : true}
                  onCheckedChange={(checked) => {
                    const newPrefs = { ...(preferences || {}), [setting.id]: checked };
                    updatePreferencesMutation.mutate(newPrefs);
                  }}
                  disabled={preferences?.global === false && setting.id !== "global"}
                />
              </div>
            ))}
          </div>
        )}

        {/* Notifications List */}
        {tab !== "settings" && (
          <div className="max-h-[300px] overflow-y-auto flex flex-col">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
            ) : displayNotifs.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {tab === "inbox" ? "You're all caught up!" : "No archived notifications."}
              </div>
            ) : (
              displayNotifs.map((n) => {
                const Icon = n.type === "system" ? Icons.AlertCircle : n.type === "update" ? Icons.Info : Icons.Bell;
                const colorClass = n.type === "system" ? "text-amber-500 bg-amber-500/10" : n.type === "update" ? "text-blue-500 bg-blue-500/10" : "text-emerald-500 bg-emerald-500/10";
                
                return (
                  <div 
                    key={n._id}
                    onClick={() => {
                      if (!n.isRead) markReadMutation.mutate(n._id);
                      if (n.link) {
                        // chat.classgrid.in: chat notifications open the chat right here, in the same tab
                        if (window.location.hostname.startsWith("chat.") && (n.type === "chat" || n.type === "group_join" || /^\/(platform\/)?chat(\/|\?|$)/.test(n.link))) {
                          const q = n.link.includes("?") ? n.link.slice(n.link.indexOf("?")) : "";
                          navigate(`/agent/chat${q}`);
                          return;
                        }
                        let finalLink = n.link;
                        if (finalLink.includes('/platform/chat')) {
                          let chatPath = '/chat';
                          if (currentUser?.role === 'org_admin') chatPath = '/org/admin/chat';
                          else if (currentUser?.role === 'student') chatPath = '/org/student/chat';
                          else if (currentUser?.role === 'faculty') chatPath = '/faculty/chat';
                          finalLink = finalLink.replace('/platform/chat', chatPath);
                        }
                        window.open(finalLink, "_blank");
                      }
                    }}
                    className={`flex items-start gap-3 p-4 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer ${!n.isRead ? 'bg-muted/20' : ''}`}
                  >
                    <div className={`mt-0.5 rounded-full p-1 shrink-0 ${colorClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-sm leading-tight">
                      <span className="font-semibold mr-1">{n.title}:</span>
                      <span dangerouslySetInnerHTML={{ __html: n.message }} />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true }).replace('about ', '')}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}


        {/* Footer Action */}
        {tab === "inbox" && inboxNotifs.length > 0 && (
          <div className="p-2 border-t border-border">
            <Button 
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              {markAllReadMutation.isPending ? "Archiving..." : "Archive All"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
