// Share Grid: up to 4 people in one Classgrid AI chat. The right-side panel (invite + people + history),
// the live-update hook, and the small name tag shown above other people's messages.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Link2, Mail, Users, X, UserMinus, UserPlus, Search, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { apiClient } from "@/lib/apiClient";
import { getSocket } from "@/lib/socketClient";
import { cn } from "@/lib/utils";

export type GridPerson = { email: string; name: string; avatar?: string; role: "owner" | "member"; messageCount: number | null; joinedAt?: string };
type GridHistoryItem = { id: string; type: "link" | "grids" | "email"; status: "pending" | "accepted" | "declined" | "revoked"; email: string | null; name: string | null; invitedBy: string; createdAt: string; acceptedAt: string | null };
/** Who the agent is answering right now (one reply at a time in a shared chat) */
export type GridReplying = { email: string; name: string } | null;
export type GridData = { isOwner: boolean; maxPeople: number; members: GridPerson[]; history: GridHistoryItem[]; link: string | null; replying?: GridReplying };
type Contact = { email: string; name: string; avatar: string };

const gridKey = (sessionId: string) => ["share-grid", sessionId];
// How many parts of the page are using each chat's live room
const roomUsers = new Map<string, number>();
const errorText = (err: any, fallback: string) => err?.message || err?.response?.data?.error || fallback;

/** Panel data for a chat, plus live updates: refreshes when someone joins, is invited or sends a message. */
export function useShareGrid(sessionId: string | null | undefined, onMessagesChanged?: (e: { by?: string; kind?: string; reason?: string | null; canReopen?: boolean }) => void) {
  const queryClient = useQueryClient();
  const query = useQuery<GridData>({
    queryKey: gridKey(sessionId || ""),
    queryFn: async () => (await apiClient.get<GridData>(`/api/ai/grid/${sessionId}`)).data,
    enabled: !!sessionId,
    staleTime: 0,
  });
  const shared = (query.data?.members?.length || 0) > 1;
  const onMessagesRef = useRef(onMessagesChanged);
  onMessagesRef.current = onMessagesChanged;
  // Who the agent is answering, from the live "reply_start" / "reply_end" signals. A reload of the panel
  // data can't clear it early; only "reply_end" (or a 10 minute safety limit) does.
  const [liveReplying, setLiveReplying] = useState<GridReplying>(null);
  useEffect(() => setLiveReplying(null), [sessionId]);
  useEffect(() => {
    if (!liveReplying) return;
    const t = setTimeout(() => setLiveReplying(null), 10 * 60 * 1000);
    return () => clearTimeout(t);
  }, [liveReplying]);

  useEffect(() => {
    if (!sessionId) return;
    const socket = getSocket();
    if (!socket) return;
    const join = () => socket.emit("join_ai_grid", sessionId);
    // Back online after a drop: events may have been missed, so start fresh from the server
    const onReconnect = () => {
      join();
      setLiveReplying(null);
      queryClient.invalidateQueries({ queryKey: gridKey(sessionId) });
      onMessagesRef.current?.({ kind: "messages" });
    };
    // The chat and the panel both use this hook; the screen leaves the room only when the last one closes
    // (closing the panel used to take the whole screen out of the room, so live updates stopped)
    const users = (roomUsers.get(sessionId) || 0) + 1;
    roomUsers.set(sessionId, users);
    if (users === 1) join();
    socket.io.on("reconnect", onReconnect);
    const onUpdate = (e: { sessionId: string; kind: string; by?: string; name?: string; reason?: string | null; canReopen?: boolean }) => {
      if (e?.sessionId !== sessionId) return;
      // Show "Agent is responding to …" right away; the refetch below confirms it
      if (e.kind === "reply_start" && e.by) setLiveReplying({ email: e.by, name: e.name || e.by });
      if (e.kind === "reply_end") setLiveReplying((cur) => (cur && e.by && cur.email !== e.by ? cur : null));
      queryClient.invalidateQueries({ queryKey: gridKey(sessionId) });
      if (e.kind === "messages" || e.kind === "ended") onMessagesRef.current?.(e);
    };
    socket.on("aigrid:update", onUpdate);
    return () => {
      socket.io.off("reconnect", onReconnect);
      socket.off("aigrid:update", onUpdate);
      const left = (roomUsers.get(sessionId) || 1) - 1;
      if (left > 0) roomUsers.set(sessionId, left);
      else { roomUsers.delete(sessionId); socket.emit("leave_ai_grid", sessionId); }
    };
  }, [sessionId, queryClient]);

  return { data: query.data, isLoading: query.isLoading, shared, replying: (liveReplying || query.data?.replying || null) as GridReplying, refresh: () => queryClient.invalidateQueries({ queryKey: gridKey(sessionId || "") }) };
}

