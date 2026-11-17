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

// Requests: people asking to join the group chats this person runs (incoming, and the ones already answered under
// History), and the join requests this person sent (My requests). /requests/:groupId and /join-requests/:groupId
// (opened from a group's settings) show only that group's requests.
import { useMemo, useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUnifiedRequests, processJoinRequest, type JoinRequest } from "../services/chatApi";
import { Check, X, Users, Inbox, Clock } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_USER_AVATAR } from "@/lib/constants";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";

type Tab = "incoming" | "outgoing" | "history";

const day = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

function StatusChip({ status }: { status: JoinRequest["status"] }) {
  const cls =
    status === "approved"
      ? "bg-foreground text-background"
      : status === "rejected"
        ? "bg-red-500/10 text-red-600 dark:text-red-400"
        : "bg-muted text-muted-foreground";
  const label = status === "approved" ? "Accepted" : status === "rejected" ? "Declined" : "Waiting";
  return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

function Empty({ icon: Icon, title, text }: { icon: typeof Inbox; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card px-4 py-14 text-center">
      <Icon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function PersonRow({ req, children, faded }: { req: JoinRequest; children: ReactNode; faded?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between ${faded ? "opacity-80" : ""}`}>
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={req.user_avatar || DEFAULT_USER_AVATAR}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full border border-border bg-muted object-cover"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{req.user_name}</p>
          {req.user_email && <p className="truncate text-xs text-muted-foreground">{req.user_email}</p>}
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">
              Asked to join <span className="font-medium text-foreground">{req.group?.name || "a group chat"}</span> on {day(req.created_at)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">{children}</div>
    </div>
  );
}

export function JoinRequestPage() {
  const queryClient = useQueryClient();
  const { groupId } = useParams();
  const { pathname } = useLocation();
  const basePath = pathname.startsWith("/requests") ? "/requests" : "/join-requests";
  const [activeTab, setActiveTab] = useState<Tab>(pathname.startsWith("/my-requests") ? "outgoing" : "incoming");
  const [workingId, setWorkingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["join-requests", "unified"],
    queryFn: fetchUnifiedRequests,
  });

  const { mutate: processRequest } = useMutation({
    mutationFn: ({ groupId, requestId, status }: { groupId: string; requestId: string; status: "approved" | "rejected" }) =>
      processJoinRequest(groupId, requestId, status),
    onMutate: ({ requestId }) => setWorkingId(requestId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", "unified"] });
      toast.success(variables.status === "approved" ? "Request accepted. They are in the group now." : "Request declined.");
    },
    onError: (err: any) => {
      // apiClient puts the server's body on the error itself ({ error } or { message })
      toast.error(err?.error || err?.message || "Couldn't answer the request. Try again.");
    },
    onSettled: () => setWorkingId(null),
  });

  const { incoming, history, outgoing, groupName } = useMemo(() => {
    const forGroup = (list: JoinRequest[]) => (groupId ? list.filter((r) => r.group_id === groupId) : list);
    const allIncoming = forGroup(data?.incoming || []);
    return {
      incoming: allIncoming.filter((r) => r.status === "pending"),
      history: allIncoming.filter((r) => r.status !== "pending"),
      outgoing: forGroup(data?.outgoing || []),
      groupName: groupId ? allIncoming[0]?.group?.name || "" : "",
    };
  }, [data, groupId]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "incoming", label: "To answer", count: incoming.length },
    { id: "history", label: "Answered" },
    { id: "outgoing", label: "Sent by me" },
  ];

  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      <div className="border-b border-border bg-card px-4 py-5 sm:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {groupId
            ? `Join requests for ${groupName || "this group chat"}.`
            : "People who ask to join the group chats you run, and the join requests you sent."}
        </p>
        {groupId && (
          <Link to={basePath} className="mt-2 inline-block text-sm text-foreground underline underline-offset-2">
            Show all requests
          </Link>
        )}
      </div>

      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm transition-colors ${
                activeTab === t.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {!!t.count && (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40 max-w-full" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          // A failed load must not look like "nothing to answer"
          <div className="rounded-xl border border-border bg-card px-4 py-14 text-center">
            <p className="text-sm font-medium text-foreground">Couldn't load the requests</p>
            <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {isFetching ? <Spinner className="h-4 w-4" /> : null}
              Try again
            </button>
          </div>
        ) : activeTab === "incoming" ? (
          <div className="space-y-3">
            {incoming.length === 0 ? (
              <Empty icon={Inbox} title="Nothing to answer" text="No one is waiting to join a group chat you run." />
            ) : (
              incoming.map((req) => {
                const busy = workingId === req.id;
                return (
                  <PersonRow key={req.id} req={req}>
                    <button
                      type="button"
                      onClick={() => processRequest({ groupId: req.group_id, requestId: req.id, status: "approved" })}
                      disabled={!!workingId}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
                    >
                      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />} Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => processRequest({ groupId: req.group_id, requestId: req.id, status: "rejected" })}
                      disabled={!!workingId}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-500/10 px-3.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
                    >
                      <X className="h-4 w-4" /> Decline
                    </button>
                  </PersonRow>
                );
              })
            )}
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-3">
            {history.length === 0 ? (
              <Empty icon={Inbox} title="No answered requests" text="Requests you accept or decline show here." />
            ) : (
              history.map((req) => (
                <PersonRow key={req.id} req={req} faded>
                  <StatusChip status={req.status} />
                </PersonRow>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {outgoing.length === 0 ? (
              <Empty icon={Users} title="No requests sent" text="You haven't asked to join a group chat." />
            ) : (
              outgoing.map((req) => (
                <div key={req.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
                      {req.group?.avatar_url ? (
                        <img src={req.group.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Users className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{req.group?.name || "A group chat that was deleted"}</p>
                      <p className="text-xs text-muted-foreground">Sent on {day(req.created_at)}</p>
                    </div>
                  </div>
                  <div className="self-start sm:self-center">
                    <StatusChip status={req.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
