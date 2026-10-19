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
import React, { useRef, useEffect } from "react";
import { X } from "lucide-react";

interface ExpandedInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  value: string;
  onChange?: (val: string) => void;
  title: string;
  readOnly?: boolean;
}

export function ExpandedInputModal({ isOpen, onClose, onSave, value, onChange, title, readOnly }: ExpandedInputModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const length = value?.length || 0;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isOpen]); // Only run when it opens, don't run on value change to avoid jumping cursor

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="dark:bg-[#212121] bg-white rounded-2xl w-full max-w-3xl h-[75vh] flex flex-col overflow-hidden relative shadow-2xl">

        {/* Header with bottom horizontal line */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <h3 className="text-[15px] font-medium text-foreground">
            {title}
          </h3>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-transparent">
          <textarea
            ref={textareaRef}
            value={value}
            readOnly={readOnly}
            onChange={(e) => onChange && onChange(e.target.value)}
            className="w-full h-full p-6 bg-transparent text-[14px] text-foreground font-mono resize-none focus:outline-none focus:ring-0 border-none chat-scrollbar"
            spellCheck={false}
            placeholder={readOnly ? "" : "Type or paste your content here..."}
          />
        </div>

        {/* Footer with top horizontal line */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50 shrink-0">
          {readOnly ? (
            <button
              onClick={onClose}
              className="px-5 py-2 text-[13px] font-medium text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
            >
              Close
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-5 py-2 text-[13px] font-medium text-foreground hover:bg-muted rounded-full transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="px-5 py-2 text-[13px] font-semibold text-background bg-foreground hover:opacity-90 rounded-full transition-colors shadow-sm cursor-pointer"
              >
                Save changes
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
