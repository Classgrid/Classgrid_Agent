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

import React from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Pin, Lock, Globe, Users, Folder } from "lucide-react";
import { Note } from "../services/notesApi";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: Note;
  isActive: boolean;
  onClick: () => void;
}

const decodeHtmlEntities = (text: string | undefined) => {
  if (!text) return "";
  const textArea = document.createElement("textarea");
  textArea.innerHTML = text;
  return textArea.value;
};

export function NoteCard({ note, isActive, onClick }: NoteCardProps) {
  const VisibilityIcon = note.visibility === "Public" ? Globe : note.visibility === "Shared" ? Users : Lock;

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl border cursor-pointer [&_*]:cursor-pointer transition-all hover:shadow-sm group",
        isActive
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/20"
          : "bg-card border-border hover:border-emerald-500/30"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-base leading-none">{typeof note.icon === 'string' ? note.icon : (note.icon as any)?.value || (note.icon as any)?.label || "📄"}</span>
          <h4 className="font-medium text-sm line-clamp-1 truncate">{typeof note.title === 'string' ? note.title : (note.title as any)?.value || (note.title as any)?.label || "Untitled"}</h4>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          {note.visibility === "Private" && <Lock className="w-3 h-3 text-muted-foreground" />}
          {note.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed ml-6">
        {decodeHtmlEntities(note.textContent) || "No content"}
      </p>

      <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-border/50 ml-6">
        {/* Category badge */}
        {note.category && (
          <div className="flex items-center gap-1">
            <Folder className="w-2.5 h-2.5 text-muted-foreground/60" />
            <span className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide">
              {typeof note.category === 'string' ? note.category : (note.category as any)?.value || ''}
            </span>
          </div>
        )}

        {/* Tags - always blue */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((tagRaw, idx) => {
              const tag = typeof tagRaw === 'string' ? tagRaw : (tagRaw as any)?.value || (tagRaw as any)?.label || String(tagRaw);
              return (
                <span
                  key={`${tag}-${idx}`}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                >
                  {tag}
                </span>
              );
            })}
            {note.tags.length > 3 && (
              <span className="px-1.5 py-0.5 rounded border border-muted bg-muted text-[10px] font-medium text-muted-foreground">
                +{note.tags.length - 3}
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
          <div className="flex items-center gap-1">
            <span>Edited</span>
            <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
          </div>
          {note.textContent && (
            <span>{Math.max(1, Math.ceil(note.textContent.length / 1000))} min read</span>
          )}
        </div>
      </div>
    </div>
  );
}