function PersonAvatar({ name, avatar, size = 32 }: { name: string; avatar?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return avatar && !broken ? (
    <img src={avatar} alt="" onError={() => setBroken(true)} className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full shrink-0 flex items-center justify-center bg-muted text-muted-foreground font-medium" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {initial}
    </div>
  );
}

/** A line in the chat where someone joined: "Rahul (rahul@x.com) joined the chat via the invite link · Oct 22, 11:11 AM". */
/** The squiggly line that flanks a centered divider label (same look as the "Switched to <model>" divider). */
function WaveLine({ className }: { className?: string }) {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg className={cn("h-3 w-full shrink", className)} preserveAspectRatio="none" aria-hidden="true">
      <pattern id={id} width="14" height="12" patternUnits="userSpaceOnUse">
        <path d="M0 6 Q3.5 0 7 6 T14 6" fill="none" stroke="currentColor" strokeWidth="1.25" />
      </pattern>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function GridJoinLine({ name, email, via, at }: { name: string; email: string; via?: string; at: number }) {
  const how = via === "link" ? " via the invite link" : via === "email" ? " from an email invite" : via === "grids" ? " from Grids" : "";
  const when = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(at));
  return (
    <div className="flex items-center gap-3 w-full my-5 px-4 text-muted-foreground/50">
      <WaveLine />
      <span className="shrink-0 text-[12px] text-center text-muted-foreground">
        <span className="font-semibold text-foreground/80">{name}</span> ({email}) joined the chat{how} · {when}
      </span>
      <WaveLine />
    </div>
  );
}

/** Above the input while the agent answers someone else: sending is blocked until it's done. */
export function GridReplyingLine({ person }: { person: { name: string; email: string } }) {
  // Two people with the same name already come as "Name (email)": show the email only once
  const name = person.email ? person.name.replace(` (${person.email})`, "") : person.name;
  const showEmail = person.email && name !== person.email;
  return (
    <div className="flex items-center gap-2.5 w-full my-4 text-[14px] text-muted-foreground" role="status" aria-live="polite">
      {/* Three bouncing dots */}
      <span className="flex items-end gap-1 h-3 shrink-0" aria-hidden="true">
        {[0, 150, 300].map((delay) => (
          <span key={delay} className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
        ))}
      </span>
      <span className="min-w-0 break-words">
        Agent is responding to <span className="font-semibold text-foreground/80">{name}</span>
        {showEmail ? ` (${person.email})` : ""}. You can send when it's done.
      </span>
    </div>
  );
}

/** Small name + photo above a message someone else sent in a shared chat. */
export function GridSenderTag({ person }: { person: { name: string; avatar?: string } }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground px-1">
      <PersonAvatar name={person.name} avatar={person.avatar} size={18} />
      <span className="font-medium">{person.name}</span>
    </div>
  );
}

/** Panel placeholder while it loads: the same blocks as the real panel */
function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-52" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start gap-2.5 py-2">
            <Skeleton className="h-3.5 w-3.5 rounded-sm mt-0.5" />
            <div className="flex-1 flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(iso: string | null | undefined) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function historyText(h: GridHistoryItem) {
  // Always the full email; with the name in front when the person has a Classgrid account
  const who = h.email ? (h.name && h.name !== h.email ? `${h.name} (${h.email})` : h.email) : (h.name || "Someone");
  if (h.type === "link") return h.status === "accepted" ? `${who} joined with the invite link` : h.status === "revoked" ? "Invite link turned off" : "Invite link made";
  const how = h.type === "grids" ? "from Grids" : "by email";
  if (h.status === "accepted") return `${who} accepted the invite (${how})`;
  if (h.status === "declined") return `${who} declined the invite (${how})`;
  return `Invite sent to ${who} (${how})`;
}

const STATUS_LABEL: Record<GridHistoryItem["status"], string> = { pending: "Pending", accepted: "Accepted", declined: "Declined", revoked: "Turned off" };

