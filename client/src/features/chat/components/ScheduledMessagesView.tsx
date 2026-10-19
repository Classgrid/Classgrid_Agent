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

import { useState, useEffect } from "react";
import { Clock, Calendar, Edit2, Trash2, X, AlertCircle, ArrowLeft } from "lucide-react";
import { fetchScheduledMessages, cancelScheduledMessage, editScheduledMessage, ScheduledMessage } from "../services/chatApi";
import { format } from "date-fns";
import { Spinner } from "@/components/marketing_ui/spinner";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import DOMPurify from 'dompurify';
import React, { useRef } from "react";
import RichReplyEditor from "@/app/support/components/RichReplyEditor";
import type { RichReplyEditorRef } from "@/app/support/components/RichReplyEditor";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";

interface ScheduledMessagesViewProps {
  onClose: () => void;
  threadId: string;
}

export function ScheduledMessagesView({ onClose, threadId }: ScheduledMessagesViewProps) {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState("");
  const [editDate, setEditDate] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const editorRef = useRef<RichReplyEditorRef>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    warningMessage: string;
    actionLabel: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", description: "", warningMessage: "", actionLabel: "", onConfirm: () => {} });

  useEffect(() => {
    loadMessages();
  }, [threadId]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchScheduledMessages(threadId);
      setMessages(data);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load scheduled messages.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (msgId: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Cancel Message",
      description: "Are you sure you want to cancel this scheduled message?",
      warningMessage: "This message will not be sent.",
      actionLabel: "Cancel Message",
      onConfirm: async () => {
        try {
          await cancelScheduledMessage(threadId, msgId);
          setMessages(messages.filter(m => m.id !== msgId));
        } catch (err: any) {
          alert(err.response?.data?.error || "Failed to cancel message");
        }
      }
    });
  };

  const handleEditClick = (msg: ScheduledMessage) => {
    setEditingId(msg.id);
    setEditMessageText(msg.message);
    const date = new Date(msg.scheduled_for);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditDate(localDate);
  };

  const handleSaveEdit = async (msgId: string) => {
    try {
      setSavingId(msgId);
      const isoDate = new Date(editDate).toISOString();
      const newText = editorRef.current ? editorRef.current.getHTML().trim() : editMessageText;
      const updated = await editScheduledMessage(threadId, msgId, newText, isoDate);
      setMessages(messages.map(m => m.id === msgId ? updated : m));
      setEditingId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to edit message");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-30 bg-[#efeae2] dark:bg-[#0b141a] flex flex-col h-full w-full">
      {/* Header */}
      <div className="h-[60px] flex items-center gap-3 px-4 bg-background border-b border-border shrink-0">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-accent text-muted-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-lg text-foreground">Scheduled Messages</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Spinner className="w-6 h-6" />
            <p>Loading scheduled messages...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-xl flex items-center gap-2 text-sm border border-red-500/20 max-w-2xl mx-auto">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="font-medium text-foreground mb-1">No scheduled messages</h3>
            <p className="text-sm text-muted-foreground">Any messages you schedule for later will appear here.</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className="bg-white dark:bg-[#202c33] border border-black/5 dark:border-white/10 rounded-xl p-4 shadow-sm">
                {editingId === msg.id ? (
                  <div className="space-y-3">
                    <div className="w-full border border-border rounded-xl overflow-hidden bg-background">
                      <RichReplyEditor 
                        ref={editorRef}
                        initialHtml={editMessageText}
                        onChange={(html) => setEditMessageText(html)}
                        onSubmit={() => handleSaveEdit(msg.id)}
                        minHeight={120}
                        maxHeight="40vh"
                        hideAttachments={true}
                      />
                    </div>
                    <div className="w-full">
                      <NikhilTimeCalendar 
                        value={editDate ? new Date(editDate) : undefined}
                        onChange={(d) => {
                          if (d) {
                            const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                            setEditDate(localDate);
                          } else {
                            setEditDate("");
                          }
                        }}
                        popDirection="bottom"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={() => setEditingId(null)} className="px-4 py-2 text-sm font-medium hover:bg-accent rounded-lg text-muted-foreground transition-colors">
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSaveEdit(msg.id)} 
                        disabled={savingId === msg.id}
                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        {savingId === msg.id ? <Spinner className="w-3 h-3" /> : null}
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(msg.scheduled_for), 'MMM d, yyyy • h:mm a')}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEditClick(msg)} className="p-1.5 hover:bg-accent rounded-md text-muted-foreground transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleCancel(msg.id)} className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-md transition-colors" title="Cancel Message">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div 
                      className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none [&_p]:m-0 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg.message || '') }}
                    />
                    
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-3 text-xs text-muted-foreground font-medium flex items-center gap-1">
                        📎 {msg.attachments.length} attachment(s)
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <DangerConfirmDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        warningMessage={confirmDialog.warningMessage}
        actionLabel={confirmDialog.actionLabel}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </div>
  );
}
