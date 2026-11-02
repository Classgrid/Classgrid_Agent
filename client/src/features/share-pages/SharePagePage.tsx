// A page the AI published (chat.classgrid.in/p/:id): the page itself in a sandboxed frame, a Share menu and comments.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { Check, Globe, Link2, Lock, MessageSquare, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { apiClient } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { PageCommentsPanel, type PageComment } from "./PageCommentsPanel";
import { readBridgeRequest, withBridge } from "./bridge";

type Visibility = "private" | "link";
type PageData = {
  page: { id: string; title: string; html: string; visibility: Visibility; versions: number; owner: { name: string; email: string }; createdAt: string; updatedAt: string };
  isOwner: boolean;
  link: string;
  comments: PageComment[];
};

const pageKey = (id: string) => ["share-page", id];
const MAX_PENDING = 20;

function ShareMenu({ data, onVisibility }: { data: PageData; onVisibility: (v: Visibility) => Promise<void> }) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState<Visibility | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  const choose = async (v: Visibility) => {
    if (v === data.page.visibility || saving) return;
    setSaving(v);
    try { await onVisibility(v); } finally { setSaving(null); }
  };

  const options: { v: Visibility; icon: React.ReactNode; title: string; sub: string }[] = [
    { v: "private", icon: <Lock className="h-4 w-4" />, title: "Only you", sub: "Nobody else can open this page." },
    { v: "link", icon: <Globe className="h-4 w-4" />, title: "Anyone with the link", sub: "People signed in to Classgrid can view and comment." },
  ];

  return (
    <div className="flex flex-col gap-2.5 p-1">
      <div className="text-sm font-semibold text-foreground">Share this page</div>
      {data.isOwner ? (
        <div className="flex flex-col gap-1">
          {options.map((o) => (
            <button
              key={o.v}
              type="button"
              onClick={() => choose(o.v)}
              className={cn("flex items-start gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-muted transition-colors cursor-pointer", data.page.visibility === o.v && "bg-muted")}
            >
              <span className="mt-0.5 text-muted-foreground">{o.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-foreground">{o.title}</span>
                <span className="block text-[11px] text-muted-foreground">{o.sub}</span>
              </span>
              {saving === o.v ? <Spinner className="size-4 shrink-0" /> : data.page.visibility === o.v && <Check className="h-4 w-4 shrink-0 text-foreground" />}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Anyone signed in to Classgrid with this link can view and comment.</p>
      )}
      {data.isOwner && data.page.visibility === "private" && (
        <p className="text-[11px] text-muted-foreground">Choose "Anyone with the link" before you send the link to others.</p>
      )}
      <Button variant="outline" className="justify-start h-10 font-medium" onClick={copy}>
        {copied ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
        {copied ? "Link copied" : "Copy link"}
      </Button>
    </div>
  );
}

export function SharePagePage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const pending = useRef(0);

  // Signed out: log in, then come back here
  useEffect(() => {
    if (!userLoading && !user) navigate(`/login?next=${encodeURIComponent(`/p/${id}`)}`, { replace: true });
  }, [userLoading, user, id, navigate]);

  const query = useQuery<PageData>({
    queryKey: pageKey(id),
    queryFn: async () => (await apiClient.get<PageData>(`/api/pages/${id}`)).data,
    enabled: !!user && !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const data = query.data;

  useEffect(() => {
    if (data?.page.title) document.title = `${data.page.title} · Classgrid`;
  }, [data?.page.title]);

  const srcDoc = useMemo(() => (data?.page.html ? withBridge(data.page.html) : ""), [data?.page.html]);

  // The page's data requests (window.classgrid.data): checked here, then sent to the API
  useEffect(() => {
    if (!id) return;
    const onMessage = async (e: MessageEvent) => {
      const frame = frameRef.current?.contentWindow;
      if (!frame || e.source !== frame) return;
      const checked = readBridgeRequest(e.data);
      if (!checked) return;
      const reqId = (e.data as { id: number }).id;
      const reply = (msg: { ok: boolean; value?: unknown; error?: string }) => frame.postMessage({ __cg: "res", id: reqId, ...msg }, "*");
      if (checked.error || !checked.req) return reply({ ok: false, error: checked.error });
      if (pending.current >= MAX_PENDING) return reply({ ok: false, error: "Too many requests at once. Try again." });
      const r = checked.req;
      pending.current += 1;
      try {
        if (r.op === "list") {
          const res = await apiClient.get<{ data: Record<string, unknown> }>(`/api/pages/${id}/data`);
          reply({ ok: true, value: res.data.data });
        } else if (r.op === "get") {
          const res = await apiClient.get<{ value: unknown }>(`/api/pages/${id}/data/${r.key}`);
          reply({ ok: true, value: res.data.value });
        } else {
          await apiClient.put(`/api/pages/${id}/data/${r.key}`, { value: r.value === undefined ? null : r.value });
          reply({ ok: true, value: true });
        }
      } catch (err: any) {
        reply({ ok: false, error: err?.message || "Could not save." });
      } finally {
        pending.current -= 1;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id]);

  const setVisibility = async (visibility: Visibility) => {
    try {
      await apiClient.patch(`/api/pages/${id}`, { visibility });
      queryClient.setQueryData<PageData>(pageKey(id), (old) => (old ? { ...old, page: { ...old.page, visibility } } : old));
      toast.success(visibility === "link" ? "Anyone with the link can now open this page." : "Only you can open this page now.");
    } catch (err: any) {
      toast.error(err?.message || "Could not change who can see this page.");
    }
  };

  const openComments = (data?.comments || []).filter((c) => !c.resolved && !c.replyTo).length;
  const errorMessage = (query.error as any)?.message;

  if (userLoading || !user || (query.isLoading && !data)) {
    return (
      <div className="h-[100dvh] w-full bg-background flex flex-col" aria-busy="true">
        <div className="h-14 shrink-0 border-b border-border/50 flex items-center gap-3 px-4">
          <Skeleton className="h-7 w-7 rounded-lg" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex-1 p-6 flex flex-col gap-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[100dvh] w-full bg-background text-foreground flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col items-center text-center gap-4">
          <img src="/logos/logo.png" alt="Classgrid" className="h-10 w-10 rounded-lg" />
          <h1 className="text-lg font-semibold">This page can't be opened</h1>
          <p className="text-sm text-muted-foreground">{errorMessage || "It may have been deleted, or the owner hasn't shared it with you."}</p>
          <Button variant="secondary" className="w-full" onClick={() => navigate("/agent")}>Go to Classgrid AI</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-background text-foreground flex flex-col overflow-hidden">
      <header className="h-14 shrink-0 border-b border-border/50 flex items-center gap-3 px-3 sm:px-4">
        <a href="/agent" className="shrink-0" title="Classgrid AI" aria-label="Classgrid AI">
          <img src="/logos/logo.png" alt="" className="h-7 w-7 rounded-lg" />
        </a>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{data.page.title}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {data.isOwner ? (data.page.visibility === "link" ? "Shared by link" : "Only you") : `By ${data.page.owner.name || data.page.owner.email}`}
            {data.page.versions > 1 && ` · Version ${data.page.versions}`}
          </div>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 font-medium">
              <Share2 className="h-4 w-4 sm:mr-2" />
              <span className="max-sm:hidden">Share</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <ShareMenu data={data} onVisibility={setVisibility} />
          </PopoverContent>
        </Popover>
        <Button variant={commentsOpen ? "secondary" : "outline"} size="sm" className="h-9 px-3 font-medium" onClick={() => setCommentsOpen((o) => !o)} aria-pressed={commentsOpen}>
          <MessageSquare className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Comments</span>
          {openComments > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{openComments}</span>}
        </Button>
      </header>

      <div className="flex-1 min-h-0 flex">
        <iframe
          ref={frameRef}
          title={data.page.title}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-forms allow-popups allow-modals"
          className="flex-1 min-w-0 h-full border-0 bg-white"
        />
        <AnimatePresence>
          {commentsOpen && (
            <PageCommentsPanel
              pageId={id}
              comments={data.comments}
              isOwner={data.isOwner}
              myId={String((user as any)?._id || "")}
              onChanged={() => queryClient.invalidateQueries({ queryKey: pageKey(id) })}
              onClose={() => setCommentsOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
