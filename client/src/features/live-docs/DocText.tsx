// A live doc's formatted text, drawn the way the chat draws an answer (owner, 2026-11-16: "support markdown
// formatting using our regular inline, etc."): the same inline code, tables, code blocks, notes and maths, so a
// doc reads like the chat it came from. A comment is drawn the way a person's own message is in the chat.
import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkGithubAlerts from "remark-github-alerts";
import rehypeKatex from "rehype-katex";
import { MarkdownComponents, USER_MD_COMPONENTS } from "@/components/ai/components/AskAiPanel";

const remarkPlugins = [remarkMath, remarkGfm, remarkGithubAlerts];
const rehypePlugins = [rehypeKatex];

/** The doc's own text. */
export const DocMarkdown = memo(function DocMarkdown({ text }: { text: string }) {
  return (
    <article className="prose dark:prose-invert max-w-none break-words prose-headings:font-semibold prose-img:rounded-xl prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={MarkdownComponents}>
        {text || "*This doc is empty.*"}
      </ReactMarkdown>
    </article>
  );
});

/** A comment or a reply (every line break the person typed stays a line break). */
export const NoteText = memo(function NoteText({ text }: { text: string }) {
  return (
    <div className="break-words text-[14px] leading-5 text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={USER_MD_COMPONENTS} skipHtml>{String(text || "").replace(/\n/g, "  \n")}</ReactMarkdown>
    </div>
  );
});
