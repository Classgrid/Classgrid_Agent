// A code block in the AI's answer, coloured with Shiki (VS Code's grammars and themes), the same as the Files tab.
// While the answer is still being typed, or until Shiki has loaded, the code shows plain; the colours come in place.
import React, { useEffect, useState } from "react";
import { CodeBlockClient } from "./CodeBlockClient";
import { escapeHtml, shikiLangForFence, shikiLines } from "@/lib/shikiCode";
import { useShikiTheme } from "@/lib/useShikiTheme";

const PRE = 'class="text-[13px] py-4 px-4 !m-0 flex flex-col"';
const plainHtml = (code: string) => `<pre ${PRE}><code class="font-mono">${escapeHtml(code)}</code></pre>`;

export function CodeBlockShiki({ rawCode, language = "javascript", isTyping = false }: { rawCode: string; language?: string; isTyping?: boolean }) {
  const [html, setHtml] = useState<string | null>(null);
  const theme = useShikiTheme(); // (coloured again when light / dark mode switches)
  useEffect(() => {
    if (isTyping || !rawCode.trim()) { setHtml(null); return; }
    let gone = false;
    let plain = false;
    shikiLangForFence(language)
      .then((lang) => { plain = lang === "text"; return shikiLines(rawCode, lang, theme); })
      .then(({ style, lines }) => {
        if (gone) return;
        // (the theme's text colour stays; its background is the block's own, like the Files tab). The style reads
        // "background-color:#1E1E1E;color:#D4D4D4": only the colour that stands on its own is the text colour
        // (owner, 2026-11-26: a TEXT block was near-invisible, its words had taken the background colour).
        // A plain TEXT block in dark mode is gold, as Classgrid Code shows it (VS Code's preformatted-text colour)
        // (owner, 2026-11-26: "show same" as Classgrid Code).
        const colour = plain && theme === "dark-plus" ? "#D7BA7D" : (style.match(/(?:^|;)\s*color:\s*([^;]+)/) || [])[1];
        setHtml(`<pre ${PRE}${colour ? ` style="color:${colour}"` : ""}><code class="font-mono">${lines.join("\n")}</code></pre>`);
      })
      .catch(() => { if (!gone) setHtml(null); });
    return () => { gone = true; };
  }, [rawCode, language, isTyping, theme]);
  return <CodeBlockClient language={language} rawCode={rawCode} html={html ?? plainHtml(rawCode)} />;
}
