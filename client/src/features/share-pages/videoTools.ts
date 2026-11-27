// The parts of a video artifact that are not on the screen: saving its MP4, and the message that asks Classgrid AI
// to answer a comment on it (the video's own words for what commentAsk in live-docs/docContext.ts does for a page).
import { fileName, saveFile } from "@/features/live-docs/shareApi";
import { formatSpan } from "./videoMath";
import type { VideoArea } from "./pagesApi";

/**
 * Saves the video's MP4 under the video's title. The file is fetched and saved as a file; if the video's server
 * does not let the page fetch it, the browser is sent to the file itself (it saves or plays it there).
 */
export async function downloadVideo(url: string, title: string) {
  const name = `${fileName(title, "video")}.mp4`;
  try {
    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) throw new Error(String(res.status));
    saveFile(await res.blob(), name, "video/mp4");
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const cleanTitle = (title: string) => title.replace(/["\r\n]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200) || "Untitled";

/** Where on the frame a comment is, in words for the AI. */
function areaWords(area: VideoArea | null | undefined) {
  if (!area) return "";
  if (area.w < 0.01 || area.h < 0.01) return `, at the point ${pct(area.x)} from the left and ${pct(area.y)} from the top of the frame`;
  return `, in the box ${pct(area.x)} from the left, ${pct(area.y)} from the top, ${pct(area.w)} wide and ${pct(area.h)} high`;
}

/** The message that asks the AI to answer one comment on a video. */
export const videoCommentAsk = (
  video: { id: string; title: string },
  comment: { id: string; text: string; time: number; timeEnd: number | null; area: VideoArea | null },
) => [
  `Answer my comment on the video "${cleanTitle(video.title)}" (https://chat.classgrid.in/p/${video.id}), comment_id ${comment.id}.`,
  `It is about ${formatSpan(comment.time, comment.timeEnd)} of the video${areaWords(comment.area)}.`,
  `My comment: ${comment.text}`,
  `Make the change if I asked for one (make the video again with make_video and artifactId ${video.id}, so it stays at the same link), then reply under the comment with page_comments.`,
].join("\n");
