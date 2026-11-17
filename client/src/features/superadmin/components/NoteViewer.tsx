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

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
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

import React, { useState } from "react";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Clock, Globe, Lock, Users, Calendar, Tags, History, Edit3, CheckCircle2, Pin, Copy, Trash2, ChevronDown, FileText, Code2, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { Note } from "../services/notesApi";
import { cn } from "@/lib/utils";
import { getTagColor } from "../utils/noteColors";
import { Button } from "@/components/marketing_ui/button";
import { useNoteVersions } from "../queries/useNotes";
import rehypeRaw from "rehype-raw";

interface NoteViewerProps {
  note: Note;
  onEdit: () => void;
  onRestoreVersion?: (version: any) => void;
  onTogglePin?: () => void;
  onDelete?: () => void;
}

export function NoteViewer({ note, onEdit, onRestoreVersion, onTogglePin, onDelete }: NoteViewerProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const { data: versions = [], isLoading: loadingVersions } = useNoteVersions(showHistory ? note._id : undefined);

  const VisibilityIcon = note.visibility === "Public" ? Globe : note.visibility === "Shared" ? Users : Lock;

  // Clean up legacy HTML tags from rich text editor days
  let displayContent = note.content || "";
  if (displayContent.includes("<div>")) {
    displayContent = displayContent
      .replace(/<div>/g, "")
      .replace(/<\/div>/g, "\n")
      .replace(/<br\s*\/?>/gi, "\n");
  }

  // Auto-detect raw environment variable files and wrap them in a code block for perfect formatting
  if (!displayContent.trim().startsWith("```") && displayContent.includes("MONGO_URI=")) {
    displayContent = "```env\n" + displayContent.trim() + "\n```";
  }

  // Plain text: strip markdown symbols
  const plainText = note.textContent || displayContent
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim())
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/>/g, "")
    .trim();

  // Extract headings for Table of Contents
  const headings = displayContent
    .split("\n")
    .filter((line) => line.startsWith("#"))
    .map((line) => {
      const match = line.match(/^(#{1,6})\s+(.+)/);
      if (!match) return null;
      return { level: match[1].length, text: match[2] };
    })
    .filter(Boolean) as { level: number; text: string }[];

  return (
    <div className="flex w-full h-full overflow-hidden border-l border-border">
      <div className="flex-1 min-w-0 h-full overflow-y-auto bg-background relative border-r border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 relative">
          
          {/* Header Actions */}
          <div className="flex flex-wrap gap-2.5 mb-6 pt-2">
            {onTogglePin && (
              <Button
                variant="outline"
                size="sm"
                onClick={onTogglePin}
                className={note.isPinned
                  ? "text-amber-500 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:text-amber-600"
                  : ""}
              >
                <Pin className={cn("w-4 h-4 sm:mr-2", note.isPinned ? "fill-amber-500" : "")} />
                <span className="hidden sm:inline">{note.isPinned ? "Unpin" : "Pin"}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={showHistory ? "bg-accent" : ""}
            >
              <History className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">History</span>
            </Button>

            {/* Copy Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCopyMenu(!showCopyMenu)}
                onBlur={() => setTimeout(() => setShowCopyMenu(false), 150)}
              >
                <Copy className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Copy</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
              {showCopyMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 duration-100">
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-accent rounded-t-lg transition-colors text-left"
                    onMouseDown={() => {
                      navigator.clipboard.writeText(plainText);
                      toast.success("Copied as plain text!");
                      setShowCopyMenu(false);
                    }}
                  >
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Copy as Text
                  </button>
                  <div className="h-px bg-border mx-2" />
                  <button
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-accent rounded-b-lg transition-colors text-left"
                    onMouseDown={() => {
                      navigator.clipboard.writeText(note.content || "");
                      toast.success("Copied as Markdown!");
                      setShowCopyMenu(false);
                    }}
                  >
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                    Copy as Markdown
                  </button>
                </div>
              )}
            </div>

            <Button size="sm" onClick={onEdit}>
              <Edit3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Edit Note</span>
            </Button>

            {onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}
          </div>

          {/* Title Area - 100% width */}
          <div className="flex items-center gap-4 min-w-0 mb-8 w-full">
            <span className="text-4xl sm:text-5xl shrink-0">{typeof note.icon === 'string' ? note.icon : (note.icon as any)?.value || (note.icon as any)?.label || "📄"}</span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-foreground break-words min-w-0 w-full">
              {typeof note.title === 'string' ? note.title : (note.title as any)?.value || (note.title as any)?.label || "Untitled"}
            </h1>
          </div>

          {/* Beautiful Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-12 p-6 rounded-2xl bg-card border shadow-sm">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Created
              </span>
              <span className="text-sm font-medium">{format(new Date(note.createdAt), "dd MMM yyyy")}</span>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Last Edited
              </span>
              <span className="text-sm font-medium">{format(new Date(note.updatedAt), "h:mm a")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tags className="w-3.5 h-3.5" /> Tags
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {note.tags?.length ? note.tags.slice(0, 2).map((tagRaw, idx) => {
                  const tag = typeof tagRaw === 'string' ? tagRaw : (tagRaw as any)?.value || (tagRaw as any)?.label || String(tagRaw);
                  return (
                    <span key={`${tag}-${idx}`} className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium border", getTagColor(tag))}>
                      {tag}
                    </span>
                  );
                }) : <span className="text-sm text-muted-foreground">No tags</span>}
                {note.tags?.length > 2 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                    +{note.tags.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-12">
            {/* Markdown Content */}
            <div className="flex-1 min-w-0 pb-32">
              <div className="prose prose-emerald dark:prose-invert max-w-full prose-headings:scroll-mt-6 prose-img:rounded-xl prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:text-base prose-p:leading-relaxed prose-li:text-base overflow-x-auto text-base">
                {displayContent ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {displayContent}
                  </ReactMarkdown>
                ) : (
                  <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl opacity-60">
                    <Edit3 className="w-12 h-12 mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium">No content yet</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                      Click the Edit button to start writing your note using Markdown.
                    </p>
                    <Button variant="outline" className="mt-6" onClick={onEdit}>Start Writing</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version History Sidebar (Overlay) */}
      {showHistory && (
        <div className="absolute top-0 right-0 w-80 max-w-[calc(100vw-2rem)] border-l bg-card flex flex-col h-full z-50 shadow-2xl animate-in slide-in-from-right-8 duration-200">
          <div className="p-4 border-b flex items-center justify-between bg-muted/30">
            <h3 className="font-medium flex items-center gap-2 text-foreground">
              <History className="w-4 h-4 text-muted-foreground" /> Version History
            </h3>
            <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full hover:bg-background" onClick={() => setShowHistory(false)}>
              <span className="text-lg">&times;</span>
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-5">
            {loadingVersions ? (
              <div className="text-sm text-muted-foreground text-center p-4">Loading history...</div>
            ) : versions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center p-4">No previous versions</div>
            ) : (
              <div className="space-y-0">
                {/* Current Version - always on top */}
                <div className="relative flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="mt-0.5 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Current Version</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Active now · Latest</div>
                  </div>
                </div>

                {/* Arrow down from current */}
                {versions.length > 0 && (
                  <div className="flex justify-center py-1.5">
                    <ArrowDown className="w-5 h-5 text-muted-foreground/60" />
                  </div>
                )}

                {/* Previous versions - numbered from newest to oldest */}
                {versions.map((v, i) => {
                  const versionNumber = versions.length - i;
                  const ordinal = versionNumber === 1 ? "1st" : versionNumber === 2 ? "2nd" : versionNumber === 3 ? "3rd" : `${versionNumber}th`;
                  return (
                    <React.Fragment key={v._id}>
                      <div className="relative flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border">
                        <div className="mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
                          {versionNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {ordinal} Version
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(v.createdAt), "MMM d, yyyy")} · {format(new Date(v.createdAt), "h:mm a")}
                          </div>
                          {onRestoreVersion && (
                            <Button variant="link" size="sm" className="h-auto p-0 mt-1.5 text-xs text-emerald-500 hover:text-emerald-600 font-medium" onClick={() => onRestoreVersion(v)}>
                              ↩ Restore this version
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Arrow between versions */}
                      {i < versions.length - 1 && (
                        <div className="flex justify-center py-1.5">
                          <ArrowDown className="w-5 h-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
