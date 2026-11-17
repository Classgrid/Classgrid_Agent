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

import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Smile, Film, FileText, Mic, Square, Trash2, BarChart2, Image as ImageIcon, Clock, SlidersHorizontal, BellOff, Bell, Camera, Video, Users, BadgeCheck } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { WaveformPlayer } from "./WaveformPlayer";
import type { ChatMessage, OrgUser, ChatThread, LinkPreview } from "../services/chatApi";
import { fetchGroupInfo, fetchLinkPreview } from "../services/chatApi";
import { useQuery } from "@tanstack/react-query";
import EmojiPicker from 'emoji-picker-react';
import DOMPurify from "dompurify";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { toast } from "sonner";

import { Input } from "@/components/marketing_ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import FilePreviewModal from "@/app/support/components/FilePreviewModal";
import { ImageGallery } from "@/features/shared/components/ImageGallery";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";
import { GifPicker } from "./GifPicker";

interface MessageOptions {
  scheduledFor?: string;
  isSilent?: boolean;
  priority?: string;
  expiresAt?: string;
  linkPreview?: LinkPreview | null;
}

interface ChatInputProps {
  onSendMessage: (message: string, files: File[], options?: MessageOptions) => Promise<void>;
  isSending: boolean;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onTyping?: (isTyping: boolean, activityType?: 'typing' | 'recording' | 'uploading') => void;
  disabledReason?: string;
  onOpenPollModal?: () => void;
  canSchedule?: boolean;
  currentUserId?: string;
  orgUsers?: OrgUser[];
  thread?: ChatThread;
}

