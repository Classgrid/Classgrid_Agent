// Share Grid invite page (/grid/join/:token): see who invited you, then join the chat or decline.
// Signed-out visitors log in first; the invite is remembered and opened again after login (useResumeGridInvite).
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { apiClient } from "@/lib/apiClient";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { getLoginPathForPath } from "@/features/auth/auth-helpers";

const PENDING_KEY = "cg_grid_invite";
const JOIN_PATH = /^\/grid\/join\/[A-Za-z0-9_-]{8,64}$/;

type InviteInfo = { sessionId: string; title: string; owner?: { name: string; avatar?: string }; people: number; maxPeople: number; already: boolean; used: boolean };

const chatPath = (sessionId: string, role?: string) =>
  role === "super_admin" || window.location.hostname.startsWith("superadmin.") ? `/superadmin/agent/${sessionId}` : `/agent/${sessionId}`;

/** After login the app lands on the chat page: open a remembered invite from there. */
export function useResumeGridInvite() {
  const navigate = useNavigate();
  useEffect(() => {
    try {
      const path = localStorage.getItem(PENDING_KEY);
      if (!path) return;
      localStorage.removeItem(PENDING_KEY);
      if (JOIN_PATH.test(path)) navigate(path, { replace: true });
    } catch { /* storage blocked */ }
  }, [navigate]);
}

export function GridJoinPage() {
  const { token = "" } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [busy, setBusy] = useState<"join" | "decline" | null>(null);
  const [declined, setDeclined] = useState(false);

  const invite = useQuery<InviteInfo>({
    queryKey: ["grid-invite", token],
    queryFn: async () => (await apiClient.get<InviteInfo>(`/api/ai/grid/join/${token}`)).data,
    enabled: !!user && !!token,
    retry: false,
  });

  const logIn = () => {
    try { localStorage.setItem(PENDING_KEY, `/grid/join/${token}`); } catch { /* storage blocked */ }
    navigate(getLoginPathForPath(`/grid/join/${token}`));
  };

  const join = async () => {
    setBusy("join");
    try {
      const { data } = await apiClient.post<{ sessionId: string }>(`/api/ai/grid/join/${token}`);
      navigate(chatPath(data.sessionId, (user as any)?.role), { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Could not join this chat.");
      setBusy(null);
    }
  };

  const decline = async () => {
    setBusy("decline");
    try {
      await apiClient.post(`/api/ai/grid/join/${token}/decline`);
      setDeclined(true);
    } catch (err: any) {
      toast.error(err?.message || "Could not decline.");
    } finally {
      setBusy(null);
    }
  };

  const info = invite.data;
  const errorMessage = (invite.error as any)?.message;
  const full = info ? info.people >= info.maxPeople && !info.already : false;

  return (
    <div className="min-h-[100dvh] w-full bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center text-center gap-4">
        <img src="/logos/logo.png" alt="Classgrid" className="h-10 w-10 rounded-lg" />

        {userLoading || (user && invite.isLoading) ? (
          <div className="w-full flex flex-col items-center gap-4" aria-busy="true">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ) : !user ? (
          <>
            <h1 className="text-lg font-semibold">You're invited to a Classgrid AI chat</h1>
            <p className="text-sm text-muted-foreground">Log in to see the invite and join the chat.</p>
            <Button variant="secondary" className="w-full" onClick={logIn}>Log in to join</Button>
          </>
        ) : errorMessage || !info ? (
          <>
            <h1 className="text-lg font-semibold">This invite can't be opened</h1>
            <p className="text-sm text-muted-foreground">{errorMessage || "This invite is no longer active."}</p>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/agent")}>Go to Classgrid AI</Button>
          </>
        ) : declined ? (
          <>
            <h1 className="text-lg font-semibold">Invite declined</h1>
            <p className="text-sm text-muted-foreground">You won't be added to this chat.</p>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/agent")}>Go to Classgrid AI</Button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">
              {info.owner?.name || "Someone"} invited you to a chat
            </h1>
            <div className="w-full rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-left">
              <div className="text-sm font-medium truncate">{info.title}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Users className="h-3.5 w-3.5" />
                {info.people} of {info.maxPeople} people
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Everyone in the chat sees all its messages, and the AI knows who sent each one. Your messages use your own AI credits.
            </p>
            {info.already ? (
              <Button variant="secondary" className="w-full" onClick={() => navigate(chatPath(info.sessionId, (user as any)?.role), { replace: true })}>Open chat</Button>
            ) : info.used ? (
              <p className="text-sm text-muted-foreground">This invite was already used.</p>
            ) : full ? (
              <p className="text-sm text-muted-foreground">This chat already has {info.maxPeople} people.</p>
            ) : (
              <div className="w-full flex flex-col gap-2">
                <Button variant="secondary" className="w-full" disabled={!!busy} onClick={join}>
                  {busy === "join" && <Spinner className="size-4 mr-2" />}
                  Join chat
                </Button>
                <Button variant="outline" className="w-full" disabled={!!busy} onClick={decline}>
                  {busy === "decline" && <Spinner className="size-4 mr-2" />}
                  Decline
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
