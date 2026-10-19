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

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, Plus, FileText, Star, Folder, Tag as TagIcon, X,
  ChevronDown, Lock, Globe, Users, Pencil, Check, Hash,
  StickyNote, BookOpen, Code2, Server, Database, Cpu, Cloud,
  ShieldCheck, Layers, FlaskConical, BrainCircuit, Zap, Filter
} from "lucide-react";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Input } from "@/components/marketing_ui/input";
import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";
import { ScrollArea } from "@/components/marketing_ui/scroll-area";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { cn } from "@/lib/utils";
import {
  useNotes,
  useNoteStats,
  useCreateNote,
  useUpdateNote,
  useTogglePin,
  useDeleteNote,
} from "../queries/useNotes";
import { Note } from "../services/notesApi";
import { toast } from "sonner";
import { NoteCard } from "../components/NoteCard";
import { NoteViewer } from "../components/NoteViewer";
import { PremiumNoteEditor } from "../components/PremiumNoteEditor";
import { getTagColor } from "../utils/noteColors";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";

/* ─────────────────────────────────────────────────────────────── */
/* ICON PICKER                                                      */
/* ─────────────────────────────────────────────────────────────── */
const ICON_OPTIONS = [
  "📄","📝","📋","📌","⭐","🔥","💡","🔑","🔒","🌐",
  "☁️","🗄️","🧪","🐞","🚀","⚙️","🏗️","🔗","💻","🎯",
  "📊","📈","🧠","🛡️","🏠","🌍","🔔","📦","🗂️","✅",
];

function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-10 px-3 rounded-lg border border-input bg-background hover:bg-muted/60 transition-colors w-full group"
      >
        <span className="text-xl leading-none">{value}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1.5 left-0 bg-popover border rounded-xl shadow-xl p-2 grid grid-cols-8 gap-0.5 w-56">
          {ICON_OPTIONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => { onChange(icon); setOpen(false); }}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md text-base hover:bg-muted transition-colors",
                value === icon && "bg-emerald-500/20 ring-1 ring-emerald-500/50"
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* CUSTOM DROPDOWN SELECT                                           */
/* ─────────────────────────────────────────────────────────────── */
type SelectOption = { value: string; label: string; icon?: React.ReactNode; desc?: string };

function PremiumSelect({
  value,
  onChange,
  options,
  placeholder,
  allowCustom,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  allowCustom?: boolean;
}) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const hasCustomValue = allowCustom && value && !options.find((o) => o.value === value) && value !== "";
  const displayOptions = [...options];
  if (hasCustomValue) {
    displayOptions.push({ value, label: value });
  }

  const selected = displayOptions.find((o) => o.value === value);

  // If actively typing a new custom category
  if (isCustom) {
    return (
      <div className="flex gap-2 w-full items-center">
        <input
          autoFocus
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customValue.trim()) {
              onChange(customValue.trim());
              setIsCustom(false);
            }
          }}
          placeholder="Type category & press Enter..."
          className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500/50"
        />
        <button
          type="button"
          onClick={() => {
            if (customValue.trim()) {
              onChange(customValue.trim());
            } else {
              onChange(options[0]?.value || "");
            }
            setIsCustom(false);
          }}
          className="px-2.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] uppercase font-semibold transition-colors"
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => {
            setIsCustom(false);
            setCustomValue("");
            onChange(options[0]?.value || "");
          }}
          className="px-2.5 py-1.5 border border-input rounded-md hover:bg-muted text-[10px] uppercase font-semibold text-muted-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(val) => {
        if (val === "__custom__") {
          setIsCustom(true);
          setCustomValue("");
          onChange(""); // Temporarily clear while typing
        } else {
          onChange(val);
        }
      }}
    >
      <SelectTrigger className="w-full h-10 px-3 bg-background hover:bg-muted/60 transition-colors">
        <div className="flex items-center gap-2.5 truncate text-left w-full">
          {selected?.icon && <span className="text-muted-foreground shrink-0">{selected.icon}</span>}
          <SelectValue placeholder={placeholder} className="truncate" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <div className="max-h-[220px] overflow-y-auto pr-1">
          {displayOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="py-2.5 px-3">
              <div className="flex items-center gap-3">
                {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                <div className="flex flex-col">
                  <span className="font-medium text-sm leading-none">{opt.label}</span>
                  {opt.desc && <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>}
                </div>
              </div>
            </SelectItem>
          ))}
          {allowCustom && (
            <SelectItem value="__custom__" className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium border-t rounded-none mt-1">
              <div className="flex items-center gap-2">
                <Plus className="w-3.5 h-3.5" />
                <span>Custom category...</span>
              </div>
            </SelectItem>
          )}
        </div>
      </SelectContent>
    </Select>
  );
}


