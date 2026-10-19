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

const SOLUTIONS_ROOT = path.join(process.cwd(), 'solutions')

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

const CONTENT_FIELDS = [
  'structuredSections',
  'markdownSections',
  'markdownBody',
  'body',
  'faqs',
]

const LEGACY_FIELDS_TO_CLEAR = [
  'markdownSections',
  'markdownBody',
  'body',
]

const PROHIBITED_PATTERNS = [
  { label: 'markdown link', regex: /\[[^\]]+\]\([^)]+\)/ },
  { label: 'route-like path', regex: /(^|[\s([{`])\/(?:api|org|dept|modules|faculty|student|superadmin|work|classrooms|tools|chat|notifications|forum|profile|settings|support|marketplace|canteen|virtual-id|results|assignments|exam|drive|classgrid-ai|my-requests|join-requests|whats-new|organization|platform-feedback)(?:\/|\*|\b)/i },
  { label: 'HTTP method', regex: /\b(?:GET|POST|PATCH|PUT|DELETE)\b/ },
  { label: 'API mention', regex: /\bAPI\b|\/api\//i },
  { label: 'double caret', regex: /\^\^/ },
]

let keyCounter = 1

function nextKey(prefix) {
  return `${prefix}_${keyCounter++}`
}

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

function prepareEnv() {
  loadEnvFile(path.join(MARKETING_ROOT, '.env.local'))
  loadEnvFile(path.join(MARKETING_ROOT, '.env'))

  for (const proxyKey of ['HTTP_PROXY', 'HTTPS_PROXY', 'http_proxy', 'https_proxy', 'ALL_PROXY', 'all_proxy']) {
    if (process.env[proxyKey]?.includes('127.0.0.1:9')) {
      delete process.env[proxyKey]
    }
  }
}

function stripFrontmatter(content) {
  return content.replace(/^---[\s\S]*?---\r?\n/, '').trim()
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
}

function normalizeSpaces(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripHtml(value) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' '))
}

function removeMarkdownLinks(value) {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
}

function removeInlineMarkdown(value) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\^\^/g, '')
}

function sanitizeText(value) {
  return normalizeSpaces(removeInlineMarkdown(removeMarkdownLinks(stripHtml(value))))
}

function sanitizeHeading(value) {
  return sanitizeText(value).replace(/^\d+(?:\.\d+)*\.?\s+/, '')
}

function numberHeading(index, heading) {
  return `1.${index + 1} ${sanitizeHeading(heading)}`
}

function span(text, marks = []) {
  return {
    _type: 'span',
    _key: nextKey('span'),
    text,
    marks,
  }
}

function block(text, style = 'normal', extra = {}) {
  return {
    _type: 'block',
    _key: nextKey('block'),
    style,
    markDefs: [],
    children: [span(sanitizeText(text))],
    ...extra,
  }
}

function bulletBlock(rawText) {
  const text = normalizeSpaces(removeMarkdownLinks(stripHtml(rawText)).replace(/`([^`]+)`/g, '$1').replace(/\^\^/g, ''))
  const labelMatch = text.match(/^\*\*([^*]+?):\*\*\s*(.*)$/)

  if (!labelMatch) {
    return block(removeInlineMarkdown(text), 'normal', {
      listItem: 'bullet',
      level: 1,
    })
  }

  const label = sanitizeText(`${labelMatch[1]}:`)
  const description = sanitizeText(labelMatch[2])

  return {
    _type: 'block',
    _key: nextKey('block'),
    style: 'normal',
    markDefs: [],
    listItem: 'bullet',
    level: 1,
    children: description
      ? [span(label, ['strong']), span(` ${description}`)]
      : [span(label, ['strong'])],
  }
}

function parseHtmlTable(tableHtml) {
  const headers = []
  const rows = []
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch

  while ((trMatch = trRegex.exec(tableHtml)) !== null) {
    const trContent = trMatch[1]
    const thCells = [...trContent.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => sanitizeText(m[1]))
    const tdCells = [...trContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => sanitizeText(m[1]))

    if (thCells.length) {
      headers.push(...thCells)
    } else if (tdCells.length) {
      rows.push({
        _type: 'tableRow',
        _key: nextKey('row'),
        cells: tdCells,
      })
    }
  }

  return {
    _type: 'richTable',
    _key: nextKey('table'),
    headers,
    rows,
  }
}

function parseTextChunkToBlocks(chunk) {
  const blocks = []
  const paragraphLines = []

  function flushParagraph() {
    if (!paragraphLines.length) return
    const paragraph = paragraphLines.join(' ')
    blocks.push(block(paragraph))
    paragraphLines.length = 0
  }

  for (const rawLine of chunk.split('\n')) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      continue
    }

    if (/^###\s+/.test(line)) {
      flushParagraph()
      blocks.push(block(line.replace(/^###\s+/, ''), 'h3'))
      continue
    }

    if (/^####\s+/.test(line)) {
      flushParagraph()
      blocks.push(block(line.replace(/^####\s+/, ''), 'h4'))
      continue
    }

    if (/^-\s+/.test(line)) {
      flushParagraph()
      blocks.push(bulletBlock(line.replace(/^-\s+/, '')))
      continue
    }

    paragraphLines.push(line)
  }

  flushParagraph()
  return blocks
}

function convertSectionToPortableText(sectionContent) {
  const blocks = []
  const parts = sectionContent.split(/(<table[\s\S]*?<\/table>)/gi)

  for (const part of parts) {
    if (!part.trim()) continue

    if (/^<table/i.test(part.trim())) {
      blocks.push(parseHtmlTable(part))
    } else {
      blocks.push(...parseTextChunkToBlocks(part))
    }
  }

  return blocks
}

function parseFaqs(faqText) {
  const faqs = []
  let currentQuestion = null
  let currentAnswer = []

  function flushFaq() {
    if (!currentQuestion) return
    const answer = sanitizeText(currentAnswer.join(' '))
    faqs.push({
      _key: nextKey('faq'),
      question: { en: sanitizeText(currentQuestion) },
      answer: { en: answer },
    })
    currentQuestion = null
    currentAnswer = []
  }

  for (const rawLine of faqText.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue

    if (/^-\s+/.test(line)) {
      flushFaq()
      currentQuestion = line.replace(/^-\s+/, '')
      currentAnswer = []
    } else if (currentQuestion) {
      currentAnswer.push(line)
    }
  }

  flushFaq()
  return faqs
}

function parseMdx(mdxContent) {
  let content = stripFrontmatter(mdxContent)
  let faqText = ''

  const faqSplit = content.split(/\n###\s+FAQs?\s*\r?\n/i)
  if (faqSplit.length > 1) {
    content = faqSplit[0].trim()
    faqText = faqSplit.slice(1).join('\n### FAQs\n').trim()
  }

  const sectionMatches = [...content.matchAll(/^##\s+(.+)$/gm)]
  const sections = []

  for (let i = 0; i < sectionMatches.length; i += 1) {
    const match = sectionMatches[i]
    const next = sectionMatches[i + 1]
    const heading = match[1].trim()
    const start = match.index + match[0].length
    const end = next ? next.index : content.length
    const body = content.slice(start, end).trim()

    sections.push({
      _type: 'object',
      _key: nextKey('section'),
      heading: numberHeading(i, heading),
      content: convertSectionToPortableText(body),
    })
  }

  return {
    structuredSections: sections,
    faqs: parseFaqs(faqText),
    rawBody: content,
  }
}

function collectPlainTextFromBlocks(blocks) {
  const pieces = []
  for (const item of blocks) {
    if (item._type === 'block') {
      pieces.push(item.children?.map((child) => child.text || '').join('') || '')
    } else if (item._type === 'richTable') {
      pieces.push(...(item.headers || []))
      for (const row of item.rows || []) pieces.push(...(row.cells || []))
    }
  }
  return pieces.join('\n')
}

function validateParsed(slug, parsed, mdxContent) {
  const errors = []
  const bodyWithoutFrontmatter = stripFrontmatter(mdxContent)

  for (const pattern of PROHIBITED_PATTERNS) {
    if (pattern.regex.test(bodyWithoutFrontmatter)) {
      errors.push(`${pattern.label} found in source`)
    }
  }

  if (!parsed.structuredSections.length) {
    errors.push('no structured sections parsed')
  }

  if (!parsed.faqs.length) {
    errors.push('no FAQs parsed')
  }

  for (const [sectionIndex, section] of parsed.structuredSections.entries()) {
    if (!section.heading) errors.push(`section ${sectionIndex + 1} has no heading`)
    if (!Array.isArray(section.content) || section.content.length === 0) {
      errors.push(`section "${section.heading}" has no content blocks`)
    }

    const text = collectPlainTextFromBlocks(section.content)
    for (const pattern of PROHIBITED_PATTERNS) {
      if (pattern.regex.test(text)) {
        errors.push(`${pattern.label} found after parsing in section "${section.heading}"`)
      }
    }

    for (const blockItem of section.content) {
      if (blockItem._type === 'block') {
        const marks = (blockItem.children || []).flatMap((child) => child.marks || [])
        const hasStrong = marks.includes('strong')
        const isBullet = blockItem.listItem === 'bullet'
        if (hasStrong && !isBullet) {
          errors.push(`inline bold found outside bullet in section "${section.heading}"`)
        }
      }

      if (blockItem._type === 'richTable') {
        if (!blockItem.headers?.length) errors.push(`table without headers in section "${section.heading}"`)
        if (!blockItem.rows?.length) errors.push(`table without rows in section "${section.heading}"`)
      }
    }
  }

  for (const [faqIndex, faq] of parsed.faqs.entries()) {
    if (!faq.question?.en || !faq.answer?.en) {
      errors.push(`FAQ ${faqIndex + 1} is missing locale question or answer`)
    }
  }

  return errors.map((error) => `${slug}: ${error}`)
}

function readAllPages() {
  return SLUGS.map((slug) => {
    const filePath = path.join(SOLUTIONS_ROOT, `${slug}.mdx`)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing MDX file: ${filePath}`)
    }

    keyCounter = 1
    const mdxContent = fs.readFileSync(filePath, 'utf8')
    const parsed = parseMdx(mdxContent)
    const validationErrors = validateParsed(slug, parsed, mdxContent)

    const blocks = parsed.structuredSections.flatMap((section) => section.content)
    const paragraphBlocks = blocks.filter((item) => item._type === 'block' && !item.listItem && item.style === 'normal').length
    const bulletBlocks = blocks.filter((item) => item._type === 'block' && item.listItem === 'bullet').length
    const tableBlocks = blocks.filter((item) => item._type === 'richTable').length

    return {
      slug,
      filePath,
      ...parsed,
      stats: {
        sections: parsed.structuredSections.length,
        paragraphs: paragraphBlocks,
        bullets: bulletBlocks,
        tables: tableBlocks,
        faqs: parsed.faqs.length,
      },
      validationErrors,
    }
  })
}

async function fetchTargetDocs(client) {
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

async function uploadPages(pages) {
  prepareEnv()

  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'a4wk6kp5'
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN

  if (!token) {
    throw new Error('Missing SANITY_API_WRITE_TOKEN or SANITY_API_TOKEN. Add a write token before uploading.')
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2026-04-20',
    useCdn: false,
    token,
  })

  console.log(`\nSanity project: ${projectId}, dataset: ${dataset}`)

  const docs = await fetchTargetDocs(client)
  const docBySlug = new Map(docs.map((doc) => [doc.slug, doc]))
  const missing = SLUGS.filter((slug) => !docBySlug.has(slug))
  if (missing.length) {
    throw new Error(`Missing solutionPage documents in Sanity: ${missing.join(', ')}`)
  }

  console.log('\nBefore upload:')
  console.table(docs.map(summarizeDoc))

  const transaction = client.transaction()
  for (const page of pages) {
    const doc = docBySlug.get(page.slug)
    transaction.patch(doc._id, (patch) =>
      patch
        .unset(LEGACY_FIELDS_TO_CLEAR)
        .set({
          structuredSections: page.structuredSections,
          faqs: page.faqs,
        })
    )
  }

  await transaction.commit({ visibility: 'sync' })

  const after = await fetchTargetDocs(client)
  console.log('\nAfter upload:')
  console.table(after.map(summarizeDoc))

  const badDocs = after.filter((doc) =>
    (doc.structuredSections ?? 0) === 0 ||
    (doc.faqs ?? 0) === 0 ||
    doc.markdownSections > 0 ||
    doc.markdownBody ||
    doc.body
  )

  if (badDocs.length) {
    throw new Error(`Upload verification failed for: ${badDocs.map((doc) => doc.slug).join(', ')}`)
  }
}

async function run() {
  const shouldUpload = process.argv.includes('--upload')
  const pages = readAllPages()

  console.log('\nParsed solution page summary:')
  console.table(pages.map((page) => ({ slug: page.slug, ...page.stats })))

  const allErrors = pages.flatMap((page) => page.validationErrors)
  if (allErrors.length) {
    console.error('\nValidation failed:')
    for (const error of allErrors) console.error(`- ${error}`)
    process.exit(1)
  }

  console.log('\nValidation passed: no markdown links, no inline prose bold, no route/API patterns, native bullet blocks, locale FAQs, and richTable blocks are ready.')

  if (!shouldUpload) {
    console.log('\nDry run only. Re-run with --upload to write to Sanity.')
    return
  }

  await uploadPages(pages)
  console.log('\nStep 3 complete. All 8 solution pages were uploaded as structured Sanity content.')
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Upload failed: ${message}`)
  process.exit(1)
})
