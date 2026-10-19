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
const tests = [
  "policy\n\n,\n\ntutorial", // What I tested
  "policy  \n,\n  tutorial", // Markdown line breaks
  "policy<br>,<br>tutorial", // HTML breaks
  "policy\n\n\n,\n\n\ntutorial", // Triple breaks
  "policy\r\n\r\n,\r\n\r\ntutorial", // Windows breaks
];

for (const content of tests) {
    let text = content
      .replace(/^[•]\s/gm, '- ')
      .replace(/^\s{4}[◦]\s/gm, '    - ')
      .replace(/(^[ \t]*[-*][ \t].*)\n{2,}(?=[ \t]*[-*][ \t])/gm, '$1\n'); 

    const parts = text.split(/(```[\s\S]*?```)/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { 
        parts[i] = parts[i]
          .replace(/\n+\s*,\s*\n+/g, ', ')
          .replace(/([a-zA-Z0-9])\n+\s*,/g, '$1,')
          .replace(/,\n+\s*([a-zA-Z0-9])/g, ', $1')
          .replace(/\(\n+\s*/g, '(')
          .replace(/\s*\n+\)/g, ')')
          .replace(/<br\s*\/?>/gi, ' '); // New test
      }
    }
    console.log(JSON.stringify(content));
    console.log("->", JSON.stringify(parts.join('')));
    console.log("-------------------");
}