const VISIBILITY_OPTIONS: SelectOption[] = [
  { value: "Private", label: "Private", icon: <Lock className="w-4 h-4" />, desc: "Only you" },
  { value: "Public", label: "Public", icon: <Globe className="w-4 h-4" />, desc: "Anyone can see" },
  { value: "Shared", label: "Shared", icon: <Users className="w-4 h-4" />, desc: "Team members" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "Published", label: "Published", desc: "Active note" },
  { value: "Draft", label: "Draft", desc: "Work in progress" },
  { value: "Archived", label: "Archived", desc: "No longer active" },
  { value: "Deprecated", label: "Deprecated", desc: "Outdated" },
];

const CATEGORY_PRESETS: SelectOption[] = [
  { value: "General", label: "General" },
  { value: "Backend", label: "Backend" },
  { value: "Frontend", label: "Frontend" },
  { value: "Infrastructure", label: "Infrastructure" },
  { value: "Database", label: "Database" },
  { value: "Security", label: "Security" },
  { value: "DevOps", label: "DevOps" },
  { value: "Research", label: "Research" },
  { value: "Ideas", label: "Ideas" },
];

/* ─────────────────────────────────────────────────────────────── */
/* CATEGORY FILTER DROPDOWN                                         */
/* ─────────────────────────────────────────────────────────────── */
function CategoryFilterDropdown({
  value,
  onChange,
  allCategories,
}: {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  allCategories: string[];
}) {
  // Combine presets + categories from existing notes (deduplicated)
  const presetValues = CATEGORY_PRESETS.map((c) => c.value);
  const extraCategories = allCategories.filter((c) => !presetValues.includes(c));
  const allOptions = [...CATEGORY_PRESETS.map((c) => c.value), ...extraCategories];

  return (
    <div className="w-full mb-2">
      <Select
        value={value || "all"}
        onValueChange={(val) => {
          if (val === "all") onChange(undefined);
          else onChange(val);
        }}
      >
        <SelectTrigger 
          className={cn(
            "w-full h-9 flex items-center justify-between gap-2 px-3 rounded-lg border text-xs font-medium transition-all",
            value
              ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400"
              : "bg-background border-input text-muted-foreground hover:border-border"
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Filter className="w-3.5 h-3.5 shrink-0" />
            <SelectValue placeholder="Filter by category" />
          </div>
        </SelectTrigger>
        
        <SelectContent>
          <div className="max-h-[220px] overflow-y-auto pr-1">
            <SelectItem value="all" className="font-semibold px-3 py-2 text-xs">
              All Categories
            </SelectItem>
            <div className="h-px bg-border mx-2 my-1" />
            {allOptions.map((cat) => (
              <SelectItem key={cat} value={cat} className="px-3 py-2 text-xs">
                {cat}
              </SelectItem>
            ))}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* RESIZE HANDLE                                                    */
/* ─────────────────────────────────────────────────────────────── */
function ResizeHandle({ onDrag }: { onDrag: (delta: number) => void }) {
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const onMouseMove = (ev: MouseEvent) => onDrag(ev.clientX - startX);
      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [onDrag]
  );

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-[5px] shrink-0 cursor-col-resize flex items-center justify-center hover:bg-emerald-500/20 active:bg-emerald-500/40 transition-colors group z-10"
      style={{ touchAction: "none" }}
    >
      <div className="w-[3px] h-10 rounded-full bg-border/60 group-hover:bg-emerald-500/50 transition-all duration-150" />
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

/* ─────────────────────────────────────────────────────────────── */
/* NOTES PAGE                                                       */
/* ─────────────────────────────────────────────────────────────── */
export function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [filterMode, setFilterMode] = useState<"All" | "Pinned" | "Private" | "Public">("All");

  const { data: notes = [], isLoading } = useNotes({
    search: debouncedSearchQuery || undefined,
    date: selectedDate ? selectedDate.toISOString() : undefined,
    tag: selectedTag,
    category: selectedCategory,
    visibility: filterMode === "Private" || filterMode === "Public" ? filterMode : undefined,
  });
  const { data: stats } = useNoteStats();

  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const togglePin = useTogglePin();
  const deleteNote = useDeleteNote();

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCategory, setEditCategory] = useState("General");
  const [editIcon, setEditIcon] = useState("📄");
  const [editVisibility, setEditVisibility] = useState("Private");
  const [editStatus, setEditStatus] = useState("Published");
  const [newTagInput, setNewTagInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [showCategoryPresets, setShowCategoryPresets] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const [leftWidth, setLeftWidth] = useState(400);
  const leftBase = useRef(400);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleCreateNew();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isEditing) handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, editTitle, editContent, editTags, editCategory, editIcon, editVisibility, editStatus]);

  useEffect(() => {
    if (activeNote && !notes.find((n) => n._id === activeNote._id)) {
      setActiveNote(null);
      setIsEditing(false);
    }
  }, [notes, activeNote]);

  const handleCreateNew = () => {
    setActiveNote(null);
    setIsEditing(true);
    setEditTitle("");
    setEditContent("");
    setEditTags([]);
    setEditCategory("General");
    setCategoryInput("General");
    setEditIcon("📄");
    setEditVisibility("Private");
    setEditStatus("Published");
  };

  const handleSave = async () => {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty");
      return;
    }
    const content = editContent || " ";
    const payload = {
      title: editTitle,
      content,
      tags: editTags,
      category: editCategory,
      icon: editIcon,
      visibility: editVisibility,
      status: editStatus,
    };

    if (activeNote) {
      // Check if anything actually changed before saving
      const hasChanged = 
        editTitle !== activeNote.title ||
        content !== (activeNote.content || " ") ||
        JSON.stringify(editTags) !== JSON.stringify(activeNote.tags || []) ||
        editCategory !== (activeNote.category || "General") ||
        editIcon !== (activeNote.icon || "📄") ||
        editVisibility !== (activeNote.visibility || "Private") ||
        editStatus !== (activeNote.status || "Published");

      if (!hasChanged) {
        toast.info("No changes to save");
        setIsEditing(false);
        return;
      }
      updateNote.mutate(
        { id: activeNote._id, ...payload },
        {
          onSuccess: (updated) => {
            toast.success("Note saved");
            setActiveNote(updated);
            setIsEditing(false);
          },
          onError: () => toast.error("Failed to update note"),
        }
      );
    } else {
      createNote.mutate(payload, {
        onSuccess: (newNote) => {
          toast.success("Note created");
          setActiveNote(newNote);
          setIsEditing(false);
        },
        onError: () => toast.error("Failed to create note"),
      });
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newTagInput.trim()) {
      e.preventDefault();
      if (!editTags.includes(newTagInput.trim())) {
        setEditTags([...editTags, newTagInput.trim()]);
      }
      setNewTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setEditTags(editTags.filter((t) => t !== tagToRemove));
  };

  const handleLeftDrag = useCallback((delta: number) => {
    const newW = Math.max(280, Math.min(600, leftBase.current + delta));
    setLeftWidth(newW);
  }, []);

  useEffect(() => {
    leftBase.current = leftWidth;
  }, [leftWidth]);

  const displayedNotes = filterMode === "Pinned" ? notes.filter((n) => n.isPinned) : notes;
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags?.map((t: any) => typeof t === 'string' ? t : t?.value || t?.label || '')).filter(Boolean)));
  // Defensive parsing: in case old notes have {value, label} objects saved in DB as category
  const allCategories = Array.from(new Set(notes
    .map((n) => typeof n.category === 'string' ? n.category : (n.category as any)?.value)
    .filter(Boolean)
  )) as string[];
  const editorCategoryOptions = [
    ...CATEGORY_PRESETS,
    ...allCategories
      .filter((c) => !CATEGORY_PRESETS.find((p) => p.value === c))
      .map((c) => ({ value: c, label: c }))
  ];

  return (
    <div className="flex h-full w-full overflow-hidden bg-background border border-border rounded-lg cursor-pointer [&_*]:cursor-pointer">

      {/* ══════════ LEFT: Sidebar + List ══════════ */}
      <div
        style={{ width: leftWidth, minWidth: 280, maxWidth: 600, flexShrink: 0 }}
        className={cn(
          "flex h-full border-r overflow-hidden transition-all duration-300",
          (activeNote || isEditing) ? "hidden md:flex" : "flex w-full md:w-auto"
        )}
      >

        {/* Narrow Icon Sidebar */}
        <div className="w-12 shrink-0 border-r bg-muted/30 flex flex-col items-center py-3 gap-1">
          {/* New Note */}
          <button
            onClick={handleCreateNew}
            title="New Note (Ctrl+N)"
            className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-sm shadow-emerald-500/20 mb-2"
          >
            <Plus className="w-4 h-4" />
          </button>

          <div className="w-6 border-t border-border/50 mb-2" />

          <button
            onClick={() => setFilterMode("All")}
            title="All Notes"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              filterMode === "All" ? "bg-emerald-500/15 text-emerald-500" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={() => setFilterMode("Pinned")}
            title="Favorites"
            className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              filterMode === "Pinned" ? "bg-amber-500/15 text-amber-500" : "hover:bg-muted text-muted-foreground"
            )}
          >
            <Star className="w-4 h-4" />
          </button>
        </div>

        {/* Main List Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/5">

          {/* Panel Header */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">My Notes</h2>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {stats?.total || 0} total · {stats?.pinned || 0} pinned
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                placeholder="Search notes…"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-background border border-input text-sm outline-none focus:ring-1 focus:ring-emerald-500/50 transition-shadow placeholder:text-muted-foreground/60"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Filter */}
            <NikhilTimeCalendar
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Filter by date"
              popDirection="right"
              className="w-full h-9 text-xs mb-2"
            />

            {/* Category Filter Dropdown */}
            <CategoryFilterDropdown
              value={selectedCategory}
              onChange={setSelectedCategory}
              allCategories={allCategories}
            />

            {/* Tag Pills - always blue */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {allTags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? undefined : tag)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all",
                      selectedTag === tag
                        ? "bg-blue-500 text-white border-blue-500"
                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Clear filters */}
            {(selectedDate || selectedTag || searchQuery || selectedCategory) && (
              <button
                onClick={() => { setSelectedDate(undefined); setSelectedTag(undefined); setSearchQuery(""); setSelectedCategory(undefined); }}
                className="text-[10px] text-muted-foreground hover:text-foreground mt-1.5 flex items-center gap-1 transition-colors"
              >
                <X className="w-2.5 h-2.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border/40 mx-4 my-1" />

          {/* Notes List */}
          <div className="flex-1 px-2 py-2 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-2 px-2 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl bg-muted/40 h-24 animate-pulse" />
                ))}
              </div>
            ) : displayedNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center opacity-60 px-4">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <StickyNote className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No notes found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[180px]">
                  {searchQuery ? "Try a different search term" : "Create your first note to get started"}
                </p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Note
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {displayedNotes.map((note) => (
                  <NoteCard
                    key={note._id}
                    note={note}
                    isActive={activeNote?._id === note._id}
                    onClick={() => {
                      setActiveNote(note);
                      setIsEditing(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resize Handle (Hidden on small screens) */}
      <div className={cn("hidden md:flex", (activeNote || isEditing) ? "flex" : "hidden")}>
        <ResizeHandle onDrag={handleLeftDrag} />
      </div>

      {/* ══════════ RIGHT: Viewer / Editor ══════════ */}
      <div 
        style={{ flex: 1, minWidth: 0 }} 
        className={cn(
          "flex flex-col h-full overflow-hidden bg-card border-l border-border",
          (!activeNote && !isEditing) ? "hidden md:flex" : "flex w-full md:w-auto"
        )}
      >
        {/* Mobile Back Button */}
        {(activeNote || isEditing) && (
          <div className="md:hidden flex items-center px-4 py-2 border-b bg-background/95 backdrop-blur shrink-0">
            <button
              onClick={() => {
                setActiveNote(null);
                setIsEditing(false);
              }}
              className="text-sm font-medium text-emerald-500 flex items-center gap-1 hover:text-emerald-600 transition-colors"
            >
              &larr; Back to Notes
            </button>
          </div>
        )}

        {/* ── Empty State ── */}
        {!activeNote && !isEditing && (
          <div className="flex-1 flex flex-col items-center justify-center select-none">
            <div className="flex flex-col items-center gap-4 opacity-30">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-semibold">Premium Notes</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a note or press{" "}
                  <kbd className="px-1.5 py-0.5 border rounded bg-background text-xs font-mono mx-0.5">Ctrl</kbd>+
                  <kbd className="px-1.5 py-0.5 border rounded bg-background text-xs font-mono mx-0.5">N</kbd>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── EDITOR ── */}
        {isEditing && (
          <div className="flex flex-col h-full min-h-0">

            {/* Editor Top Bar — fixed, never scrolls */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur shrink-0 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl shrink-0">{editIcon}</span>
                <div className="min-w-0">
                  <h2 className="text-xs font-semibold leading-tight truncate">
                    {activeNote ? "Editing" : "New Note"}
                  </h2>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[160px]">{editTitle || "Untitled"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => { setIsEditing(false); if (!activeNote) setActiveNote(null); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={createNote.isPending || updateNote.isPending || !editTitle.trim()}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white transition-colors flex items-center gap-1.5"
                >
                  {createNote.isPending || updateNote.isPending ? (
                    <>
                      <Spinner className="w-3 h-3 text-white" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Scrollable body — this is the key: flex-1 + min-h-0 + overflow-y-auto */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-5 py-6 space-y-5">

                {/* ── Icon + Title row ── */}
                <div className="flex items-center gap-3">
                  <div className="shrink-0">
                    <IconPicker value={editIcon} onChange={setEditIcon} />
                  </div>
                  <input
                    autoFocus
                    placeholder="Note title…"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-2xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/30 text-foreground leading-snug min-w-0"
                  />
                </div>

                {/* ── Meta Properties — flex-wrap so they stack on narrow widths ── */}
                <div className="flex flex-wrap gap-3">
                  <div className="space-y-1.5 min-w-[140px] flex-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Folder className="w-3 h-3" /> Category
                    </label>
                    <PremiumSelect
                      value={editCategory}
                      onChange={setEditCategory}
                      options={editorCategoryOptions}
                      placeholder="Select Category"
                      allowCustom={true}
                    />
                  </div>

                </div>

                {/* ── Tags ── */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Tags
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border border-input rounded-lg bg-background min-h-10 focus-within:ring-1 focus-within:ring-emerald-500/40 transition-shadow">
                    {editTags.map((tag) => (
                      <span
                        key={tag}
                        className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", getTagColor(tag))}
                      >
                        {typeof tag === 'string' ? tag : (tag as any)?.value || (tag as any)?.label || ''}
                        <button type="button" onClick={() => removeTag(tag)} className="hover:opacity-70 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))}
                    <input
                      placeholder={editTags.length === 0 ? "Add tags and press Enter…" : "Add more…"}
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="flex-1 min-w-[120px] text-sm outline-none bg-transparent placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>

                <div className="border-t border-border/40" />

                {/* ── Markdown Editor ── */}
                <PremiumNoteEditor content={editContent} onChange={setEditContent} />

                {/* bottom breathing room */}
                <div className="h-16" />
              </div>
            </div>
          </div>
        )}

        {/* ── VIEWER ── */}
        {!isEditing && activeNote && (
          <NoteViewer
            note={activeNote}
            onEdit={() => {
              setEditTitle(activeNote.title);
              
              // Clean up legacy HTML tags if present
              let cleanContent = activeNote.content || "";
              if (cleanContent.includes("<div>")) {
                cleanContent = cleanContent
                  .replace(/<div>/g, "")
                  .replace(/<\/div>/g, "\n")
                  .replace(/<br\s*\/?>/gi, "\n");
              }
              if (!cleanContent.trim().startsWith("```") && cleanContent.includes("MONGO_URI=")) {
                cleanContent = "```env\n" + cleanContent.trim() + "\n```";
              }
              setEditContent(cleanContent);
              
              setEditTags(activeNote.tags?.map((t: any) => typeof t === 'string' ? t : t?.value || t?.label || '').filter(Boolean) || []);
              setEditCategory(typeof activeNote.category === 'string' ? activeNote.category : (activeNote.category as any)?.value || (activeNote.category as any)?.label || "General");
              setEditIcon(typeof activeNote.icon === 'string' ? activeNote.icon : (activeNote.icon as any)?.value || (activeNote.icon as any)?.label || "📄");
              setEditVisibility(activeNote.visibility || "Private");
              setEditStatus(activeNote.status || "Published");
              setIsEditing(true);
            }}
            onRestoreVersion={(v) => {
              if (confirm("Restore this version? This will overwrite the current note content.")) {
                updateNote.mutate(
                  {
                    id: activeNote._id,
                    title: v.title,
                    content: v.content,
                    tags: v.tags,
                    category: v.category,
                    icon: v.icon,
                    visibility: v.visibility,
                  },
                  {
                    onSuccess: (updated) => {
                      toast.success("Version restored successfully");
                      setActiveNote(updated);
                    },
                  }
                );
              }
            }}
            onTogglePin={() => {
              togglePin.mutate(activeNote._id, {
                onSuccess: (updatedNote) => {
                  setActiveNote(updatedNote);
                  toast.success(updatedNote.isPinned ? "Note pinned successfully" : "Note unpinned successfully");
                }
              });
            }}
            onDelete={() => setShowDeleteConfirm(true)}
          />
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {activeNote && (
        <DangerConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title={`Delete "${activeNote.title}"?`}
          description="This note and all its version history will be permanently deleted."
          warningMessage="This action cannot be undone."
          actionLabel="Delete Note"
          isLoading={deleteNote.isPending}
          onConfirm={() => {
            deleteNote.mutate(activeNote._id, {
              onSuccess: () => {
                toast.success("Note deleted successfully");
                setActiveNote(null);
                setShowDeleteConfirm(false);
              }
            });
          }}
        />
      )}
    </div>
  );
}
