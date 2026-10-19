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

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.git')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (dirFile.endsWith('.js') || dirFile.endsWith('.ts')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
};

const files = walkSync('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace Groq initialization
  content = content.replace(
    /new Groq\(\{\s*apiKey:\s*process\.env\.GROQ_API_KEY[^}]*\}\)/g,
    `new Groq({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: \`https://api.cloudflare.com/client/v4/accounts/\${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1\` })`
  );

  // Replace OpenAI initialization
  content = content.replace(
    /new OpenAI\(\{\s*apiKey:\s*process\.env\.OPENAI_API_KEY[^}]*\}\)/g,
    `new OpenAI({ apiKey: process.env.CLOUDFLARE_WORKERS_AI_TOKEN, baseURL: \`https://api.cloudflare.com/client/v4/accounts/\${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/v1\` })`
  );

  // Replace model strings (Groq models)
  content = content.replace(/'llama-3\.3-70b-versatile'/g, "'@cf/meta/llama-3.1-8b-instruct'");
  content = content.replace(/"llama-3\.3-70b-versatile"/g, "'@cf/meta/llama-3.1-8b-instruct'");
  
  content = content.replace(/'llama3-8b-8192'/g, "'@cf/meta/llama-3.1-8b-instruct'");
  content = content.replace(/"llama3-8b-8192"/g, "'@cf/meta/llama-3.1-8b-instruct'");

  // Replace OpenAI models
  content = content.replace(/'gpt-4o-mini'/g, "'@cf/meta/llama-3.1-8b-instruct'");
  content = content.replace(/"gpt-4o-mini"/g, "'@cf/meta/llama-3.1-8b-instruct'");

  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
    changedCount++;
  }
});
console.log('Total files changed:', changedCount);
