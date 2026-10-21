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
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
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

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertCircle, CheckCircle2, FileText, Globe2, Pencil, RefreshCw, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import CMSPageEditor from "@/features/website_cms/components/CMSPageEditor";
import {
  fetchOrgWebsiteContent,
  setupOrgWebsiteContent,
  updateOrgWebsiteContent,
  type OrgWebsiteContent,
  type WebsiteCMSPageKey,
  type WebsiteCMSPageStatus,
} from "@/features/website_cms/api";

type CMSMode = "view" | "edit";

type CMSPageDefinition = {
  id: WebsiteCMSPageKey;
  title: string;
  slug: string;
};

type CMSPageRecord = CMSPageDefinition & {
  status: WebsiteCMSPageStatus;
  updatedAt: string;
  html: string;
};

const PAGE_DEFINITIONS: CMSPageDefinition[] = [
  { id: "home", title: "Home", slug: "/" },
  { id: "about", title: "About Us", slug: "/about" },
  { id: "admissions", title: "Admissions", slug: "/admissions" },
  { id: "facilities", title: "Facilities", slug: "/facilities" },
  { id: "contact", title: "Contact", slug: "/contact" },
];

const DEFAULT_PAGE_ID: WebsiteCMSPageKey = "home";
const NOT_SAVED_LABEL = "Not saved yet";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });

const textValue = (value?: string | number | null) => String(value ?? "").trim();

const textToParagraphs = (value?: string | null) => {
  const text = textValue(value);
  if (!text) return "";

  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("");
};

const sectionHtml = (heading: string, value?: string | null) => {
  const body = textToParagraphs(value);
  if (!body) return "";
  return `<h2>${escapeHtml(heading)}</h2>${body}`;
};

