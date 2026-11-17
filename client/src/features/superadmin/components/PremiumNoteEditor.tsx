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

import React, { useRef, useEffect } from "react";
import { Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare, Code, Image as ImageIcon, Link2, Quote, Table } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";

interface PremiumNoteEditorProps {
  content: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function PremiumNoteEditor({ content, onChange, placeholder = "Start writing your note in Markdown..." }: PremiumNoteEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);

    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    // If it's a block level prefix (like ## or - ), ensure it starts on a new line
    let finalPrefix = prefix;
    if (["#", "-", "1.", ">", "- [ ]"].some(p => prefix.trim().startsWith(p))) {
      if (before.length > 0 && !before.endsWith('\n')) {
        finalPrefix = '\n' + prefix;
      }
    }

    const newText = before + finalPrefix + (selected || (suffix ? "" : "text")) + suffix + after;
    onChange(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + finalPrefix.length,
        start + finalPrefix.length + (selected.length || (suffix ? 0 : 4))
      );
    }, 0);
  };

  const ToolbarButton = ({ icon: Icon, onClick, title }: { icon: any, onClick: () => void, title: string }) => (
    <Button 
      variant="ghost" 
      size="icon" 
      className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-muted" 
      onClick={onClick}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </Button>
  );

  return (
    <div className="flex flex-col w-full min-h-[500px] border rounded-xl overflow-hidden bg-card focus-within:ring-1 focus-within:ring-emerald-500/50 transition-shadow">
      
      {/* Markdown Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-0.5 mr-2">
          <ToolbarButton icon={Bold} title="Bold" onClick={() => insertMarkdown("**", "**")} />
          <ToolbarButton icon={Italic} title="Italic" onClick={() => insertMarkdown("_", "_")} />
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-0.5 mx-2">
          <ToolbarButton icon={Heading1} title="Heading 1" onClick={() => insertMarkdown("# ", "")} />
          <ToolbarButton icon={Heading2} title="Heading 2" onClick={() => insertMarkdown("## ", "")} />
          <ToolbarButton icon={Heading3} title="Heading 3" onClick={() => insertMarkdown("### ", "")} />
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-0.5 mx-2">
          <ToolbarButton icon={List} title="Bullet List" onClick={() => insertMarkdown("- ", "")} />
          <ToolbarButton icon={ListOrdered} title="Numbered List" onClick={() => insertMarkdown("1. ", "")} />
          <ToolbarButton icon={CheckSquare} title="Checklist" onClick={() => insertMarkdown("- [ ] ", "")} />
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-0.5 mx-2">
          <ToolbarButton icon={Quote} title="Quote" onClick={() => insertMarkdown("> ", "")} />
          <ToolbarButton icon={Code} title="Code Block" onClick={() => insertMarkdown("```\n", "\n```")} />
          <ToolbarButton icon={Table} title="Table" onClick={() => insertMarkdown("\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n", "")} />
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <div className="flex items-center gap-0.5 ml-2">
          <ToolbarButton icon={Link2} title="Link" onClick={() => insertMarkdown("[", "](url)")} />
        </div>
      </div>

      {/* Editor Area */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full flex-1 p-6 bg-transparent resize-none outline-none font-mono text-sm leading-relaxed text-foreground/90 placeholder:text-muted-foreground/50"
        spellCheck={false}
      />
    </div>
  );
}
