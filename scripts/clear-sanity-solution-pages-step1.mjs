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
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

const MARKETING_ROOT = 'C:/Users/nikhi/OneDrive/Documents/classgrid_marketting'
const requireFromMarketing = createRequire(path.join(MARKETING_ROOT, 'package.json'))
const { createClient } = requireFromMarketing('@sanity/client')

const SLUGS = [
  'for-students',
  'for-teachers',
  'for-admins',
  'for-schools',
  'for-colleges',
  'for-engineering',
  'for-coaching',
  'for-jr-colleges',
]

const FIELDS_TO_CLEAR = [
  'structuredSections',
  'markdownSections',
  'markdownBody',
  'body',
  'faqs',
]

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const equalsAt = line.indexOf('=')
    if (equalsAt <= 0) continue

    const key = line.slice(0, equalsAt).trim()
    const value = line.slice(equalsAt + 1).trim().replace(/^["']|["']$/g, '')

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.join(MARKETING_ROOT, '.env.local'))
loadEnvFile(path.join(MARKETING_ROOT, '.env'))

for (const proxyKey of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) {
  if (process.env[proxyKey]?.includes('127.0.0.1:9')) {
    delete process.env[proxyKey]
  }
}

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a4wk6kp5'
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

if (!token) {
  console.error('Missing SANITY_API_WRITE_TOKEN or SANITY_API_TOKEN. Add a write token before running this cleanup.')
  process.exit(1)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-04-20',
  useCdn: false,
  token,
})

function summarizeDoc(doc) {
  return {
    slug: doc.slug,
    structuredSections: doc.structuredSections ?? 0,
    markdownSections: doc.markdownSections ?? 0,
    markdownBody: doc.markdownBody ? 'present' : 'empty',
    body: doc.body ? 'present' : 'empty',
    faqs: doc.faqs ?? 0,
  }
}

async function fetchTargetDocs() {
  return client.fetch(
    `*[_type == "solutionPage" && slug.current in $slugs]{
      _id,
      "slug": slug.current,
      "structuredSections": count(structuredSections),
      "markdownSections": count(markdownSections),
      "markdownBody": defined(markdownBody),
      "body": defined(body),
      "faqs": count(faqs)
    } | order(slug asc)`,
    { slugs: SLUGS }
  )
}

async function run() {
  console.log(`Step 1 cleanup: clearing ${FIELDS_TO_CLEAR.join(', ')} for ${SLUGS.length} solution pages.`)
  console.log(`Sanity project: ${projectId}, dataset: ${dataset}`)

  const docs = await fetchTargetDocs()
  const foundSlugs = new Set(docs.map((doc) => doc.slug))
  const missingSlugs = SLUGS.filter((slug) => !foundSlugs.has(slug))

  if (missingSlugs.length) {
    console.error(`Missing solutionPage documents for: ${missingSlugs.join(', ')}`)
    process.exit(1)
  }

  console.log('\nBefore cleanup:')
  console.table(docs.map(summarizeDoc))

  const transaction = client.transaction()
  for (const doc of docs) {
    transaction.patch(doc._id, (patch) => patch.unset(FIELDS_TO_CLEAR))
  }

  await transaction.commit({ visibility: 'sync' })

  const verified = await fetchTargetDocs()
  console.log('\nAfter cleanup:')
  console.table(verified.map(summarizeDoc))

  const uncleared = verified.filter((doc) =>
    doc.structuredSections > 0 ||
    doc.markdownSections > 0 ||
    doc.markdownBody ||
    doc.body ||
    doc.faqs > 0
  )

  if (uncleared.length) {
    console.error(`Cleanup verification failed for: ${uncleared.map((doc) => doc.slug).join(', ')}`)
    process.exit(1)
  }

  console.log('\nStep 1 complete. All 8 solutionPage documents have corrupted content fields cleared.')
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Step 1 cleanup failed: ${message}`)
  process.exit(1)
})