const listHtml = (items: string[]) => {
  const validItems = items.map(textValue).filter(Boolean);
  if (!validItems.length) return "";
  return `<ul>${validItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
};

const joinSections = (sections: string[]) => sections.filter(Boolean).join("");

const formatUpdatedAt = (value?: string) => {
  if (!value) return NOT_SAVED_LABEL;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NOT_SAVED_LABEL;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

const createEmptyPages = (): CMSPageRecord[] =>
  PAGE_DEFINITIONS.map((page) => ({
    ...page,
    status: "draft",
    updatedAt: NOT_SAVED_LABEL,
    html: "",
  }));

const getStoredPageHtml = (pageKey: WebsiteCMSPageKey, content?: OrgWebsiteContent | null) => {
  const storedPage = content?.pages?.[pageKey];
  if (typeof storedPage?.html === "string" && (storedPage.html.trim() || storedPage.updatedAt)) {
    return storedPage.html;
  }
  return null;
};

const buildLegacyHomeHtml = (content?: OrgWebsiteContent | null) =>
  joinSections([
    sectionHtml(content?.hero?.headline || content?.institution?.name || "", content?.hero?.subHeadline),
    textToParagraphs(content?.hero?.description),
  ]);

const buildLegacyAboutHtml = (content?: OrgWebsiteContent | null) =>
  joinSections([
    sectionHtml("About", content?.story),
    sectionHtml("Vision", content?.vision),
    sectionHtml("Mission", content?.mission),
    sectionHtml(
      content?.principal?.name ? `Message from ${content.principal.name}` : "Principal Message",
      content?.principal?.message
    ),
  ]);

const buildLegacyAdmissionsHtml = (content?: OrgWebsiteContent | null) => {
  const programItems =
    content?.programs?.map((program) => {
      const details = [program.duration, program.intake, program.eligibility].map(textValue).filter(Boolean).join(" | ");
      const description = textValue(program.description);
      const suffix = [description, details].filter(Boolean).join(" - ");
      return [program.name, suffix].map(textValue).filter(Boolean).join(": ");
    }) ?? [];

  return joinSections([
    sectionHtml(content?.admissionBanner?.title || "Admissions", content?.admissionBanner?.description),
    programItems.length ? `<h2>Programs</h2>${listHtml(programItems)}` : "",
  ]);
};

const buildLegacyFacilitiesHtml = (content?: OrgWebsiteContent | null) => {
  const facilities =
    content?.infrastructure
      ?.map((facility) => {
        const heading = [facility.category, facility.name].map(textValue).filter(Boolean).join(" - ");
        const body = textToParagraphs(facility.description);
        if (!heading && !body) return "";
        return `${heading ? `<h2>${escapeHtml(heading)}</h2>` : ""}${body}`;
      })
      .filter(Boolean) ?? [];

  return facilities.join("");
};

const buildLegacyContactHtml = (content?: OrgWebsiteContent | null) =>
  joinSections([
    listHtml([
      content?.institution?.address ? `Address: ${content.institution.address}` : "",
      content?.institution?.phone ? `Phone: ${content.institution.phone}` : "",
      content?.institution?.whatsapp ? `WhatsApp: ${content.institution.whatsapp}` : "",
      content?.institution?.email ? `Email: ${content.institution.email}` : "",
      content?.contactPage?.officeHours ? `Office Hours: ${content.contactPage.officeHours}` : "",
    ]),
    content?.contactPage?.mapEmbedUrl
      ? `<p><a href="${escapeHtml(content.contactPage.mapEmbedUrl)}" target="_blank" rel="noopener noreferrer">View map</a></p>`
      : "",
  ]);

const resolvePageHtml = (pageKey: WebsiteCMSPageKey, content?: OrgWebsiteContent | null) => {
  const storedHtml = getStoredPageHtml(pageKey, content);
  if (storedHtml !== null) return storedHtml;

  switch (pageKey) {
    case "home":
      return buildLegacyHomeHtml(content);
    case "about":
      return buildLegacyAboutHtml(content);
    case "admissions":
      return buildLegacyAdmissionsHtml(content);
    case "facilities":
      return buildLegacyFacilitiesHtml(content);
    case "contact":
      return buildLegacyContactHtml(content);
    default:
      return "";
  }
};

const mapWebsiteContentToPages = (content?: OrgWebsiteContent | null): CMSPageRecord[] =>
  PAGE_DEFINITIONS.map((definition) => {
    const storedPage = content?.pages?.[definition.id];
    return {
      ...definition,
      status: storedPage?.status ?? (content?.isPublished ? "published" : "draft"),
      updatedAt: formatUpdatedAt(storedPage?.updatedAt ?? content?.updatedAt),
      html: resolvePageHtml(definition.id, content),
    };
  });

export function WebsiteCMSPage() {
  const location = useLocation();
  const [pages, setPages] = useState<CMSPageRecord[]>(() => createEmptyPages());
  const [activePageId, setActivePageId] = useState<WebsiteCMSPageKey>(DEFAULT_PAGE_ID);
  const [mode, setMode] = useState<CMSMode>("view");
  const [draftHtml, setDraftHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const activePage = pages.find((page) => page.id === activePageId) ?? pages[0] ?? createEmptyPages()[0]!;
  const isEditing = mode === "edit";

  const loadWebsiteContent = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const content = await fetchOrgWebsiteContent();
      const mappedPages = mapWebsiteContentToPages(content);
      const nextActivePage = mappedPages.find((page) => page.id === activePageId) ?? mappedPages[0]!;

      setPages(mappedPages);
      setActivePageId(nextActivePage.id);
      setDraftHtml(nextActivePage.html);
    } catch (error) {
      const message = getErrorMessage(error, "Failed to load website content.");
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupWebsite = async () => {
    setIsSettingUp(true);
    try {
      await setupOrgWebsiteContent();
      toast.success("Website initialized in draft mode");
      await loadWebsiteContent();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to setup website"));
    } finally {
      setIsSettingUp(false);
    }
  };

  useEffect(() => {
    void loadWebsiteContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectPage = (pageId: WebsiteCMSPageKey) => {
    const nextPage = pages.find((page) => page.id === pageId);
    if (!nextPage || isSaving) return;
    setActivePageId(pageId);
    setDraftHtml(nextPage.html);
    setMode("view");
  };

  const startEditing = () => {
    setDraftHtml(activePage.html);
    setMode("edit");
  };

  const cancelEditing = () => {
    setDraftHtml(activePage.html);
    setMode("view");
  };

  const publishDraft = async () => {
    setIsSaving(true);
    const publishedAt = new Date().toISOString();

    try {
      const updatedContent = await updateOrgWebsiteContent({
        [`pages.${activePage.id}.html`]: draftHtml,
        [`pages.${activePage.id}.status`]: "published",
        [`pages.${activePage.id}.updatedAt`]: publishedAt,
      });

      const mappedPages = updatedContent
        ? mapWebsiteContentToPages(updatedContent)
        : pages.map((page) =>
            page.id === activePage.id
              ? { ...page, html: draftHtml, status: "published", updatedAt: formatUpdatedAt(publishedAt) }
              : page
          );
      const updatedPage = mappedPages.find((page) => page.id === activePage.id);

      setPages(mappedPages);
      if (updatedPage) setDraftHtml(updatedPage.html);
      setMode("view");
      toast.success("Page updated successfully");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to update page."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Globe2 className="h-4 w-4" /> Website CMS
          </div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">College Website Content</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Manage public website pages from one split-screen workspace. Current route: {location.pathname}
          </p>
        </div>
        <Badge variant={isLoading ? "neutral" : isEditing ? "warning" : "success"} className="w-fit">
          {isLoading ? "Loading content" : isEditing ? "Editing draft" : "View mode"}
        </Badge>
      </header>

      <section className="grid min-h-[680px] grid-cols-1 overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-muted/20 lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pages</h2>
              <Badge variant="neutral">{pages.length}</Badge>
            </div>
          </div>
          <nav className="flex flex-col p-2" aria-label="Website pages">
            {isLoading ? (
              <div className="flex items-center gap-2 rounded-md px-3 py-4 text-sm text-muted-foreground">
                <Spinner /> Loading pages...
              </div>
            ) : (
              pages.map((page) => {
                const isActive = page.id === activePage.id;
                return (
                  <div
                    key={page.id}
                    role="button"
                    tabIndex={0}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => selectPage(page.id)}
                    className={`flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors cursor-pointer ${
                      isActive
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                    }`}
                  >
                    <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{page.title}</span>
                      <span className="mt-1 block truncate text-xs">{page.slug}</span>
                    </span>
                    <span
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                        page.status === "published" ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                  </div>
                );
              })
            )}
          </nav>
        </aside>

        <main className="flex min-w-0 flex-col bg-background">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-xl font-semibold text-foreground">{activePage.title}</h2>
                <Badge variant={activePage.status === "published" ? "success" : "warning"}>
                  {activePage.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{activePage.slug}</span>
                <span>Updated {activePage.updatedAt}</span>
              </div>
            </div>

            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSaving}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
                <Button size="sm" variant="primary" onClick={publishDraft} isLoading={isSaving}>
                  <Send className="h-4 w-4" /> {isSaving ? "Publishing" : "Publish"}
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={startEditing} disabled={isLoading || Boolean(loadError)}>
                <Pencil className="h-4 w-4" /> Edit Page
              </Button>
            )}
          </div>

          {loadError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex max-w-xl items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{loadError}</span>
              </div>
              <div className="flex items-center gap-3">
                {loadError.toLowerCase().includes("not set up") && (
                  <Button size="sm" variant="primary" onClick={handleSetupWebsite} isLoading={isSettingUp}>
                    Create Website Content
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={loadWebsiteContent} disabled={isLoading || isSettingUp}>
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                <Pencil className="h-4 w-4" /> Editing MongoDB-backed draft content.
              </div>
              <CMSPageEditor
                key={activePage.id}
                initialHTML={draftHtml}
                minHeight={420}
                onChange={setDraftHtml}
                placeholder="Write this page content..."
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-5 p-5">
              <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Page preview
                </div>
                <p className="mt-1">
                  {activePage.html.trim()
                    ? "This content is loaded from the organization website CMS document."
                    : "No content has been saved for this page yet."}
                </p>
              </div>
              {activePage.html.trim() ? (
                <article
                  className="prose prose-sm max-w-none rounded-md border border-border bg-background p-5 text-foreground dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: activePage.html }}
                />
              ) : (
                <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  Select Edit Page to create content for {activePage.title}.
                </div>
              )}
            </div>
          )}
        </main>
      </section>
    </div>
  );
}