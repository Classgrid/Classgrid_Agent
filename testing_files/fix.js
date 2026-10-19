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
const fs = require('fs');
const path = 'client/src/components/ai/components/AskAiPanel.tsx';
let text = fs.readFileSync(path, 'utf8');
const searchStr = `            // Build line-numbered HTML\n            const highlightedLines = highlighted.split("\\n");\n            const lineRows = highlightedLines.map((line, i) =>\n              \`<div class="flex w-max min-w-full"><span class="sticky left-0 z-10 shrink-0 w-14 pr-4 text-right select-none text-slate-400 bg-[#fafbfc] border-r border-slate-200 dark:text-zinc-600 dark:bg-[#111113] dark:border-white/5">${i + 1}</span><span class="px-4 whitespace-pre">${line || " "}</span></div>\`\n            ).join("");\n            const finalHtml = \`<pre class="text-[13px] py-4 !m-0 flex flex-col"><code class="font-mono hljs">${lineRows}</code></pre>\`;`;
const replaceStr = `            // Build line-numbered HTML (COMMENTED OUT FOR AI CHAT UI)\n            /*\n            const highlightedLines = highlighted.split("\\n");\n            const lineRows = highlightedLines.map((line, i) =>\n              \\\`<div class="flex w-max min-w-full"><span class="sticky left-0 z-10 shrink-0 w-14 pr-4 text-right select-none text-slate-400 bg-[#fafbfc] border-r border-slate-200 dark:text-zinc-600 dark:bg-[#111113] dark:border-white/5">\${i + 1}</span><span class="px-4 whitespace-pre">\${line || " "}</span></div>\\\`\n            ).join("");\n            */\n            const finalHtml = \`<pre class="text-[13px] py-4 px-4 !m-0 flex flex-col"><code class="font-mono hljs">\${highlighted}</code></pre>\`;`;
text = text.replace(searchStr, replaceStr);
fs.writeFileSync(path, text);
console.log("Success");
