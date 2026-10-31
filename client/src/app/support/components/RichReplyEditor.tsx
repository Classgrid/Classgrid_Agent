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

import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
"use client";

import React, { useRef, useCallback, useImperativeHandle, forwardRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Link2,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Image as ImageIcon,
  X,
  ExternalLink,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Paperclip,
  Eye,
} from "lucide-react";
import LinkModal from "@/app/support/components/LinkModal";
import { storageApi } from "@/features/superadmin/services/storageApi";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/marketing_ui/select";
import DOMPurify from "dompurify";
import { toast } from "sonner";

// ── Toolbar button ──────────────────────────────────────────────

function ToolBtn({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="w-7 h-7 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-foreground transition-colors"
    >
      {icon}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-border mx-1" />;
}

// ── Types ───────────────────────────────────────────────────────

export interface RichReplyEditorRef {
  clear: () => void;
  getHTML: () => string;
  setHTML: (html: string) => void;
  getFiles: () => File[];
}

interface RichReplyEditorProps {
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number | string;
  onSubmit?: () => void;
  initialHtml?: string;
  hideAttachments?: boolean;
}

// ── Link Tooltip ────────────────────────────────────────────────

interface LinkTooltipState {
  url: string;
  x: number;
  y: number;
}

// ── Main Component ──────────────────────────────────────────────

const RichReplyEditor = forwardRef<RichReplyEditorRef, RichReplyEditorProps>(
  ({ onChange, placeholder = "Type your reply here...", minHeight = 120, maxHeight = 600, onSubmit, initialHtml, hideAttachments }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [linkTooltip, setLinkTooltip] = useState<LinkTooltipState | null>(null);
    const [isPlainText, setIsPlainText] = useState(false);
    const [savedSelection, setSavedSelection] = useState<Range | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [filePreview, setFilePreview] = useState<{ url: string; name: string; type: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const savedHTML = useRef<string>("");
    const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
      if (initialHtml && editorRef.current && editorRef.current.innerHTML === "") {
        editorRef.current.innerHTML = initialHtml;
      }
    }, [initialHtml]);

    // Strip <p> and <div> wrappers from inside <li> elements so all list items are uniform
    const cleanListItems = useCallback(() => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.querySelectorAll("li > p, li > div").forEach((wrapper) => {
        const li = wrapper.parentElement;
        if (!li) return;
        // Move all children of the <p>/<div> directly into the <li>
        while (wrapper.firstChild) {
          li.insertBefore(wrapper.firstChild, wrapper);
        }
        wrapper.remove();
      });
    }, []);

    const syncContent = useCallback(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (editorRef.current) {
          cleanListItems();
          onChange(editorRef.current.innerHTML);
        }
      }, 300);
    }, [onChange, cleanListItems]);

    // Immediate sync (used by toolbar actions, submit, etc.)
    const syncContentNow = useCallback(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }, [onChange]);

    // Ensure the editor has focus AND a valid cursor position
    const ensureEditorFocus = useCallback(() => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.focus();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !editor.contains(sel.anchorNode)) {
        const range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, []);

    // Expose clear, getHTML, and setHTML methods
    useImperativeHandle(ref, () => ({
      clear: () => {
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
          onChange("");
        }
        setFiles([]);
      },
      getHTML: () => editorRef.current?.innerHTML || "",
      setHTML: (html: string) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html;
          onChange(html);
        }
      },
      getFiles: () => files,
    }), [onChange, files]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        // Keyboard Shortcuts for Lists & Quotes (Google Docs style)
        if (e.ctrlKey && e.shiftKey) {
          if (e.key === "7") {
            e.preventDefault();
            document.execCommand("insertOrderedList");
            syncContent();
            return;
          }
          if (e.key === "8") {
            e.preventDefault();
            document.execCommand("insertUnorderedList");
            syncContent();
            return;
          }
          if (e.key === "9") {
            e.preventDefault();
            document.execCommand("formatBlock", false, "blockquote");
            syncContent();
            return;
          }
        }

        // Markdown auto-formatting (lists) & Auto-link
        if (e.key === " " || e.key === "Enter") {
          const sel = window.getSelection();
          if (sel && sel.focusNode && sel.focusNode.nodeType === Node.TEXT_NODE) {
            const text = sel.focusNode.textContent || "";
            const offset = sel.focusOffset;
            const textBeforeCursor = text.slice(0, offset);

            // Markdown List Auto-format on Space
            if (e.key === " " && offset === text.length) {
              if (textBeforeCursor === "*" || textBeforeCursor === "-") {
                e.preventDefault();
                const range = document.createRange();
                range.setStart(sel.focusNode, 0);
                range.setEnd(sel.focusNode, offset);
                range.deleteContents();
                document.execCommand("insertUnorderedList");
                syncContent();
                return;
              }
              if (/^\d+\.$/.test(textBeforeCursor)) {
                e.preventDefault();
                const range = document.createRange();
                range.setStart(sel.focusNode, 0);
                range.setEnd(sel.focusNode, offset);
                range.deleteContents();
                document.execCommand("insertOrderedList");
                syncContent();
                return;
              }
            }

            const match = textBeforeCursor.match(/(?:^|\s)([^\s]+)$/);
            
            if (match) {
              const word = match[1];
              const isUrl = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i.test(word);
              const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(word);
              
              if (isUrl || isEmail) {
                e.preventDefault(); // Stop default space/enter
                const url = isEmail ? `mailto:${word}` : (word.startsWith('http') ? word : `https://${word}`);
                
                // Select the word
                const wordStartOffset = offset - word.length;
                const range = document.createRange();
                range.setStart(sel.focusNode, wordStartOffset);
                range.setEnd(sel.focusNode, offset);
                sel.removeAllRanges();
                sel.addRange(range);
                
                // Convert to link
                document.execCommand('createLink', false, url);
                
                // Clear selection to the end
                sel.collapseToEnd();
                
                // Insert the prevented space or enter
                if (e.key === " ") {
                  document.execCommand('insertText', false, ' ');
                } else {
                  // Let browser handle enter naturally
                  document.execCommand('insertParagraph');
                }
                syncContent();
                return; // Done auto-linking
              }
            }
          }
        }

        // When inside a list or blockquote, Enter/Shift+Enter should create new items, NOT send
        if (e.key === "Enter") {
          const sel = window.getSelection();
          const node = sel?.focusNode;
          if (node) {
            const container = (node.nodeType === Node.TEXT_NODE ? node.parentElement : node) as HTMLElement;
            const isInsideList = container?.closest?.("ul, ol, li, blockquote");
            if (isInsideList) {
              if (e.shiftKey) {
                e.preventDefault();
                const li = container.closest("li");
                if (li && li.parentNode) {
                  const newLi = document.createElement("li");
                  // Use a zero-width space instead of <br> so it doesn't create a permanent gap!
                  newLi.innerHTML = "&#8203;"; 
                  if (li.nextSibling) {
                    li.parentNode.insertBefore(newLi, li.nextSibling);
                  } else {
                    li.parentNode.appendChild(newLi);
                  }
                  const newRange = document.createRange();
                  newRange.setStart(newLi, 0);
                  newRange.collapse(true);
                  sel?.removeAllRanges();
                  sel?.addRange(newRange);
                } else {
                  document.execCommand('insertParagraph');
                }
              }
              syncContent();
              return; // Crucial: returning here prevents the form from submitting on normal Enter
            }
          }
        }

        // Standard submit on Enter (only when NOT in a list)
        if (e.key === "Enter" && !e.shiftKey && onSubmit) {
          const text = editorRef.current?.innerText?.trim() || "";
          if (text) {
            e.preventDefault();
            syncContentNow();
            onSubmit();
          }
        }
      },
      [onSubmit, syncContentNow, syncContent]
    );

    // Paste handler — preserves rich HTML from ChatGPT etc.
    const handlePaste = useCallback(
      (e: React.ClipboardEvent) => {
        let html = e.clipboardData.getData("text/html");
        if (html) {
          e.preventDefault();
          html = html.replace(/<!--StartFragment-->/gi, '').replace(/<!--EndFragment-->/gi, '');
          const cleanHtml = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'u', 's', 'blockquote', 'code', 'pre'],
            ALLOWED_ATTR: ['href', 'target', 'rel', 'style', 'class']
          });
          document.execCommand("insertHTML", false, cleanHtml);
          syncContent();
        }
      },
      [syncContent]
    );

    // Link insertion via LinkModal
    const handleLinkInsert = useCallback((url: string, text?: string) => {
      editorRef.current?.focus();
      const sel = window.getSelection();
      if (savedSelection && sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelection);
      }

      const label = text || url;
      if (text && savedSelection && !savedSelection.collapsed) {
         document.execCommand("insertHTML", false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
      } else if (!savedSelection || savedSelection.collapsed) {
         document.execCommand("insertHTML", false, `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>&nbsp;`);
      } else {
         document.execCommand("createLink", false, url);
      }

      syncContent();
      setSavedSelection(null);
    }, [syncContent, savedSelection]);

    // Image upload handler
    const handleImageUpload = useCallback(() => {
      imageInputRef.current?.click();
    }, []);

    const onImageSelected = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
          toast.error("Image size exceeds the 5MB limit. Please upload a smaller image.");
          e.target.value = "";
          return;
        }

        const currentImages = editorRef.current?.querySelectorAll("img").length || 0;
        if (currentImages >= 5) {
          toast.error("You can only upload a maximum of 5 inline images.");
          e.target.value = "";
          return;
        }

        setUploadingImage(true);
        setUploadProgress(10);
        const interval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 80) { clearInterval(interval); return 80; }
            return prev + 10;
          });
        }, 200);

        const result = await storageApi.uploadFile(file, "replies");
        clearInterval(interval);

        if (result) {
          setUploadProgress(100);
          setTimeout(() => {
            setUploadingImage(false);
            editorRef.current?.focus();
            document.execCommand("insertHTML", false,
              `<img src="${result.cdnUrl}" alt="${file.name}" data-path="${result.key}" style="max-width:200px;max-height:200px;border-radius:8px;margin:8px 4px;cursor:pointer;" />`
            );
            syncContent();
          }, 300);
        } else {
          setUploadingImage(false);
          toast.error("Image upload failed. Please try again.");
        }
        e.target.value = "";
      },
      [syncContent]
    );

    // Hover handler for links — shows tooltip
    const handleMouseOver = useCallback((e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (anchor && editorRef.current?.contains(anchor)) {
        if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
        const rect = anchor.getBoundingClientRect();
        const editorRect = editorRef.current.getBoundingClientRect();
        setLinkTooltip({
          url: anchor.getAttribute("href") || "",
          x: rect.left - editorRect.left,
          y: rect.bottom - editorRect.top + 4,
        });
      }
    }, []);

    const handleMouseOut = useCallback((e: React.MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      // Don't hide if moving to the tooltip itself
      if (related?.closest?.(".link-tooltip-popup")) return;
      tooltipTimeout.current = setTimeout(() => setLinkTooltip(null), 300);
    }, []);

    // Click handler — preview inline images
    const handleEditorClick = useCallback((e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        setPreviewImage((target as HTMLImageElement).src);
      }
    }, []);

    // Delete image from editor
    const deleteClickedImage = useCallback(() => {
      if (!previewImage || !editorRef.current) return;
      const imgs = editorRef.current.querySelectorAll("img");
      imgs.forEach((img) => {
        if (img.src === previewImage) img.remove();
      });
      setPreviewImage(null);
      syncContent();
    }, [previewImage, syncContent]);

    // Remove a link (unlink)
    const removeLink = useCallback(() => {
      if (!linkTooltip || !editorRef.current) return;
      const links = editorRef.current.querySelectorAll("a");
      links.forEach((a) => {
        if (a.getAttribute("href") === linkTooltip.url) {
          const text = document.createTextNode(a.textContent || "");
          a.parentNode?.replaceChild(text, a);
        }
      });
      setLinkTooltip(null);
      syncContent();
    }, [linkTooltip, syncContent]);

    return (
      <>
        <div className="rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-emerald-500/40 focus-within:border-emerald-500 transition-all overflow-hidden">
          {/* Hidden file input for images */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={onImageSelected}
            className="hidden"
          />

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/50 overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="relative">
              <Select
                onOpenChange={(open) => {
                  if (open) {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
                      setSavedSelection(sel.getRangeAt(0));
                    }
                  }
                }}
                onValueChange={(val) => {
                  editorRef.current?.focus();
                  const sel = window.getSelection();
                  if (savedSelection && sel) {
                    sel.removeAllRanges();
                    sel.addRange(savedSelection);
                  }
                  document.execCommand("formatBlock", false, val);
                  syncContent();
                }}
              >
                <SelectTrigger className="h-7 text-xs font-medium bg-transparent border-none shadow-none focus:ring-0 text-muted-foreground px-2 w-[110px]">
                  <SelectValue placeholder="Heading" />
                </SelectTrigger>
                <SelectContent side="bottom" className="min-w-[130px]">
                  <SelectItem value="h2">Heading 2</SelectItem>
                  <SelectItem value="h3">Heading 3</SelectItem>
                  <SelectItem value="p">Paragraph</SelectItem>
                </SelectContent>
              </Select>
              <ResponsiveSelect
                onChange={(e) => {
                  editorRef.current?.focus();
                  document.execCommand("formatBlock", false, e.target.value);
                  syncContent();
                  e.target.value = "";
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute inset-0 w-full h-full opacity-0 sm:hidden z-10 appearance-none"
                defaultValue=""
              >
                <option value="" disabled>Heading</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="p">Paragraph</option>
              </ResponsiveSelect>
            </div>
            <div className="relative">
              <Select
                onOpenChange={(open) => {
                  if (open) {
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
                      setSavedSelection(sel.getRangeAt(0));
                    }
                  }
                }}
                onValueChange={(val) => {
                  editorRef.current?.focus();
                  const sel = window.getSelection();
                  if (savedSelection && sel) {
                    sel.removeAllRanges();
                    sel.addRange(savedSelection);
                  }
                  document.execCommand("fontSize", false, val);
                  syncContent();
                }}
              >
                <SelectTrigger className="h-7 text-xs font-medium bg-transparent border-none shadow-none focus:ring-0 text-muted-foreground px-2 w-[80px]">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent side="bottom" className="min-w-[100px]">
                  <SelectItem value="1">Size 1</SelectItem>
                  <SelectItem value="2">Size 2</SelectItem>
                  <SelectItem value="3">Size 3</SelectItem>
                  <SelectItem value="4">Size 4</SelectItem>
                  <SelectItem value="5">Size 5</SelectItem>
                  <SelectItem value="6">Size 6</SelectItem>
                  <SelectItem value="7">Size 7</SelectItem>
                </SelectContent>
              </Select>
              <ResponsiveSelect
                onChange={(e) => {
                  editorRef.current?.focus();
                  document.execCommand("fontSize", false, e.target.value);
                  syncContent();
                  e.target.value = "";
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute inset-0 w-full h-full opacity-0 sm:hidden z-10 appearance-none"
                defaultValue=""
              >
                <option value="" disabled>Size</option>
                <option value="1">Size 1</option>
                <option value="2">Size 2</option>
                <option value="3">Size 3</option>
                <option value="4">Size 4</option>
                <option value="5">Size 5</option>
                <option value="6">Size 6</option>
                <option value="7">Size 7</option>
              </ResponsiveSelect>
            </div>
            <Sep />
            <ToolBtn icon={<Bold className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("bold"); syncContent(); }} title="Bold" />
            <ToolBtn icon={<Italic className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("italic"); syncContent(); }} title="Italic" />
            <ToolBtn icon={<Underline className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("underline"); syncContent(); }} title="Underline" />
            <Sep />
            <ToolBtn icon={<ImageIcon className="w-3.5 h-3.5" />} onClick={handleImageUpload} title="Insert image" />
            <ToolBtn icon={<Link2 className="w-3.5 h-3.5" />} onClick={() => {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
                setSavedSelection(sel.getRangeAt(0));
              } else {
                setSavedSelection(null);
              }
              setLinkModalOpen(true);
            }} title="Insert link" />
            <Sep />
            <ToolBtn icon={<AlignLeft className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("justifyLeft"); syncContent(); }} title="Align Left" />
            <ToolBtn icon={<AlignCenter className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("justifyCenter"); syncContent(); }} title="Align Center" />
            <ToolBtn icon={<AlignRight className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("justifyRight"); syncContent(); }} title="Align Right" />
            <ToolBtn icon={<AlignJustify className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("justifyFull"); syncContent(); }} title="Justify" />
            <Sep />
            <ToolBtn icon={<ListOrdered className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("insertOrderedList"); syncContent(); }} title="Numbered list" />
            <ToolBtn icon={<List className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("insertUnorderedList"); syncContent(); }} title="Bullet list" />
            <ToolBtn icon={<Quote className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("formatBlock", false, "blockquote"); syncContent(); }} title="Quote" />
            <Sep />
            <ToolBtn icon={<Undo2 className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("undo"); syncContent(); }} title="Undo" />
            <ToolBtn icon={<Redo2 className="w-3.5 h-3.5" />} onClick={() => { ensureEditorFocus(); document.execCommand("redo"); syncContent(); }} title="Redo" />
            {/* Upload progress + Plain text toggle */}
            <div className="ml-auto flex items-center gap-3">
              {uploadingImage && (
                <div className="flex items-center gap-2">
                  <div className="text-[10px] font-bold text-emerald-500">Uploading {uploadProgress}%</div>
                  <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!editorRef.current) return;
                  if (isPlainText) {
                    // Restore rich text
                    editorRef.current.innerHTML = savedHTML.current;
                    setIsPlainText(false);
                  } else {
                    // Save HTML and show plain text
                    savedHTML.current = editorRef.current.innerHTML;
                    editorRef.current.innerText = editorRef.current.innerText;
                    setIsPlainText(true);
                  }
                  syncContent();
                }}
                className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${isPlainText ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-muted text-muted-foreground hover:bg-zinc-300 dark:hover:bg-zinc-700 hover:text-accent-foreground"}`}
              >
                {isPlainText ? "Rich text" : "Plain text"}
              </button>
            </div>
          </div>

          {/* Editable Area (relative for tooltip positioning) */}
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              data-placeholder={placeholder}
              onInput={syncContent}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onClick={handleEditorClick}
              onMouseOver={handleMouseOver}
              onMouseOut={handleMouseOut}
              className="caret-primary p-4 bg-transparent text-sm text-foreground outline-none prose prose-sm dark:prose-invert max-w-none break-words [&_p]:mb-3 [&_p]:leading-relaxed empty:before:content-[attr(data-placeholder)] empty:before:text-zinc-500 dark:empty:before:text-zinc-500 empty:before:pointer-events-none [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_li]:!mb-0 [&_li]:!py-0.5 [&_li_*]:!mb-0 [&_li_*]:!mt-0 [&_li_p]:!leading-relaxed [&_li_div]:!leading-relaxed [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:!text-blue-500 [&_a]:!no-underline [&_a]:cursor-pointer [&_u]:!decoration-emerald-500 [&_u]:underline-offset-4 [&_u]:decoration-2 [&_span[style*='underline']]:!decoration-emerald-500 [&_span[style*='underline']]:underline-offset-4 [&_span[style*='underline']]:decoration-2 [&_img]:max-w-[150px] [&_img]:max-h-[150px] [&_img]:object-cover [&_img]:rounded-lg [&_img]:cursor-pointer [&_img]:border [&_img]:border-border [&_img]:shadow-sm [&_img]:inline-block [&_img]:m-2 hover:[&_img]:opacity-80"
              style={{ minHeight, maxHeight, overflowY: "auto", overflowX: "hidden" }}
            />

            {/* Link Hover Tooltip */}
            {linkTooltip && (
              <div
                className="link-tooltip-popup absolute z-20 flex items-center gap-2 px-3 py-2 bg-popover border border-border rounded-lg shadow-xl text-xs text-white animate-in fade-in duration-150"
                style={{ left: linkTooltip.x, top: linkTooltip.y }}
                onMouseEnter={() => {
                  if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
                }}
                onMouseLeave={() => setLinkTooltip(null)}
              >
                <span className="max-w-[200px] truncate text-muted-foreground">{linkTooltip.url}</span>
                <a
                  href={linkTooltip.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white rounded font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open
                </a>
                <button
                  onClick={removeLink}
                  className="flex items-center gap-1 px-2 py-1 bg-red-600/80 text-white rounded font-semibold hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Attachments UI below toolbar */}
        {!hideAttachments && files.length > 0 && (
          <div className="px-4 py-3 bg-muted/5 border-t border-border flex flex-wrap gap-2">
            {files.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="group flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full shadow-sm text-xs transition-all hover:border-primary/50 hover:shadow">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Paperclip className="w-3 h-3 text-primary" />
                </div>
                <span className="truncate max-w-[120px] sm:max-w-[150px] font-medium text-foreground">{file.name}</span>
                <span className="text-muted-foreground/60 text-[10px]">{(file.size / 1024).toFixed(0)}kb</span>
                <button
                  type="button"
                  title="Preview file"
                  onClick={() => {
                    const url = URL.createObjectURL(file);
                    setFilePreview({ url, name: file.name, type: file.type });
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-500 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setFiles(f => f.filter((_, i) => i !== idx))}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {!hideAttachments && (
          <div className="px-4 py-3 bg-card border-t border-border flex items-center justify-between rounded-b-xl">
            <input
              type="file"
              multiple
              ref={fileInputRef}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xlsx"
              onChange={(e) => {
                if (e.target.files) {
                  const arr = Array.from(e.target.files);
                  const valid = arr.filter(f => f.size <= 10 * 1024 * 1024);
                  setFiles(prev => [...prev, ...valid].slice(0, 5));
                }
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="w-6 h-6 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                Attach files
              </span>
            </button>
            <div className="text-[10px] text-muted-foreground/60 font-medium tracking-wide uppercase">
              Max 5 files, up to 10MB each
            </div>
          </div>
        )}

        {/* Link Modal */}
        <LinkModal
          open={linkModalOpen}
          onClose={() => setLinkModalOpen(false)}
          onInsert={handleLinkInsert}
          initialText={window.getSelection()?.toString() || ""}
        />

        {/* Image Preview / Delete Modal */}
        {previewImage && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            {/* Top-right action buttons */}
            <div className="absolute top-5 right-5 flex items-center gap-3 z-10">
              <button
                onClick={(e) => { e.stopPropagation(); deleteClickedImage(); }}
                title="Delete image"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                title="Close"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-muted transition-colors shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Image */}
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg border border-border shadow-2xl bg-card"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* File Preview Modal */}
        {filePreview && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => { URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}
          >
            {/* Top-right action buttons */}
            <div className="absolute top-5 right-5 flex items-center gap-3 z-10">
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setFiles(f => f.filter(file => file.name !== filePreview.name));
                  URL.revokeObjectURL(filePreview.url); 
                  setFilePreview(null); 
                }}
                title="Delete file"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors shadow-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(filePreview.url); setFilePreview(null); }}
                title="Close"
                className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border text-foreground hover:bg-muted transition-colors shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* File name */}
            <div className="absolute top-5 left-5 z-10 px-4 py-2 bg-card/90 backdrop-blur-sm border border-border rounded-lg shadow-lg">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-foreground">{filePreview.name}</span>
              </div>
            </div>
            {/* Preview content */}
            <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh]">
              {filePreview.type.startsWith('image/') ? (
                <img
                  src={filePreview.url}
                  alt={filePreview.name}
                  className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg border border-border shadow-2xl bg-card"
                />
              ) : filePreview.type === 'application/pdf' ? (
                <iframe
                  src={filePreview.url}
                  title={filePreview.name}
                  className="w-[80vw] h-[80vh] rounded-lg border border-border shadow-2xl bg-card"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 p-12 bg-card border border-border rounded-lg shadow-2xl">
                  <Paperclip className="w-12 h-12 text-muted-foreground" />
                  <p className="text-lg font-semibold text-foreground">{filePreview.name}</p>
                  <p className="text-sm text-muted-foreground">Preview not available for this file type</p>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  }
);

RichReplyEditor.displayName = "RichReplyEditor";
export default RichReplyEditor;
