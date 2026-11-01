// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
// Known apps with an official remote MCP server, offered in AI Hub > Plugins and by the AI ("connect Linear").
// Every URL was checked on 2026-11-01: "oauth" ones answer 401 with an OAuth login that lets a new app sign
// itself up (dynamic client registration); "none" ones work without any login.
// Apps that already have a built-in Classgrid plugin (Notion, Canva, Vercel, Supabase, GitHub...) are not here.

const si = (slug) => `https://cdn.simpleicons.org/${slug}`;
const fav = (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export const MCP_CATALOG = [
    { id: "linear", name: "Linear", description: "Issues, projects and cycles", url: "https://mcp.linear.app/mcp", auth: "oauth", logo: si("linear") },
    { id: "atlassian", name: "Jira & Confluence", description: "Atlassian issues and pages", url: "https://mcp.atlassian.com/v1/mcp", auth: "oauth", logo: si("atlassian") },
    { id: "sentry", name: "Sentry", description: "Errors and performance issues", url: "https://mcp.sentry.dev/mcp", auth: "oauth", logo: si("sentry"), invertInDarkMode: true },
    { id: "stripe", name: "Stripe", description: "Payments, customers and invoices", url: "https://mcp.stripe.com", auth: "oauth", logo: si("stripe") },
    { id: "paypal", name: "PayPal", description: "Invoices, orders and payments", url: "https://mcp.paypal.com/mcp", auth: "oauth", logo: si("paypal") },
    { id: "square", name: "Square", description: "Payments, orders and catalog", url: "https://mcp.squareup.com/mcp", auth: "oauth", logo: si("square"), invertInDarkMode: true },
    { id: "intercom", name: "Intercom", description: "Customer conversations and contacts", url: "https://mcp.intercom.com/mcp", auth: "oauth", logo: si("intercom") },
    { id: "monday", name: "monday.com", description: "Boards, items and updates", url: "https://mcp.monday.com/mcp", auth: "oauth", logo: fav("monday.com") },
    { id: "clickup", name: "ClickUp", description: "Tasks, docs and spaces", url: "https://mcp.clickup.com/mcp", auth: "oauth", logo: si("clickup") },
    { id: "airtable", name: "Airtable", description: "Bases, tables and records", url: "https://mcp.airtable.com/mcp", auth: "oauth", logo: si("airtable") },
    { id: "miro", name: "Miro", description: "Boards and sticky notes", url: "https://mcp.miro.com/", auth: "oauth", logo: si("miro"), invertInDarkMode: true },
    { id: "dropbox", name: "Dropbox", description: "Files and folders", url: "https://mcp.dropbox.com/mcp", auth: "oauth", logo: si("dropbox") },
    { id: "zapier", name: "Zapier", description: "Run actions in 8,000+ apps", url: "https://mcp.zapier.com/api/mcp/mcp", auth: "oauth", logo: si("zapier") },
    { id: "webflow", name: "Webflow", description: "Sites, pages and CMS items", url: "https://mcp.webflow.com/mcp", auth: "oauth", logo: si("webflow") },
    { id: "wix", name: "Wix", description: "Sites, stores and bookings", url: "https://mcp.wix.com/mcp", auth: "oauth", logo: si("wix"), invertInDarkMode: true },
    { id: "netlify", name: "Netlify", description: "Sites and deploys", url: "https://netlify-mcp.netlify.app/mcp", auth: "oauth", logo: si("netlify") },
    { id: "cloudflare", name: "Cloudflare", description: "Workers, KV, R2 and D1", url: "https://bindings.mcp.cloudflare.com/mcp", auth: "oauth", logo: si("cloudflare") },
    { id: "neon", name: "Neon", description: "Postgres projects and SQL", url: "https://mcp.neon.tech/mcp", auth: "oauth", logo: si("neon") },
    { id: "prisma", name: "Prisma Postgres", description: "Databases and migrations", url: "https://mcp.prisma.io/mcp", auth: "oauth", logo: si("prisma"), invertInDarkMode: true },
    { id: "posthog", name: "PostHog", description: "Product analytics and flags", url: "https://mcp.posthog.com/mcp", auth: "oauth", logo: si("posthog"), invertInDarkMode: true },
    { id: "granola", name: "Granola", description: "Meeting notes", url: "https://mcp.granola.ai/mcp", auth: "oauth", logo: fav("granola.ai") },
    { id: "close", name: "Close", description: "CRM leads and deals", url: "https://mcp.close.com/mcp", auth: "oauth", logo: fav("close.com") },
    { id: "apify", name: "Apify", description: "Web scrapers and actors", url: "https://mcp.apify.com", auth: "oauth", logo: fav("apify.com") },
    // Added 2026-11-01 (checked that day; no test sign-up was made with any of them)
    { id: "todoist", name: "Todoist", description: "Tasks and projects", url: "https://ai.todoist.net/mcp", auth: "oauth", logo: si("todoist") },
    { id: "calendly", name: "Calendly", description: "Meetings and booking links", url: "https://mcp.calendly.com", auth: "oauth", logo: si("calendly") },
    { id: "gitlab", name: "GitLab", description: "Projects, issues and merge requests", url: "https://gitlab.com/api/v4/mcp", auth: "oauth", logo: si("gitlab") },
    { id: "postman", name: "Postman", description: "APIs, collections and workspaces", url: "https://mcp.postman.com/mcp", auth: "oauth", logo: si("postman") },
    { id: "razorpay", name: "Razorpay", description: "Payments, orders and refunds", url: "https://mcp.razorpay.com/mcp", auth: "oauth", logo: si("razorpay"), invertInDarkMode: true },
    { id: "attio", name: "Attio", description: "CRM contacts, companies and deals", url: "https://mcp.attio.com/mcp", auth: "oauth", logo: fav("attio.com") },
    { id: "klaviyo", name: "Klaviyo", description: "Email and SMS marketing", url: "https://mcp.klaviyo.com/mcp", auth: "oauth", logo: fav("klaviyo.com") },
    { id: "semrush", name: "Semrush", description: "SEO, keywords and traffic", url: "https://mcp.semrush.com/v1/mcp", auth: "oauth", logo: si("semrush") },
    { id: "ahrefs", name: "Ahrefs", description: "SEO, backlinks and keywords", url: "https://api.ahrefs.com/mcp/mcp", auth: "oauth", logo: fav("ahrefs.com") },
    { id: "amplitude", name: "Amplitude", description: "Product analytics and charts", url: "https://mcp.amplitude.com/mcp", auth: "oauth", logo: fav("amplitude.com") },
    { id: "datadog", name: "Datadog", description: "Logs, metrics and monitors", url: "https://mcp.datadoghq.com/api/unstable/mcp-server/mcp", auth: "oauth", logo: si("datadog") },
    { id: "fireflies", name: "Fireflies", description: "Meeting notes and transcripts", url: "https://api.fireflies.ai/mcp", auth: "oauth", logo: fav("fireflies.ai") },
    // Render has no login button for outside apps: the user's own Render API key is sent instead
    { id: "render", name: "Render", description: "Services, deploys, logs and databases", url: "https://mcp.render.com/mcp", auth: "api_key", logo: si("render"), invertInDarkMode: true, keyHint: "Create one in Render under Account Settings → API Keys.", checkTool: "list_workspaces" },
    // Every n8n has its own address, so the user (or the AI, by asking) gives it
    { id: "n8n", name: "n8n", description: "Run your n8n workflows", url: "", auth: "oauth", logo: si("n8n"), askUrl: { placeholder: "https://yourname.app.n8n.cloud/mcp-server/http", hint: "Your n8n's MCP address. Turn on MCP access in your n8n settings and copy the address shown there." } },
    { id: "huggingface", name: "Hugging Face", description: "Models, datasets and Spaces", url: "https://huggingface.co/mcp", auth: "none", logo: si("huggingface") },
    { id: "context7", name: "Context7", description: "Up-to-date code library docs", url: "https://mcp.context7.com/mcp", auth: "none", logo: fav("context7.com") },
    { id: "deepwiki", name: "DeepWiki", description: "Ask about any GitHub repo", url: "https://mcp.deepwiki.com/mcp", auth: "none", logo: fav("deepwiki.com") },
    { id: "exa", name: "Exa", description: "AI web search", url: "https://mcp.exa.ai/mcp", auth: "none", logo: fav("exa.ai") },
    { id: "shopify-dev", name: "Shopify Dev", description: "Shopify developer docs", url: "https://mcp.shopify.com/mcp", auth: "none", logo: si("shopify") },
    { id: "cloudflare-docs", name: "Cloudflare Docs", description: "Search Cloudflare docs", url: "https://docs.mcp.cloudflare.com/mcp", auth: "none", logo: si("cloudflare") },
    { id: "microsoft-learn", name: "Microsoft Learn", description: "Search Microsoft and Azure docs", url: "https://learn.microsoft.com/api/mcp", auth: "none", logo: fav("learn.microsoft.com") },
    { id: "aws-docs", name: "AWS Docs", description: "Search AWS docs and guides", url: "https://knowledge-mcp.global.api.aws", auth: "none", logo: fav("aws.amazon.com") },
];

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Finds a known app by id or name ("jira", "Linear", "monday.com"). */
export function findCatalogApp(query) {
    const q = norm(query);
    if (!q) return null;
    return MCP_CATALOG.find((a) => norm(a.id) === q || norm(a.name) === q)
        || MCP_CATALOG.find((a) => norm(a.name).includes(q) || (q.length >= 4 && q.includes(norm(a.id))))
        || (/(jira|confluence)/.test(q) ? MCP_CATALOG.find((a) => a.id === "atlassian") : null);
}
