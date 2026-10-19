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
const content = `policy\n\n,\n\ntutorial\n\n,\n\nfaq\n\n,\n\nnotes\n\n, and\n\narticle`;

let text = content
          .replace(/(?:\r?\n)+\s*,\s*(?:\r?\n)+/g, ', ')
          .replace(/(\S)(?:\r?\n)+\s*,/g, '$1,')
          .replace(/,\s*(?:\r?\n)+\s*(\S)/g, ', $1');

console.log(JSON.stringify(text));
