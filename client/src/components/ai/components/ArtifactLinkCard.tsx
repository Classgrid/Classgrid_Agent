// A link in the AI's answer to a published page (chat.classgrid.in/p/<id>) whose page is a video the AI made
// (kind "video") shows as the artifact card: a square tile with the video's first picture on the left, "Title · 45s"
// and the word "Docs" under it. Clicking it opens the video's viewer inside the app (the /p/<id> page over the
// chat; its X goes back to the chat). A page of kind "page", one not read yet that is not known to be a video, and
// one that can't be read stay the link they are today, so ordinary page links look as before. Built only from <span>s and an <img>, because
// a link sits inside a paragraph or list item.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Play } from "lucide-react";
import { lengthText, useArtifact } from "@/features/live-docs/pageArtifacts";

const textOf = (node: React.ReactNode): string =>
  typeof node === "string" ? node : Array.isArray(node) ? node.map(textOf).join("") : React.isValidElement(node) ? textOf((node.props as any)?.children) : "";

const SHELL = "my-2 flex w-full max-w-[560px] items-center gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 pr-4 align-top dark:border-[#2f2f2f] dark:bg-[#1c1c1c]";
const TILE = "relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl";

/** While the page is read: the card's shape with nothing in it yet. */
function LoadingCard() {
  return (
    <span className={SHELL} aria-busy="true">
      <span className={`${TILE} animate-pulse bg-slate-100 dark:bg-[#262626]`} />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="block h-3.5 w-2/5 animate-pulse rounded bg-slate-100 dark:bg-[#262626]" />
        <span className="block h-3 w-1/5 animate-pulse rounded bg-slate-100 dark:bg-[#262626]" />
      </span>
    </span>
  );
}

function VideoArtifactCard({ id, href, title, poster, seconds }: { id: string; href: string; title: string; poster: string; seconds: number }) {
  const navigate = useNavigate();
  const [noPoster, setNoPoster] = useState(false);
  const length = lengthText(seconds);
  // (a plain click opens the viewer in the app, with the chat left in the history; a click with Ctrl, Cmd, Shift or
  // the middle button still opens the link the browser's own way)
  const open = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(`/p/${id}`);
  };
  return (
    <a
      href={href}
      onClick={open}
      title={title}
      className={`${SHELL} group no-underline transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 dark:hover:bg-[#232323]`}
    >
      <span className={`${TILE} bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300`}>
        {poster && !noPoster
          ? <img src={poster} alt="" loading="lazy" onError={() => setNoPoster(true)} className="block size-full object-cover" />
          : <Copy className="size-6" strokeWidth={1.7} />}
        {poster && !noPoster && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
            <Play className="size-5 fill-white text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 text-[16px] leading-6 text-slate-900 dark:text-[#F0EFED]">
          <span className="truncate">{title}</span>
          {length && <span className="shrink-0 whitespace-pre">{` · ${length}`}</span>}
        </span>
        <span className="mt-0.5 text-[13px] leading-[18px] text-slate-500 dark:text-[#9a9a9a]">Docs</span>
      </span>
    </a>
  );
}

/**
 * The card for a /p/<id> link: the video card when the page is a video, and `fallback` (the link as it is shown
 * today) for a page, for a page not read yet, or when the page can't be read. Only a page known to be a video (this
 * answer's own make_video step made it: `videoStep`, or it was read as one before) shows the empty card while it
 * loads, so the card is there from the first frame.
 */
export function ArtifactLinkCard({ id, href, label, fallback, videoStep }: { id: string; href: string; label: React.ReactNode; fallback: React.ReactNode; videoStep?: string }) {
  const entry = useArtifact(id, videoStep);
  const info = entry?.info;
  if (info === undefined) return videoStep || entry?.video ? <LoadingCard /> : <>{fallback}</>;
  if (!info || info.kind !== "video") return <>{fallback}</>;
  const words = textOf(label).trim();
  const title = info.title.trim() || (words && !/^https?:\/\//i.test(words) && !words.startsWith("/p/") ? words : "Video");
  return <VideoArtifactCard id={id} href={href} title={title} poster={info.video?.poster || ""} seconds={info.video?.seconds || 0} />;
}
