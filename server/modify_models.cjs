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
const path = require('path');

const dir = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/server/src';

const header = `// MODEL STATUS:
// - Cloudflare Workers AI = ACTIVE (now in use)
// - Gemini 3.5 Flash = COMMENTED OUT (disabled)
// - Groq model = DEAD (removed from use)
`;

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // 1. Comment out model name lines for Groq, Llama, Gemini, Mistral
  // Look for: model: 'some-model' or model: "some-model"
  // It might already be commented out, so check if it's not.
  
  // Regex to match active model lines that are NOT deepseek or voyage
  // e.g. model: "gemini-3.5-flash", model: "llama3-70b-8192", model: "open-mistral-nemo", model: "mistral-large-latest"
  const regex = /^\s*model\s*:\s*['"](gemini-.*?|llama.*?|open-mistral.*?|mistral.*?|mixtral.*?|gemma.*?)['"]\s*,?\s*$/gm;
  
  content = content.replace(regex, (match) => {
    // If it's already commented, it won't match the start of line due to ^\s* if there's /* or //
    // But wait, what if it's in a single line object? ` { model: "gemini..." } ` 
    return match; // We'll handle single-line and multi-line below
  });
  
  // A safer regex: 
  // match `model: "..."` or `model: '...'` where the name is one of the targets
  // and it is NOT preceded by `/* ` and NOT followed by ` */`
  const modelValueRegex = /(?<!\/\*\s*)(model\s*:\s*['"](gemini-.*?|llama.*?|open-mistral.*?|mistral.*?|mixtral.*?|gemma.*?)['"])(?!\s*\*\/)/g;
  
  content = content.replace(modelValueRegex, (match, p1) => {
    return `/* ${p1} */`;
  });

  // 2. Add header if not present
  // We only add header if the file seems to deal with AI (has 'model:' or 'groq' or 'gemini') to avoid polluting 100s of files.
  // Actually, the user said "At the very top of each file". I will add it to ALL .js files in src.
  if (!content.startsWith('// MODEL STATUS:')) {
    content = header + content;
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

processDir(dir);
console.log('Done.');