export function ChatInput({ onSendMessage, isSending, replyTo, onCancelReply, onTyping, disabledReason, onOpenPollModal, canSchedule = false, currentUserId, orgUsers, thread }: ChatInputProps) {
  const [isSendingLocal, setIsSendingLocal] = useState(false);
  const draftKey = thread ? `chat_draft_${thread.id}` : null;
  const [message, setMessage] = useState(() => {
    if (draftKey) {
      return localStorage.getItem(draftKey) || "";
    }
    return "";
  });
  const [files, setFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cropper State
  const [editingFileIndex, setEditingFileIndex] = useState<number | null>(null);
  const [editingFileSrc, setEditingFileSrc] = useState<string | null>(null);

  // New options state
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [isSilent, setIsSilent] = useState(false);
  const [priority, setPriority] = useState("normal"); // normal, high, urgent
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'emoji' | 'gif'>('emoji');

  // Mentions State
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);
  
  const insertMention = (name: string, userId?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || "";
        const offset = range.startOffset;
        
        // Find the index of the last '@' before the cursor
        const lastAtIndex = text.lastIndexOf('@', offset - 1);
        
        if (lastAtIndex !== -1) {
          // Select from '@' to cursor
          range.setStart(textNode, lastAtIndex);
          range.setEnd(textNode, offset);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Overwrite selection with HTML
          let mentionHtml = "";
          if (userId === "everyone") {
            mentionHtml = mentionableUsers?.map(u => {
              const uid = u._id || u.id;
              return `<a href="/profile/${uid}" class="text-emerald-600 dark:text-emerald-500 hover:underline font-semibold no-underline" data-mention="true" data-user-id="${uid}" contenteditable="false">@${u.name}</a>&nbsp;`;
            }).join(" ") || "";
          } else if (userId && userId !== "everyone") {
            mentionHtml = `<a href="/profile/${userId}" class="text-emerald-600 dark:text-emerald-500 hover:underline font-semibold no-underline" data-mention="true" data-user-id="${userId}" contenteditable="false">@${name}</a>&nbsp;`;
          } else {
            mentionHtml = `<a href="#" class="text-emerald-600 dark:text-emerald-500 hover:underline font-semibold no-underline" data-mention="true" contenteditable="false">@${name}</a>&nbsp;`;
          }
          document.execCommand("insertHTML", false, mentionHtml);
          
          setMessage(editorRef.current.innerHTML);
        }
      }
      
      setShowMentions(false);
      setMentionQuery("");
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);

  const getSupportedAudioMimeType = () => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") {
      return undefined;
    }

    return [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const durationMs = recordingStartedAtRef.current ? Date.now() - recordingStartedAtRef.current : recordingTime * 1000;
        const recordedMimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: recordedMimeType });

        mediaRecorderRef.current = null;
        recordingStartedAtRef.current = null;
        stream.getTracks().forEach(track => track.stop());

        if (blob.size === 0 || durationMs < 700) {
          setAudioBlob(null);
          setAudioUrl(null);
          setAudioDurationSeconds(null);
          setRecordingTime(0);
          toast.error("Voice note too short", { description: "Please record for at least one second before sending." });
          return;
        }

        const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
        setAudioBlob(blob);
        setAudioDurationSeconds(durationSeconds);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      if (onTyping) onTyping(true, 'recording');
    } catch (err) {
      console.error("Error accessing mic", err);
    }
  };
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === "recording") {
        try {
          mediaRecorderRef.current.requestData();
        } catch (e) {
          console.error("Failed to requestData", e);
        }
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      if (onTyping) onTyping(false, 'recording');
    }
  };


  const handleOptionsOpenChange = (
    open: boolean,
    eventDetails?: any
  ) => {
    if (open) {
      setIsOptionsOpen(true);
      return;
    }

    const event = eventDetails?.event;
    const reason = eventDetails?.reason;
    const targetNode = event?.target instanceof Node ? event.target : null;
    const targetElement = targetNode?.nodeType === 3 ? targetNode.parentElement : (targetNode instanceof Element ? targetNode : null);

    // Prevent closing if we clicked an element that was instantly unmounted
    if (reason === "outside-press" && event && targetNode && !targetNode.isConnected) {
      eventDetails?.cancel?.();
      setIsOptionsOpen(true);
      return;
    }

    // Prevent closing if we clicked inside our calendar portal or its nested Radix portals
    if (targetElement?.closest('.nikhil-time-calendar-portal, [role="listbox"], [data-radix-popper-content-wrapper]')) {
      eventDetails?.cancel?.();
      setIsOptionsOpen(true);
      return;
    }

    setIsOptionsOpen(false);
  };
  const clearAudio = () => {
    setAudioBlob(null);
    setAudioDurationSeconds(null);
    setRecordingTime(0);
    recordingStartedAtRef.current = null;
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    if (onTyping) onTyping(false, 'recording');
  };

  // Auto-resize textarea is not needed for contentEditable with min-height and max-height
  useEffect(() => {
    // Left empty for compatibility if needed elsewhere
  }, [replyTo]);

  // Save draft to localStorage
  useEffect(() => {
    if (draftKey) {
      const plainText = message.replace(/<[^>]*>?/gm, '').trim();
      if (plainText) {
        localStorage.setItem(draftKey, message);
      } else {
        localStorage.removeItem(draftKey);
      }
      window.dispatchEvent(new Event('chat_draft_updated'));
    }
  }, [message, draftKey]);

  // Load draft when thread changes
  useEffect(() => {
    if (draftKey) {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        setMessage(savedDraft);
        if (editorRef.current) {
          editorRef.current.innerHTML = savedDraft;
        }
      } else {
        setMessage("");
        if (editorRef.current) {
          editorRef.current.innerHTML = "";
        }
      }
    } else {
      setMessage("");
      if (editorRef.current) {
        editorRef.current.innerHTML = "";
      }
    }
  }, [draftKey]);

  useEffect(() => {
    // Detect URLs and fetch link preview
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.match(urlRegex);
    if (urls && urls.length > 0) {
      const firstUrl = urls[0];
      if (linkPreview?.url !== firstUrl) {
        if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
        previewTimeoutRef.current = setTimeout(async () => {
          setIsFetchingPreview(true);
          try {
            const preview = await fetchLinkPreview(firstUrl);
            setLinkPreview(preview);
          } finally {
            setIsFetchingPreview(false);
          }
        }, 800); // 800ms debounce
      }
    } else {
      setLinkPreview(null);
    }
  }, [message]);



  const handleSend = async () => {
    const plainText = message.replace(/<[^>]*>?/gm, '').trim();
    const text = message.trim();
    if (!plainText && files.length === 0 && !audioBlob) return;
    if (isSendingLocal || isSending) return;

    if (text.length > 65000) {
      toast.error("Message too long", { description: "The message size exceeds the maximum allowed length. Please shorten it." });
      return;
    }

    if (scheduledDate) {
      const scheduledTime = new Date(scheduledDate);
      if (isNaN(scheduledTime.getTime()) || scheduledTime <= new Date()) {
        toast.error("Invalid schedule time", { description: "Scheduled time must be in the future. Please update the time." });
        return;
      }
    }

    let mentionedUsers: string[] = [];
    if (orgUsers && text) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = text;
      
      // Extract user IDs from mention <a> tags with data-mention attribute
      const mentionLinks = tempDiv.querySelectorAll('a[data-mention]');
      const mentionIds: string[] = [];
      let hasEveryone = false;
      
      mentionLinks.forEach(link => {
        const userId = link.getAttribute('data-user-id');
        const mentionText = (link.textContent || '').replace('@', '').trim().toLowerCase();
        if (mentionText === 'everyone') {
          hasEveryone = true;
        } else if (userId) {
          mentionIds.push(userId);
        }
      });
      
      if (hasEveryone) {
        mentionIds.push(...orgUsers.map(u => u._id || u.id));
      }
      
      mentionedUsers = Array.from(new Set(mentionIds)).filter(Boolean) as string[];
    }

    const IMAGE_MAX  = 12  * 1024 * 1024;
    const OTHER_MAX  = 150 * 1024 * 1024;
    for (const f of files) {
      const maxAllowed = f.type.startsWith('image/') ? IMAGE_MAX : OTHER_MAX;
      if (f.size > maxAllowed) {
        const limitLabel = f.type.startsWith('image/') ? '12 MB' : '150 MB';
        toast.error('File too large', {
          description: `"${f.name}" exceeds the ${limitLabel} limit. Please remove it before sending.`,
        });
        return;
      }
    }

    if (audioBlob && audioBlob.size === 0) {
      toast.error("Voice note is empty", { description: "Please record again before sending." });
      clearAudio();
      return;
    }

    setIsSendingLocal(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const hasMedia = files.length > 0 || !!audioBlob;
    if (onTyping) {
      if (hasMedia) {
        onTyping(true, 'uploading');
        typingTimeoutRef.current = setTimeout(() => onTyping(false, 'uploading'), 180000);
      } else {
        onTyping(false, 'typing');
      }
    }

    const finalFiles = [...files];
    if (audioBlob) {
      const mimeType = audioBlob.type || 'audio/webm';
      let ext = 'webm';
      if (mimeType.includes('mp4')) ext = 'mp4';
      else if (mimeType.includes('mp3')) ext = 'mp3';
      else if (mimeType.includes('wav')) ext = 'wav';
      else if (mimeType.includes('ogg')) ext = 'ogg';
      else if (mimeType.includes('mpeg')) ext = 'mp3';

      const durationSeconds = Math.max(1, Math.round(audioDurationSeconds || recordingTime || 1));
      const audioFile = new File([audioBlob], `voice_note_${Date.now()}_${durationSeconds}s.${ext}`, { type: mimeType });
      finalFiles.push(audioFile);
    }

    const options = {
      scheduledFor: scheduledDate || undefined,
      isSilent,
      priority,
      expiresAt: expiresAt || undefined,
      mentionedUsers: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      linkPreview: linkPreview || undefined
    };
    
    setMessage("");
    onCancelReply();
    setScheduledDate("");
    setExpiresAt("");
    setPriority("normal");
    setIsSilent(false);
    setMentionQuery("");
    setShowMentions(false);
    if (draftKey) {
      localStorage.removeItem(draftKey);
      window.dispatchEvent(new Event('chat_draft_updated'));
    }
    setFiles([]);
    clearAudio(); // Clear audio preview after sending
    setLinkPreview(null);
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    
    // Fire and forget for Optimistic UI
    onSendMessage(text, finalFiles, options).catch(console.error).finally(() => {
      if (onTyping && hasMedia) {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          onTyping(false, 'uploading');
        }, 1000);
      }
    });

    setIsSendingLocal(false);
  };

  // handleKeyDown moved directly to the element to handle text logic

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processFiles = (newFiles: File[], currentFiles: File[]) => {
    let imgCount = currentFiles.filter(f => f.type.startsWith('image/')).length;
    let vidCount = currentFiles.filter(f => f.type.startsWith('video/')).length;
    let pdfCount = currentFiles.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')).length;
    let otherCount = currentFiles.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/') && !(f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))).length;

    const validFiles: File[] = [];
    let errorMsg = "";

    newFiles.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      let maxSize = 150 * 1024 * 1024; // 150 MB default
      if (isImage) maxSize = 12 * 1024 * 1024; // 12 MB for images

      // We no longer block by size here, we let it into the UI so the user can see it's too large
      // and we disable the Send button.


      if (isImage) {
        if (imgCount >= 30) { errorMsg = "Max 30 images allowed."; return; }
        imgCount++;
      } else if (isVideo) {
        if (vidCount >= 10) { errorMsg = "Max 10 videos allowed."; return; }
        vidCount++;
      } else if (isPdf) {
        if (pdfCount >= 20) { errorMsg = "Max 20 PDFs allowed."; return; }
        pdfCount++;
      } else {
        if (otherCount >= 20) { errorMsg = "Max 20 other files allowed."; return; }
        otherCount++;
      }

      validFiles.push(file);
    });

    if (errorMsg) {
      toast.error("File limit reached", { description: errorMsg });
    }
    return [...currentFiles, ...validFiles];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => processFiles(selectedFiles, prev));
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const startEditingImage = (index: number) => {
    const file = files[index];
    if (file && file.type.startsWith("image/")) {
      const src = URL.createObjectURL(file);
      setEditingFileSrc(src);
      setEditingFileIndex(index);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (editingFileIndex === null) return;
    
    const originalFile = files[editingFileIndex];
    // Create a new File from the blob, preserving the name
    const croppedFile = new File([croppedBlob], originalFile.name, {
      type: croppedBlob.type,
      lastModified: Date.now(),
    });

    setFiles(prev => {
      const newFiles = [...prev];
      newFiles[editingFileIndex] = croppedFile;
      return newFiles;
    });
  };

  const { data: groupInfo } = useQuery({
    queryKey: ["group-info", thread?.groupId],
    queryFn: () => fetchGroupInfo(thread!.groupId!),
    enabled: thread?.type === "group" && !!thread?.groupId,
  });

  // Filter org users to only include group members, and exclude current user
  const mentionableUsers = orgUsers?.filter(u => {
    const uId = u.id || u._id;
    if (uId === currentUserId) return false;
    if (thread?.type === 'group' && groupInfo?.members) {
      return groupInfo.members.some(m => m.userId === uId);
    }
    return true; 
  });

  // Phones show one round button like WhatsApp: mic while the box is empty, send once there is something to send
  const hasSendable = !!message.replace(/<[^>]*>?/gm, '').trim() || files.length > 0 || !!audioBlob;

  return (
    <div className="flex flex-col w-full shrink-0 bg-background border-t border-border relative">
      {/* Mentions Dropdown - Moved to root to prevent any CSS clipping */}
      {showMentions && mentionableUsers && thread?.type === 'group' && (
          <div className="absolute bottom-[100%] mb-2 left-4 bg-popover text-popover-foreground border border-border shadow-2xl rounded-[1.25rem] max-h-72 overflow-y-auto z-[9999] w-[320px] p-2 custom-scrollbar backdrop-blur-xl bg-opacity-95 dark:bg-[#1f2228] dark:border-[#2f3336]">
            {/* @Everyone / @all Option */}
            {("everyone".includes(mentionQuery) || "all".includes(mentionQuery)) && (
            <button
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-accent/80 flex items-center gap-3 transition-colors mb-1"
              onClick={() => insertMention("Everyone", "everyone")}
            >
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm border border-emerald-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-semibold tracking-tight">Everyone</span>
                <span className="text-[12px] text-muted-foreground/80 leading-tight">Mention all members in this chat</span>
              </div>
            </button>
          )}
          {(mentionableUsers || [])
              .filter(u => u.name?.toLowerCase().includes(mentionQuery))
            .map(u => (
              <button
                key={u._id || u.id}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-accent/80 flex items-center gap-3 transition-colors"
                onClick={() => insertMention(u.name, u._id || u.id)}
              >
                {u.profilePicture ? (
                  <img src={u.profilePicture} className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-border/50" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 shadow-sm border border-primary/20 text-sm font-bold uppercase">
                    {(u.name || "?").charAt(0)}
                  </div>
                )}
                <span className="text-[15px] font-semibold tracking-tight">{u.name}</span>
              </button>
            ))}
        </div>
      )}

      {/* Reply Preview */}
      {replyTo && (() => {
        const isMe = replyTo.sender_id === currentUserId;
        const senderName = isMe ? "You" : replyTo.sender_name;
        const nameColor = isMe ? "text-emerald-600 dark:text-emerald-500" : "text-blue-500 dark:text-blue-400";
        
        let mediaIcon = null;
        let mediaText = "";
        let thumbUrl = null;
        
        if (replyTo.attachments && replyTo.attachments.length > 0) {
          const firstAtt = replyTo.attachments[0];
          if (firstAtt.file_type.startsWith("image/")) {
            mediaIcon = <Camera className="w-3.5 h-3.5 inline mr-1 opacity-70" />;
            mediaText = "Photo";
            thumbUrl = firstAtt.file_url;
          } else if (firstAtt.file_type.startsWith("video/")) {
            mediaIcon = <Video className="w-3.5 h-3.5 inline mr-1 opacity-70" />;
            mediaText = "Video";
            thumbUrl = firstAtt.file_url;
          } else if (firstAtt.file_type === "application/pdf") {
            mediaIcon = <FileText className="w-3.5 h-3.5 inline mr-1 opacity-70" />;
            mediaText = "PDF Document";
          } else {
            mediaIcon = <FileText className="w-3.5 h-3.5 inline mr-1 opacity-70" />;
            mediaText = "Document";
          }
        }
        
        let textContent = "";
        if (replyTo.is_deleted) {
          textContent = "This message was deleted";
        } else if (replyTo.message) {
          const doc = new DOMParser().parseFromString(String(replyTo.message), 'text/html');
          textContent = (doc.body.textContent || "").trim();
        }

        return (
          <div className="px-3 py-2 bg-transparent">
            <div className="relative bg-black/5 dark:bg-black/20 rounded-lg p-2 overflow-hidden flex items-stretch gap-2 transition-colors">
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-emerald-500"></div>
              
              <div className="flex-1 min-w-0 pl-2 flex flex-col justify-center">
                <span className={`${nameColor} text-[13px] font-semibold leading-tight block mb-0.5 truncate`}>
                  {senderName}
                </span>
                <span className="text-black/60 dark:text-white/70 text-[13px] leading-tight line-clamp-1 truncate flex items-center">
                  {mediaIcon}
                  {mediaText ? mediaText : textContent}
                  {mediaText && textContent ? ` - ${textContent}` : ""}
                </span>
              </div>
              
              {thumbUrl && (
                <div className="w-10 h-10 rounded shrink-0 bg-black/10 overflow-hidden flex items-center justify-center">
                   <img src={thumbUrl} className="w-full h-full object-cover" />
                </div>
              )}

              <button
                onClick={onCancelReply}
                className="p-1.5 ml-2 mr-1 rounded-full hover:bg-black/10 dark:hover:bg-black/30 text-muted-foreground shrink-0 self-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Audio Preview */}
      {audioUrl && (
        <div className="px-4 py-3 flex items-center justify-between gap-3 border-b border-border bg-muted/30">
          <WaveformPlayer url={audioUrl} fallbackDurationSeconds={audioDurationSeconds ?? undefined} />
          <button onClick={clearAudio} className="p-2 rounded-full hover:bg-red-500/10 text-red-500 transition-colors shrink-0">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* File Previews */}
      {files.length > 0 && (() => {
        const mediaFilesWithIndex = files
          .map((f, i) => ({ file: f, index: i }))
          .filter(({ file }) => file.type.startsWith("image/") || file.type.startsWith("video/"));
          
        const documentFilesWithIndex = files
          .map((f, i) => ({ file: f, index: i }))
          .filter(({ file }) => !(file.type.startsWith("image/") || file.type.startsWith("video/")));

        const galleryImages = mediaFilesWithIndex.map(({ file, index }) => {
          const hasError = file.size > (file.type.startsWith('image/') ? 12 * 1024 * 1024 : 150 * 1024 * 1024);
          return {
            id: index.toString(),
            src: URL.createObjectURL(file),
            alt: file.name,
            type: file.type.startsWith("video/") ? "video" as const : "image" as const,
            hasError
          };
        });

        return (
          <div className="px-4 py-3 border-b border-border space-y-3">
            
            {/* Media Gallery (Images & Videos) */}
            {galleryImages.length > 0 && (
              <div className="max-h-[350px] overflow-y-auto rounded-xl custom-scrollbar border border-border/50">
                <ImageGallery 
                  images={galleryImages} 
                  onRemove={(id) => removeFile(parseInt(id))}
                  onEdit={(id) => startEditingImage(parseInt(id))}
                  className="bg-muted/30 p-2"
                />
              </div>
            )}

            {/* Document Files (PDFs, Docs, etc) */}
            {documentFilesWithIndex.length > 0 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                {documentFilesWithIndex.map(({ file, index }) => {
                  const ext = file.name.split(".").pop()?.toLowerCase() || "";
                  const isAudio = file.type.startsWith("audio/");
                  const isPdf = file.type === "application/pdf" || ext === "pdf";
                  const isWord = ["doc", "docx"].includes(ext);
                  const isExcel = ["xls", "xlsx", "csv"].includes(ext);
                  const isPpt = ["ppt", "pptx"].includes(ext);
                  const isMd = ext === "md";

                  const getDocStyle = () => {
                    if (isPdf) return { color: "text-red-500 bg-red-500/10", label: "PDF" };
                    if (isWord) return { color: "text-blue-500 bg-blue-500/10", label: "DOC" };
                    if (isExcel) return { color: "text-green-500 bg-green-500/10", label: "XLS" };
                    if (isPpt) return { color: "text-orange-500 bg-orange-500/10", label: "PPT" };
                    if (isMd) return { color: "text-purple-500 bg-purple-500/10", label: "MD" };
                    if (isAudio) return { color: "text-violet-500 bg-violet-500/10", label: ext.toUpperCase() };
                    return { color: "text-muted-foreground bg-muted", label: ext.toUpperCase() || "FILE" };
                  };

                  const formatSize = (bytes: number) => {
                    if (bytes < 1024) return `${bytes} B`;
                    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
                    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                  };

                  return (
                    <div
                      key={index}
                      className="relative shrink-0 group cursor-pointer"
                      onClick={() => setPreviewFile(file)}
                    >
                      <div className={`flex items-center gap-2.5 h-20 px-3 rounded-xl border border-border bg-card min-w-[160px] max-w-[200px] hover:bg-accent/50 transition-colors`}>
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getDocStyle().color}`}>
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className="text-xs font-semibold truncate text-foreground">{file.name}</span>
                          <span className="text-[10px] text-muted-foreground">{getDocStyle().label} • {formatSize(file.size)}</span>
                          {file.size > (150 * 1024 * 1024) && (
                            <span className="text-[10px] text-red-500 font-bold leading-none">File too large (&gt;150MB)</span>
                          )}
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {files.length > 1 && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground font-medium">{files.length} files selected</span>
                <button
                  onClick={() => setFiles([])}
                  className="text-[11px] text-red-500 hover:text-red-600 font-semibold transition-colors"
                >
                  Remove All
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Link Preview Card */}
      {linkPreview && (
        <div className="px-4 py-2 border-b border-border bg-muted/20 relative">
          <div className="bg-card border border-border rounded-xl p-2.5 flex items-center gap-3 shadow-sm relative pr-10">
            {linkPreview.image ? (
              <img src={linkPreview.image} className="w-16 h-16 object-cover rounded-md shrink-0 bg-muted" alt="" />
            ) : (
              <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground line-clamp-1">{linkPreview.title || linkPreview.domain}</p>
              {linkPreview.description && <p className="text-[12px] text-muted-foreground line-clamp-1 mt-0.5">{linkPreview.description}</p>}
              <p className="text-[11px] text-emerald-600 dark:text-emerald-500 line-clamp-1 mt-0.5 font-medium">{linkPreview.domain}</p>
            </div>
            <button
              onClick={() => setLinkPreview(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-black/30 text-muted-foreground shrink-0 transition-colors"
              title="Remove preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="px-2 sm:px-4 py-2 sm:py-3 flex items-end gap-1.5 sm:gap-2">
        {disabledReason ? (
          <div className="flex-1 py-3 px-4 text-sm text-muted-foreground text-center bg-accent/30 border border-border rounded-2xl italic">
            {disabledReason}
          </div>
        ) : (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-2 sm:p-2.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0 mb-0.5 outline-none"
                  title="Attach"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-48 mb-2">
                <DropdownMenuItem 
                  className="cursor-pointer py-2" 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "*/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  <span>Document</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer py-2" 
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = "image/*,video/*";
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  <span>Photos & Videos</span>
                </DropdownMenuItem>
                {onOpenPollModal && (
                  <DropdownMenuItem 
                    className="cursor-pointer py-2" 
                    onClick={onOpenPollModal}
                  >
                    <BarChart2 className="w-4 h-4 mr-2" />
                    <span>Poll</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <input
              type="file"
              multiple
              hidden
              ref={fileInputRef}
              onChange={handleFileSelect}
            />

            {isRecording ? (
              <div className="flex-1 h-[44px] bg-accent/50 border border-border rounded-2xl flex items-center px-4 animate-in slide-in-from-right-4 duration-300 mb-0.5">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse mr-3 shrink-0" />
                <span className="text-base text-foreground w-12 font-mono shrink-0">
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
                <div className="flex-1 flex items-center justify-start gap-1 overflow-x-auto no-scrollbar px-2" style={{ scrollbarWidth: 'none' }}>
                  {[...Array(Math.max(5, recordingTime * 2))].map((_, i) => {
                     // Generate pseudo-random height based on index to look like a sound wave
                     const height = 4 + Math.abs(Math.sin(i * 0.5) * 8 + Math.cos(i * 0.2) * 6);
                     return (
                       <div key={i} className="w-1 bg-foreground rounded-full shrink-0 opacity-60" style={{ height: `${height}px` }} />
                     );
                  })}
                  {/* Invisible anchor to keep it scrolled to the end */}
                  <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>
              </div>
            ) : (
            <div className="flex-1 min-h-[44px] bg-accent/50 border border-border rounded-[24px] flex items-end hover:border-primary focus-within:border-primary transition-all duration-200 pl-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="p-2 mb-1 text-muted-foreground hover:text-foreground transition-colors shrink-0 outline-none rounded-full hover:bg-muted">
                    <Smile className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-auto p-0 border-none mb-2 overflow-hidden bg-background shadow-lg rounded-xl">
                  <div className="flex items-center justify-around border-b p-1 bg-secondary/30">
                    <button
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${pickerTab === 'emoji' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setPickerTab('emoji')}
                    >
                      Emoji
                    </button>
                    <button
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${pickerTab === 'gif' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      onClick={() => setPickerTab('gif')}
                    >
                      GIFs
                    </button>
                  </div>
                  
                  <div style={{ width: '350px', height: '450px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {pickerTab === 'emoji' ? (
                      <EmojiPicker
                        onEmojiClick={(emojiData) => {
                          if (editorRef.current) {
                            editorRef.current.focus();
                            document.execCommand("insertText", false, emojiData.emoji);
                            setMessage(editorRef.current.innerHTML);
                          }
                        }}
                        theme="auto"
                        previewConfig={{ showPreview: false }}
                        width={350}
                        height={450}
                      />
                    ) : (
                      <GifPicker 
                        onSelect={async (gifUrl) => {
                          try {
                            const res = await fetch(gifUrl);
                            const blob = await res.blob();
                            const file = new File([blob], "giphy.gif", { type: blob.type || "image/gif" });
                            setFiles(prev => [...prev, file]);
                            
                            // Close the popover by simulating Escape key
                            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                          } catch (err) {
                            console.error("Failed to fetch GIF:", err);
                            toast.error("Failed to load GIF for preview");
                            // Fallback: send as text URL if fetching fails
                            onSendMessage(gifUrl, []);
                          }
                        }} 
                      />
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Mentions dropdown moved to root */}
                  <div
                ref={editorRef}
                contentEditable
                data-placeholder="Type a message..."
                className="w-full min-w-0 flex-1 max-h-[150px] min-h-[44px] overflow-y-auto custom-scrollbar py-3 px-3 outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 text-[16px] sm:text-[15px] text-foreground leading-relaxed break-words [word-break:break-word] whitespace-pre-wrap bg-transparent resize-none border-none relative empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/70 empty:before:pointer-events-none [&_a]:text-blue-500 [&_a]:underline"
                onInput={(e) => {
                  const html = e.currentTarget.innerHTML;
                  const text = e.currentTarget.textContent || "";
                  setMessage(html);
                  
                  // Ultra-reliable Mention logic (bypassing browser Selection API bugs)
                  const lastAtIndex = text.lastIndexOf('@');
                  if (lastAtIndex !== -1) {
                    const afterAt = text.slice(lastAtIndex + 1).replace(/[\r\n\u200B]+$/, "");
                    // Make the detection extremely lenient. If there is an @, just show the popup.
                    if (!afterAt.includes(' ') && !afterAt.includes('\u00A0')) {
                      setShowMentions(true);
                      setMentionQuery(afterAt.toLowerCase());
                    } else {
                      setShowMentions(false);
                    }
                  } else {
                    setShowMentions(false);
                  }

                  if (onTyping) {
                    onTyping(true, 'typing');
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => onTyping(false, 'typing'), 2000);
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  // If clipboard has FILES (e.g. copy-paste an image), process as files
                  if (e.clipboardData.files && e.clipboardData.files.length > 0) {
                    const pastedFiles = Array.from(e.clipboardData.files);
                    setFiles(prev => processFiles(pastedFiles, prev));
                    return;
                  }
                  
                  // Always paste as PLAIN TEXT only — prevents web-page HTML
                  // (e.g. Wikipedia, Google) from injecting broken markup into the chat
                  const text = e.clipboardData.getData("text/plain");
                  const MAX_CHARS = 65000;
                  const currentTextLength = editorRef.current?.textContent?.length || 0;
                  
                  if (currentTextLength + text.length > MAX_CHARS) {
                    toast.error("Message too long", { description: "The message you're pasting is too long. Try shortening it or sending it in multiple parts." });
                    return;
                  }

                  if (text) {
                    document.execCommand("insertText", false, text);
                  }
                }}
                onKeyDown={(e) => {
                  const MAX_CHARS = 65000;
                  const currentTextLength = editorRef.current?.textContent?.length || 0;
                  
                  // Allow navigation and deletion keys
                  const isAllowedKey = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key) || e.ctrlKey || e.metaKey || e.altKey;
                  
                  if (!isAllowedKey && currentTextLength >= MAX_CHARS) {
                    e.preventDefault();
                    return;
                  }

                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    
                    // Same disabled checks as the send button
                    const isInvalidSize = files.some(f => f.size > (f.type.startsWith('image/') ? 12 * 1024 * 1024 : 150 * 1024 * 1024));
                    const isInvalidState = isSending || isSendingLocal || (!message.replace(/<[^>]*>?/gm, '').trim() && files.length === 0 && !audioBlob) || isRecording || currentTextLength > 65000 || isInvalidSize;
                    
                    if (!isInvalidState) {
                      handleSend();
                    } else if (isInvalidSize) {
                      toast.error("File limit reached", { description: "Please remove files that exceed the size limit before sending." });
                    }
                    return;
                  }
                  if (e.key === " " || e.key === "Enter") {
                    const sel = window.getSelection();
                    if (sel && sel.focusNode && sel.focusNode.nodeType === Node.TEXT_NODE) {
                      const text = sel.focusNode.textContent || "";
                      const offset = sel.focusOffset;
                      const textBeforeCursor = text.slice(0, offset);
                      const match = textBeforeCursor.match(/(?:^|\s)([^\s]+)$/);
                      if (match) {
                        const word = match[1];
                        const isUrl = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i.test(word);
                        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(word);
                        if (isUrl || isEmail) {
                          e.preventDefault();
                          const url = isEmail ? `mailto:${word}` : (word.startsWith('http') ? word : `https://${word}`);
                          const wordStartOffset = offset - word.length;
                          const range = document.createRange();
                          range.setStart(sel.focusNode, wordStartOffset);
                          range.setEnd(sel.focusNode, offset);
                          sel.removeAllRanges();
                          sel.addRange(range);
                          document.execCommand('createLink', false, url);
                          sel.collapseToEnd();
                          if (e.key === " ") {
                            document.execCommand('insertText', false, ' ');
                          } else {
                            document.execCommand('insertParagraph');
                          }
                        }
                      }
                    }
                  }
                }}
                style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
              />
            </div>
            )}

            {isRecording ? (
              <button
                onClick={stopRecording}
                className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shrink-0 mb-0.5 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 animate-pulse"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                disabled={isSending || !!audioBlob}
                className={`p-3 rounded-full bg-accent text-foreground hover:bg-accent/80 transition-colors shrink-0 mb-0.5 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 disabled:opacity-50 ${hasSendable ? 'max-sm:hidden' : ''}`}
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            {!isRecording && (
              <Popover open={isOptionsOpen} onOpenChange={handleOptionsOpenChange}>
                <PopoverTrigger asChild>
                  <button
                    className={`p-3 rounded-full transition-colors shrink-0 mb-0.5 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 ${(scheduledDate || isSilent || priority !== 'normal' || expiresAt) ? 'bg-indigo-500 text-white hover:bg-indigo-600' : 'bg-accent text-foreground hover:bg-accent/80'}`}
                    title="Message Options"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  side="top" 
                  align="end" 
                  className="w-72 p-4 bg-card border border-border shadow-lg rounded-xl"

                >
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm border-b pb-2">Message Options</h4>
                    
                    {/* Priority */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground block">Priority</label>
                      <Select value={priority} onValueChange={setPriority}>
                        <SelectTrigger className="w-full bg-background border border-border h-9 rounded-md text-sm">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Silent Notice */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {isSilent ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-primary" />}
                        Silent Delivery
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={isSilent} onChange={(e) => setIsSilent(e.target.checked)} />
                        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    {/* Expiry */}
                    <div className="space-y-1.5 flex flex-col">
                      <label className="text-xs font-medium text-muted-foreground block">Auto-Delete At (Optional)</label>
                      <NikhilTimeCalendar 
                        value={expiresAt ? new Date(expiresAt) : undefined}
                        onChange={(d) => setExpiresAt(d ? d.toISOString() : "")}
                        placeholder="Select expiry date & time"
                        popDirection="left"
                      />
                    </div>

                    {/* Scheduling */}
                    {canSchedule && (
                      <div className="space-y-1.5 flex flex-col mt-3">
                        <label className="text-xs font-medium text-muted-foreground block">Schedule For (Optional)</label>
                        <NikhilTimeCalendar 
                          value={scheduledDate ? new Date(scheduledDate) : undefined}
                          onChange={(d) => setScheduledDate(d ? d.toISOString() : "")}
                          placeholder="Select schedule date & time"
                          popDirection="left"
                        />
                      </div>
                    )}
                    
                    {(scheduledDate || expiresAt || isSilent || priority !== 'normal') && (
                      <button 
                        onClick={() => {
                          setScheduledDate("");
                          setExpiresAt("");
                          setIsSilent(false);
                          setPriority("normal");
                        }}
                        className="w-full text-xs text-red-500 hover:text-red-600 font-medium py-1 mt-2 border-t pt-2"
                      >
                        Reset Options
                      </button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            <button
              onClick={handleSend}
              disabled={isSending || isSendingLocal || (!message.replace(/<[^>]*>?/gm, '').trim() && files.length === 0 && !audioBlob) || isRecording || message.length > 65000 || files.some(f => f.size > (f.type.startsWith('image/') ? 12 * 1024 * 1024 : 150 * 1024 * 1024))}
              className={`p-3 rounded-full text-primary-foreground transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed mb-0.5 flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 ${hasSendable ? '' : 'max-sm:hidden'} ${scheduledDate ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-primary hover:bg-primary/90'}`}
              title={(isSending || isSendingLocal) ? 'Sending...' : files.some(f => f.size > (f.type.startsWith('image/') ? 12 * 1024 * 1024 : 150 * 1024 * 1024)) ? 'File too large' : scheduledDate ? 'Schedule Message' : 'Send Message'}
            >
              {(isSending || isSendingLocal) ? <Spinner className="w-5 h-5" /> : scheduledDate ? <Clock className="w-5 h-5" /> : <Send className="w-5 h-5 ml-0.5" />}
            </button>
          </>
        )}
      </div>

      {previewFile && (
        <FilePreviewModal
          file={{ src: previewFile, name: previewFile.name, mimeType: previewFile.type }}
          onClose={() => setPreviewFile(null)}
        />
      )}
      {/* Modals and Overlays */}
      <ImageCropperModal
        isOpen={editingFileIndex !== null && editingFileSrc !== null}
        onClose={() => {
          if (editingFileSrc) URL.revokeObjectURL(editingFileSrc);
          setEditingFileIndex(null);
          setEditingFileSrc(null);
        }}
        imageSrc={editingFileSrc || ""}
        onCropComplete={handleCropComplete}
        title="Edit Image"
      />

    </div>
  );
}
