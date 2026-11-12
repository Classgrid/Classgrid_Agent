// A code block in the AI's answer, coloured with Shiki (VS Code's grammars and themes), the same as the Files tab.
// While the answer is still being typed, or until Shiki has loaded, the code shows plain; the colours come in place.
import React, { useEffect, useState } from "react";
import { CodeBlockClient } from "./CodeBlockClient";
import { escapeHtml, shikiLangForFence, shikiLines, shikiTheme } from "@/lib/shikiCode";

const PRE = 'class="text-[13px] py-4 px-4 !m-0 flex flex-col"';
const plainHtml = (code: string) => `<pre ${PRE}><code class="font-mono">${escapeHtml(code)}</code></pre>`;

export function CodeBlockShiki({ rawCode, language = "javascript", isTyping = false }: { rawCode: string; language?: string; isTyping?: boolean }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    if (isTyping || !rawCode.trim()) { setHtml(null); return; }
    let gone = false;
    const theme = shikiTheme();
    shikiLangForFence(language)
      .then((lang) => shikiLines(rawCode, lang, theme))
      .then(({ style, lines }) => {
        if (gone) return;
        // (the theme's text colour stays; its background is the block's own, like the Files tab)
        const colour = (style.match(/color:\s*([^;]+)/) || [])[1];
        setHtml(`<pre ${PRE}${colour ? ` style="color:${colour}"` : ""}><code class="font-mono">${lines.join("\n")}</code></pre>`);
      })
      .catch(() => { if (!gone) setHtml(null); });
    return () => { gone = true; };
  }, [rawCode, language, isTyping]);
  return <CodeBlockClient language={language} rawCode={rawCode} html={html ?? plainHtml(rawCode)} />;
}
