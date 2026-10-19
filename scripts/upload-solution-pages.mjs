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
/**
 * upload-solution-pages.mjs  (v2 — Clean + Publish)
 * ─────────────────────────────────────────────────────────────────────────────
 * STEP 1: Delete ALL old solutionPage and institutionPage entries that are NOT
 *         the 8 canonical slugs.
 * STEP 2: Upload all 8 MDX files as solutionPage documents with full HTML body
 *         and PUBLISH each immediately.
 *
 * Usage:
 *   node upload-solution-pages.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient }  from "@sanity/client";
import TurndownService from "turndown";
import turndownPluginGfm from "turndown-plugin-gfm";

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
});
turndownService.use(turndownPluginGfm.gfm);


const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Sanity credentials ────────────────────────────────────────────────────────
const PROJECT_ID = "a4wk6kp5";
const DATASET    = "production";
const TOKEN      = "skl5fXWCsJGBUGFDt0UAafjCrBHRvIBcvKu8AE3e9oE54n2Cvkm9uhb7qwQLCZc4xyMhNaUVY60LoGjS9Jx5Xti2vP6DhIpeRXDvn0g8MRenQB4dboyWPSZsPIhuOEekG0qHAhXfcCt1ZBjSRqNXJE0S7R2ksWpi4whznisrNhvJlg4Ajk7M";

const sanity = createClient({
  projectId:  PROJECT_ID,
  dataset:    DATASET,
  apiVersion: "2024-01-01",
  token:      TOKEN,
  useCdn:     false,
});

const SOLUTIONS_DIR = path.join(__dirname, "solutions");

// ── The 8 canonical pages (for-institutes.mdx is EXCLUDED — legacy) ───────────
const FILES = [
  { file: "for-schools.mdx",      slug: "for-schools",      category: "industry" },
  { file: "for-colleges.mdx",     slug: "for-colleges",     category: "industry" },
  { file: "for-jr-colleges.mdx",  slug: "for-jr-colleges",  category: "industry" },
  { file: "for-coaching.mdx",     slug: "for-coaching",     category: "industry" },
  { file: "for-engineering.mdx",  slug: "for-engineering",  category: "industry" },
  { file: "for-students.mdx",     slug: "for-students",     category: "role"     },
  { file: "for-teachers.mdx",     slug: "for-teachers",     category: "role"     },
  { file: "for-admins.mdx",       slug: "for-admins",       category: "role"     },
];

const CANONICAL_IDS = new Set(FILES.map(f => `solution-page-${f.slug}`));

// ── Parse YAML frontmatter ────────────────────────────────────────────────────
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const rawFm = match[1];
  const body  = match[2].trim();
  const fm    = {};
  let currentKey = null;

  for (const line of rawFm.split(/\r?\n/)) {
    if (/^\s+-\s+/.test(line)) {
      const val = line.replace(/^\s+-\s+/, "").trim();
      if (currentKey && Array.isArray(fm[currentKey])) fm[currentKey].push(val);
      continue;
    }
    const kv = line.match(/^(\w+):\s*"?(.*?)"?\s*$/);
    if (kv) {
      currentKey = kv[1].trim();
      const val  = kv[2].trim();
      fm[currentKey] = val === "" ? [] : val;
      continue;
    }
    const bareKey = line.match(/^(\w+):\s*$/);
    if (bareKey) {
      currentKey = bareKey[1].trim();
      fm[currentKey] = [];
    }
  }
  return { frontmatter: fm, body };
}

// ── Label + headline per slug ─────────────────────────────────────────────────
const META = {
  "for-schools":     { label: "For Schools",     headline: "The Operating System for Modern Schools" },
  "for-colleges":    { label: "For Colleges",    headline: "Campus-Wide Digital Operations for Colleges" },
  "for-jr-colleges": { label: "For Jr Colleges", headline: "Smart Operations for Junior Colleges" },
  "for-coaching":    { label: "For Coaching",    headline: "Grow Your Coaching Institute with Classgrid" },
  "for-engineering": { label: "For Engineering", headline: "End-to-End ERP for Engineering Institutes" },
  "for-students":    { label: "For Students",    headline: "Study Smarter with Classgrid" },
  "for-teachers":    { label: "For Teachers",    headline: "Teach Better, Automate the Rest" },
  "for-admins":      { label: "For Admins",      headline: "Full Operational Control for Administrators" },
};

// ── STEP 1: Delete old/duplicate entries ──────────────────────────────────────
async function deleteOldEntries() {
  console.log("\n🗑   STEP 1 — Deleting old / duplicate entries...\n");

  // Delete any solutionPage or institutionPage that is NOT in our canonical list
  const typesToClean = ["solutionPage", "institutionPage"];
  let deleted = 0;

  for (const docType of typesToClean) {
    const docs = await sanity.fetch(
      `*[_type == $type]{ _id, slug }`,
      { type: docType }
    );

    for (const doc of docs) {
      if (!CANONICAL_IDS.has(doc._id)) {
        try {
          await sanity.delete(doc._id);
          console.log(`  ✅ Deleted  [${docType}]  ${doc._id}`);
          deleted++;
        } catch (err) {
          console.log(`  ⚠️  Could not delete ${doc._id}: ${err.message}`);
        }
      } else {
        console.log(`  ⏭   Keeping [${docType}]  ${doc._id}`);
      }
    }
  }

  console.log(`\n  Done. Deleted ${deleted} old entries.\n`);
}

// ── STEP 2: Upload + Publish all 8 pages ─────────────────────────────────────
async function uploadPages() {
  console.log("📤  STEP 2 — Uploading 8 solution pages...\n");

  let ok = 0, fail = 0;

  for (const { file, slug, category } of FILES) {
    const fp = path.join(SOLUTIONS_DIR, file);
    if (!fs.existsSync(fp)) {
      console.warn(`  ⚠️  Not found, skipping: ${file}`);
      fail++;
      continue;
    }

    const raw = fs.readFileSync(fp, "utf-8");
    const { frontmatter: fm, body } = parseFrontmatter(raw);

    const meta     = META[slug] || { label: slug, headline: slug };
    const seoTitle = fm.seoTitle    || fm.title       || meta.label;
    const seoDesc  = fm.seoDescription || fm.description || "";

    // Extract subtitle from the first non-empty <p> in the body
    const pMatch  = body.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    const subtitle = pMatch
      ? pMatch[1].replace(/<[^>]+>/g, "").trim().slice(0, 300)
      : "";

    // ── FAQ Extraction ──────────────────────────────────────────────────────────
    const faqSplitRegex = /<h2[^>]*>Frequently Asked Questions<\/h2>/i;
    let mainBody = body;
    let faqSection = "";
    const splitMatch = body.match(faqSplitRegex);
    if (splitMatch) {
      mainBody = body.substring(0, splitMatch.index).trim();
      faqSection = body.substring(splitMatch.index + splitMatch[0].length).trim();
    }

    const faqs = [];
    if (faqSection) {
      const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi;
      let match;
      let lastIndex = 0;
      let currentQuestion = null;

      while ((match = h3Regex.exec(faqSection)) !== null) {
        if (currentQuestion) {
          const answerHtml = faqSection.substring(lastIndex, match.index).trim();
          faqs.push({
            _key: Math.random().toString(36).substring(2, 9),
            question: { _type: "localeString", en: currentQuestion },
            answer: { _type: "localeText", en: answerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() },
          });
        }
        currentQuestion = match[1].replace(/<[^>]+>/g, "").trim();
        lastIndex = h3Regex.lastIndex;
      }
      
      if (currentQuestion) {
        const answerHtml = faqSection.substring(lastIndex).trim();
        faqs.push({
          _key: Math.random().toString(36).substring(2, 9),
          question: { _type: "localeString", en: currentQuestion },
          answer: { _type: "localeText", en: answerHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() },
        });
      }
    }

    const docId = `solution-page-${slug}`;

    const doc = {
      _type:    "solutionPage",
      _id:      docId,
      slug:     { _type: "slug",        current: slug },
      category,
      label:    { _type: "localeString", en: meta.label    },
      headline: { _type: "localeString", en: meta.headline },
      subtitle: { _type: "localeText",   en: subtitle      },
      faqs,

      // Converted to pure Markdown for clean editing in Sanity
      markdownBody: turndownService.turndown(mainBody),

      seo: {
        metaTitle:       { _type: "localeString", en: seoTitle },
        metaDescription: { _type: "localeText",   en: seoDesc  },
      },
    };

    process.stdout.write(`  📄  ${slug.padEnd(22)} → `);
    try {
      // createOrReplace uploads the draft
      await sanity.createOrReplace(doc);

      // Force-publish by patching the live document ID (removes draft prefix)
      await sanity.patch(docId).set({ _type: "solutionPage" }).commit();

      console.log(`✅  published`);
      ok++;
    } catch (err) {
      console.log(`❌  FAILED — ${err.message}`);
      fail++;
    }
  }

  console.log(`\n─────────────────────────────────────────────`);
  console.log(`  ✅ Uploaded & Published : ${ok}`);
  if (fail) console.log(`  ❌ Failed              : ${fail}`);
  console.log(`─────────────────────────────────────────────\n`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🚀  Solution Page Manager → Sanity [${PROJECT_ID}/${DATASET}]\n`);

  // Verify connection
  try {
    await sanity.fetch('*[_type == "solutionPage"][0]._id');
  } catch (e) {
    console.error("❌  Cannot connect to Sanity:", e.message);
    process.exit(1);
  }

  await deleteOldEntries();
  await uploadPages();
}

main().catch(err => { console.error(err); process.exit(1); });
