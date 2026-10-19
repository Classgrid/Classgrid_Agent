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

const previewPath = path.join('client', 'src', 'components', 'ai', 'components', 'FilePreviewModal.tsx');
let previewContent = fs.readFileSync(previewPath, 'utf8');

// Replace the PDF iframe src
previewContent = previewContent.replace(
  /\{isPDF\(mime\) && srcUrl && \(\s*<iframe\s*src=\{srcUrl\}\s*title=\{file\.name\}\s*className="w-full max-w-4xl h-\[80vh\] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white"\s*\/>\s*\)\}/m,
  \{isPDF(mime) && srcUrl && (
              <iframe
                src={srcUrl.startsWith("blob:") ? srcUrl : \\\https://docs.google.com/viewer?url=\\\&embedded=true\\\}
                title={file.name}
                className="w-full max-w-4xl h-[80vh] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white"
              />
            )}\
);

fs.writeFileSync(previewPath, previewContent);

const reviewsPath = path.join('client', 'src', 'features', 'superadmin', 'pages', 'AgentReviewsPage.tsx');
let reviewsContent = fs.readFileSync(reviewsPath, 'utf8');

reviewsContent = reviewsContent.replace(
  /className="p-0 h-auto text-blue-600 hover:text-blue-800 flex items-center"/g,
  'className="p-0 h-auto text-blue-600 hover:text-blue-800 flex items-center cursor-pointer"'
);

fs.writeFileSync(reviewsPath, reviewsContent);
console.log('Successfully applied fixes');
