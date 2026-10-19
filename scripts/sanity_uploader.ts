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
/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */
import { client } from './sanity/lib/client';
import fs from 'fs';

// Helper to convert simple markdown to Portable Text blocks
function markdownToPortableText(markdownContent) {
  const blocks = [];
  const paragraphs = markdownContent.split('\n\n');
  
  for (const para of paragraphs) {
    const text = para.trim();
    if (!text) continue;
    
    // Check if it's a list item
    if (text.startsWith('- ')) {
      const items = text.split('\n');
      for (const item of items) {
        if (item.trim().startsWith('- ')) {
           blocks.push({
            _type: 'block',
            style: 'normal',
            listItem: 'bullet',
            children: [{ _type: 'span', text: item.trim().substring(2), marks: [] }]
          });
        }
      }
    } else if (text.startsWith('|')) {
      // It's a table, just put it as preformatted text block
      blocks.push({
        _type: 'block',
        style: 'blockquote',
        children: [{ _type: 'span', text: text, marks: [] }]
      });
    } else {
      // Paragraph
      blocks.push({
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text: text, marks: [] }]
      });
    }
  }
  
  return blocks;
}

// Convert our standard legal markdown to the CMS schema format
function parseLegalDocToSanitySchema(slug, title, filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Split on "---"
  const parts = content.split('---');
  // First part is header, skip.
  const mainContent = parts.slice(1).join('---').trim();
  
  // Find "## 1. " or "## " to split sections
  // We'll split on "\n## "
  const sectionChunks = mainContent.split('\n## ');
  
  // The first chunk is the intro
  const introChunk = sectionChunks[0];
  
  const sections = [];
  for (let i = 1; i < sectionChunks.length; i++) {
    const chunk = sectionChunks[i];
    // First line is title
    const firstNewline = chunk.indexOf('\n');
    const sectionTitle = chunk.substring(0, firstNewline).trim();
    const sectionBody = chunk.substring(firstNewline).trim();
    
    sections.push({
      _key: `section-${i}`,
      id: sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      title: sectionTitle,
      content: markdownToPortableText(sectionBody)
    });
  }
  
  return {
    _type: 'legalPage',
    _id: `legal-${slug}`,
    title: title,
    slug: { current: slug },
    lastUpdated: "2026-04-20T00:00:00Z",
    effectiveDate: "2026-04-20T00:00:00Z",
    intro: {
      introductionHeading: "Introduction",
      introductionBody: introChunk.replace(/#/g, '').trim(),
    },
    sections: sections
  };
}

async function uploadAll() {
  const withWriteClient = client.withConfig({ token: process.env.SANITY_API_TOKEN });
  
  const docs = [
    { slug: 'privacy-policy', title: 'Privacy Policy', path: 'C:\\Users\\nikhi\\OneDrive\\Documents\\Classgrid_platfrom\\classgrid_platform\\docs\\CLASSGRID_PRIVACY_POLICY.md' },
    { slug: 'terms-of-service', title: 'Terms of Service', path: 'C:\\Users\\nikhi\\OneDrive\\Documents\\Classgrid_platfrom\\classgrid_platform\\docs\\CLASSGRID_TERMS_OF_SERVICE.md' },
    { slug: 'disclaimer', title: 'Disclaimer', path: 'C:\\Users\\nikhi\\OneDrive\\Documents\\Classgrid_platfrom\\classgrid_platform\\docs\\CLASSGRID_DISCLAIMER.md' },
    { slug: 'cookie-policy', title: 'Cookie Policy', path: 'C:\\Users\\nikhi\\OneDrive\\Documents\\Classgrid_platfrom\\classgrid_platform\\docs\\CLASSGRID_COOKIE_POLICY.md' },
    { slug: 'security', title: 'Security', path: 'C:\\Users\\nikhi\\OneDrive\\Documents\\Classgrid_platfrom\\classgrid_platform\\docs\\CLASSGRID_SECURITY_POLICY.md' }
  ];
  
  for (const doc of docs) {
    try {
      console.log(`Processing ${doc.title}...`);
      const payload = parseLegalDocToSanitySchema(doc.slug, doc.title, doc.path);
      await withWriteClient.createOrReplace(payload);
      console.log(`Successfully uploaded ${doc.title} to Sanity!`);
    } catch (e) {
      console.error(`Error uploading ${doc.title}:`, e.message);
    }
  }
}

uploadAll();