export function ShareGridPanel({ sessionId, myEmail, onClose }: { sessionId: string; myEmail: string; onClose: () => void }) {
  const { data, isLoading, refresh } = useShareGrid(sessionId);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const me = myEmail.toLowerCase();
  const members = data?.members || [];
  const max = data?.maxPeople || 4;
  const full = members.length >= max;
  const spotsLeft = Math.max(0, max - members.length);

  const contactsQuery = useQuery<{ contacts: Contact[] }>({
    queryKey: ["share-grid-contacts"],
    queryFn: async () => (await apiClient.get(`/api/ai/grid/contacts/list`)).data,
    enabled: pickOpen,
    staleTime: 60_000,
  });
  const memberEmails = useMemo(() => new Set(members.map((m) => m.email)), [members]);
  const contacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (contactsQuery.data?.contacts || []).filter((c) => !memberEmails.has(c.email) && (!q || c.name.toLowerCase().includes(q) || c.email.includes(q)));
  }, [contactsQuery.data, memberEmails, search]);

  const copyLink = async () => {
    setBusy("link");
    try {
      const link = data?.link || (await apiClient.post<{ link: string }>(`/api/ai/grid/${sessionId}/link`)).data.link;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast.success("Invite link copied.");
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Could not copy the invite link."));
    } finally {
      setBusy(null);
    }
  };

  const turnOffLink = async () => {
    setBusy("revoke");
    try {
      await apiClient.delete(`/api/ai/grid/${sessionId}/link`);
      toast.success("Invite link turned off.");
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Could not turn off the link."));
    } finally {
      setBusy(null);
    }
  };

  const sendInvites = async (emails: string[], type: "email" | "grids") => {
    setBusy(type);
    try {
      const { data: res } = await apiClient.post<{ results: { email: string; ok?: boolean; error?: string }[] }>(`/api/ai/grid/${sessionId}/invites`, { emails, type });
      const ok = res.results.filter((r) => r.ok).length;
      const failed = res.results.filter((r) => r.error);
      if (ok) toast.success(ok === 1 ? "Invite sent." : `${ok} invites sent.`);
      failed.forEach((f) => toast.error(`${f.email}: ${f.error}`));
      if (type === "email" && ok) setEmail("");
      if (type === "grids") { setPicked([]); setPickOpen(false); }
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Could not send the invite."));
    } finally {
      setBusy(null);
    }
  };

  const removePerson = async (person: GridPerson) => {
    const leaving = person.email === me;
    setBusy(`rm:${person.email}`);
    try {
      await apiClient.delete(`/api/ai/grid/${sessionId}/members/${encodeURIComponent(person.email)}`);
      toast.success(leaving ? "You left this chat." : `${person.name} was removed.`);
      if (leaving) window.location.assign(window.location.pathname.startsWith("/superadmin") ? "/superadmin/agent" : "/agent");
      else refresh();
    } catch (err) {
      toast.error(errorText(err, "Could not remove."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 400, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", bounce: 0, duration: 0.3 }}
      className="shrink-0 h-full bg-background border-l border-border/50 flex flex-col overflow-hidden shadow-xl z-50 max-sm:fixed max-sm:inset-0 max-sm:!w-full max-sm:z-[130] max-sm:border-l-0"
    >
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 h-14 border-b border-border/50">
        <Button variant="secondary" size="sm" className="text-xs h-8 pointer-events-none">
          <Users className="h-4 w-4 mr-2" />
          Share Grid
        </Button>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0 ml-2 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto w-full sm:w-[400px] p-4 flex flex-col gap-6">
        {isLoading || !data ? (
          <PanelSkeleton />
        ) : (
          <>
            {/* Invite (owner only) */}
            {data.isOwner && (
              <section className="flex flex-col gap-2.5">
                <div className="text-sm font-semibold text-foreground">Invite people</div>
                <p className="text-xs text-muted-foreground">
                  {full ? `This chat has ${max} people, the most it can have.` : `${spotsLeft} more ${spotsLeft === 1 ? "person" : "people"} can join (up to ${max} in total).`}
                </p>

                <Button variant="secondary" className="justify-start h-10" disabled={busy === "link"} onClick={copyLink}>
                  {busy === "link" ? <Spinner className="size-4 mr-2" /> : copied ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                  {copied ? "Copied" : "Copy invite link"}
                </Button>

                <Button variant="secondary" className="justify-start h-10" disabled={full} onClick={() => setPickOpen((o) => !o)}>
                  <Users className="h-4 w-4 mr-2" />
                  Add from Grids
                </Button>
                {pickOpen && (
                  <div className="rounded-xl border border-border/60 p-2 flex flex-col gap-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people" className="h-9 pl-8 text-sm" aria-label="Search people" />
                    </div>
                    <div className="max-h-56 overflow-y-auto flex flex-col">
                      {contactsQuery.isLoading ? (
                        <div className="flex flex-col" aria-busy="true">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className="flex items-center gap-2.5 px-2 py-1.5">
                              <Skeleton className="h-7 w-7 rounded-full" />
                              <div className="flex-1 flex flex-col gap-1.5">
                                <Skeleton className="h-3.5 w-28" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : contacts.length === 0 ? (
                        <div className="text-xs text-muted-foreground p-2">No one to add from your Grids.</div>
                      ) : contacts.map((c) => {
                        const on = picked.includes(c.email);
                        const blocked = !on && picked.length >= spotsLeft;
                        return (
                          <button
                            key={c.email}
                            type="button"
                            disabled={blocked}
                            onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c.email) : [...p, c.email]))}
                            className={cn("flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left hover:bg-muted transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed", on && "bg-muted")}
                          >
                            <PersonAvatar name={c.name} avatar={c.avatar} size={28} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm truncate text-foreground">{c.name}</div>
                              <div className="text-[11px] text-muted-foreground truncate">{c.email}</div>
                            </div>
                            {on && <Check className="h-4 w-4 text-foreground shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <Button variant="secondary" size="sm" disabled={picked.length === 0 || busy === "grids"} onClick={() => sendInvites(picked, "grids")}>
                      {busy === "grids" && <Spinner className="size-4 mr-2" />}
                      {picked.length > 1 ? `Invite ${picked.length} people` : "Invite"}
                    </Button>
                  </div>
                )}

                <form
                  className="flex gap-2"
                  onSubmit={(e) => { e.preventDefault(); if (email.trim()) sendInvites([email.trim()], "email"); }}
                >
                  <div className="relative flex-1">
                    <Mail className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Invite by email" className="h-10 pl-8 text-sm" aria-label="Invite by email" disabled={full} />
                  </div>
                  <Button type="submit" variant="secondary" className="h-10 px-4" disabled={!email.trim() || full || busy === "email"}>
                    {busy === "email" && <Spinner className="size-4 mr-2" />}
                    Invite
                  </Button>
                </form>

                {data.link && (
                  <button type="button" onClick={turnOffLink} disabled={busy === "revoke"} className="self-start text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer">
                    Turn off invite link
                  </button>
                )}
              </section>
            )}

            {/* People: name, photo, messages sent */}
            <section className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-foreground">People · {members.length} of {max}</div>
              <div className="flex flex-col gap-1.5">
                {members.map((p) => (
                  <div key={p.email} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50">
                    <PersonAvatar name={p.name} avatar={p.avatar} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate text-foreground">
                        {p.name}{p.email === me ? " (you)" : ""}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{p.email}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.role === "owner" ? "Owner" : "Member"}
                        {p.messageCount !== null && ` · ${p.messageCount} ${p.messageCount === 1 ? "message" : "messages"}`}
                      </div>
                    </div>
                    {p.role !== "owner" && (data.isOwner || p.email === me) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" disabled={busy === `rm:${p.email}`}
                        onClick={() => removePerson(p)} aria-label={p.email === me ? "Leave chat" : `Remove ${p.name}`} title={p.email === me ? "Leave chat" : "Remove"}>
                        {busy === `rm:${p.email}` ? <Spinner className="size-4" /> : <UserMinus className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* History: every invite and what happened */}
            <section className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-foreground">History</div>
              {data.history.length === 0 ? (
                <div className="text-xs text-muted-foreground">No invites yet.</div>
              ) : (
                <div className="flex flex-col">
                  {data.history.map((h) => (
                    <div key={h.id} className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-b-0">
                      <div className="mt-0.5 text-muted-foreground">
                        {h.type === "link" ? <Link2 className="h-3.5 w-3.5" /> : h.type === "grids" ? <Users className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-foreground break-words">{historyText(h)}</div>
                        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {timeAgo(h.acceptedAt || h.createdAt)}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{STATUS_LABEL[h.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </motion.div>
  );
}
