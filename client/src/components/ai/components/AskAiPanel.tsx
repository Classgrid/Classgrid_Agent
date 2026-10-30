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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK) // TRIGGER VERCEL
// Redeploy: restored to 475cd1e2 (live streaming + fast typing)
/*
 * // Trigger Vercel Build - Force Re-Deploy
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

import React, { useEffect, useMemo, useRef, useState, useCallback, memo, useContext } from "react";
import { useParams } from "react-router-dom";
import { SidebarTrigger } from "@/components/marketing_ui/sidebar";
import hljs from "highlight.js";
import "highlight.js/styles/github-dark.css";
import { ExpandedInputModal } from './ExpandedInputModal';
import { AiHubModal } from "./AiHubModal";
import { InsufficientCreditsCard } from "./InsufficientCreditsCard";
import { WorkspacePanel } from "./workspace/WorkspacePanel";
import { SchedulePage } from "./SchedulePage";
import { ScheduleDetailPage } from "./ScheduleDetailPage";
import { LibraryPage } from "./LibraryPage";
import ReactDOM from "react-dom";

import { AiChartRenderer } from "./AiChartRenderer";
import { ImageGeneration, type ImageGenerationStatus } from "./ImageGeneration";
import { DangerConfirmDialog } from '@/components/marketing_ui/danger-confirm-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/marketing_ui/tooltip";
import JSON5 from 'json5';
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUp,
  BarChart3,
  Bot,
  Check,
  ClipboardList,
  Copy,
  CreditCard,
  ChevronRight,
  ArrowDown,
  File,
  FileImage,
  FileText,
  FileSpreadsheet,
  FileIcon,
  Globe2,
  HelpCircle,
  LayoutDashboard,
  MessageCircleMore,
  Paperclip,
  School,
  Search,
  Sparkles,
  Square,
  Mic,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  X,
  Plus,
  Pencil,
  Share,
  MoreHorizontal,
  Pin,
  Info,
  Lightbulb,
  MessageSquareWarning,
  AlertTriangle,
  OctagonAlert,
  Loader2,
  UploadCloud,
  Server,
  Mail,
  Calendar,
  HardDrive,
  Users,
  Video,
  Music,
  CornerDownRight,
  Layers,
  ListTodo,
  type LucideIcon,
} from "lucide-react";

const CustomSlidersIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 8h11" />
    <circle cx="16" cy="8" r="2" />
    <path d="M18 8h3" />
    <path d="M3 16h3" />
    <circle cx="8" cy="16" r="2" />
    <path d="M10 16h11" />
  </svg>
);

import { Button } from "./ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/marketing_ui/dropdown-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { cn } from "../utils";
import { CodeBlockClient } from "./CodeBlockClient";
import { ModelPicker, useSelectedModel, MODEL_GROUPS, AUTO_MODEL_ID } from "./ModelPicker";
import { TypingGreeting } from "./AgentHomeExtras";
import { toast } from "sonner";
import FilePreviewModal, { type FilePreviewSource } from "./FilePreviewModal";
import { DocsImageViewer } from "./DocsImageViewer";
import { SourceChip, type ChatSource } from "./SourceChip";
import { AnswerImage, SourceCards } from "./AnswerImages";
import { ReviewSummary, ScoreBreakdown } from "./ReviewBlocks";
import { PointsList, RatingCard } from "./PointsBlocks";
import { ClockBlock } from "./ClockBlock";
import { WeatherCard, MarketCard, MapCard, CountdownCard } from "./LiveCards";
import { FollowUps, ActionCards, ReportCard, Timetable, AttendanceCalendar, StudyPlanner } from "./StudyBlocks";
import { WidgetBlock } from "./WidgetBlock";
import { ScrollSpyTOC, MobileTOCButton, QuestionDots, messageTime } from "./TOC";
import { StudioChatMenu, OpenInProjectButton, StudioOverviewButton } from "./StudioChatMenu";
import AIThinkingBlock from "./AIThinkingBlock";
import RichChatInput from "./RichChatInput";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import remarkGithubAlerts from "remark-github-alerts";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/marketing_ui/carousel";

import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { MermaidViewer } from "./MermaidViewer";
import { PdfAttachment } from "@/features/chat/components/PdfAttachment";
import { CopyBlockClient } from "./CopyBlockClient";
import { ApprovalCard } from "./ApprovalCard";
import { WorkflowAccordion } from "./stepper/WorkflowAccordion";

// â”€â”€â”€ Agent Stepper Components â”€â”€â”€
import { AgentStepper } from "./stepper/AgentStepper";
import { AgentStepAccordion } from "./stepper/AgentStepAccordion";
import { ThoughtStepView } from "./stepper/ThoughtStepView";
import { TerminalToolView } from "./stepper/TerminalToolView";
import { DatabaseQueryView } from "./stepper/DatabaseQueryView";
import { FileActionView } from "./stepper/FileActionView";
import { WebSearchView } from "./stepper/WebSearchView";
import { MasterWorkflowWrapper } from "./stepper/MasterWorkflowWrapper";
import { OpenPageView } from "./stepper/OpenPageView";
import { EmailActionView } from "./stepper/EmailActionView";
import { DocumentGenerationView } from "./stepper/DocumentGenerationView";
import { ShareGridPanel, useShareGrid, GridSenderTag, GridJoinLine, GridReplyingLine } from "./share-grid/ShareGridPanel";
import { KnowledgeBaseSearchView } from "./stepper/KnowledgeBaseSearchView";
import { CdnUploadView } from "./stepper/CdnUploadView";
import { EmailSentView } from "./stepper/EmailSentView";
import { ToolResultStep } from "./stepper/tool-results/ToolResultStep";
import { IncognitoBar, IncognitoButton, loadIncognitoChat, loadIncognitoSessionId, saveIncognitoChat, clearIncognitoChat } from "./IncognitoMode";
import { IncognitoTransition, type IncognitoRun } from "./IncognitoTransition";
import { SpotifyDisplay } from "./answer-cards/spotify";
import { describeStep } from "./stepper/tool-results/describeStep";
import { specialStepTitle, emailTitle } from "./stepper/tool-results/stepTitles";
import { StepWorkingContext } from "./stepper/ShimmerText";
import { ImageReadStep } from "./stepper/tool-results/ImageReadStep";
import { AudioTranscribeStep } from "./stepper/tool-results/AudioTranscribeStep";
import { FileMentionChip, parseFileMention, parseProjectLink, FilesChangedSummary, ProjectEditStep, ProjectExploreGroup, ProjectPushStep, ProjectRunChanges, ProjectHelpersStep, TerminalStep, PROJECT_BACKGROUND_TOOLS, PROJECT_EDIT_TOOLS, PROJECT_EXPLORE_TOOLS } from "./stepper/ProjectToolSteps";
import { CombinedReasoningBlock } from "./stepper/CombinedReasoningBlock";
import { AiFeedbackModal } from "./AiFeedbackModal";
import { ChatEndedCard } from "./ChatEndedCard";

// â”€â”€â”€ SDK-local type definitions & stubs â”€â”€â”€
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

type PageContext = {
  path?: string;
  title?: string;
  summary?: string;
  [key: string]: any;
};



import { usePostHog } from 'posthog-js/react';
import { fetchWithRescue } from "@/lib/rescue";

// Fetch real presigned URL for R2 uploads
// Chats known to be ended (id -> end reason), so an ended chat shows its card at once on refresh or open,
// while every other chat shows the input box straight away.
const ENDED_CHATS_KEY = "classgrid:ai-ended-chats";
function readEndedChats(): Record<string, string | null> {
  try { return JSON.parse(localStorage.getItem(ENDED_CHATS_KEY) || "{}") || {}; } catch { return {}; }
}
function rememberEndedChat(id: string, reason: string | null | undefined) {
  try {
    const all = readEndedChats();
    if (reason === undefined) { if (!(id in all)) return; delete all[id]; } else { all[id] = reason; }
    localStorage.setItem(ENDED_CHATS_KEY, JSON.stringify(all));
  } catch { /* storage unavailable: the server check still applies */ }
}

async function getPresignedUrlForAskAiFile(name: string, type: string, size: number): Promise<any> {
  try {
    const endpoint = typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/ai/upload"
      : "/api/ai/upload";
    const res = await fetchWithRescue(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ fileName: name, mimeType: type, size: size })
    });
    return await res.json();
  } catch (err) {
    return { error: "Network error getting upload URL" };
  }
}
async function checkAiUploadRateLimit(_count: number): Promise<{ allowed: boolean; reason?: string }> {
  return { allowed: true };
}
async function recordAiFilesSent(_count: number): Promise<void> { }

const LiveWaveform = ({ stream }: { stream: MediaStream | null }) => {
  const [bars, setBars] = useState<number[]>(Array(100).fill(4));

  useEffect(() => {
    if (!stream) {
      setBars(Array(100).fill(4));
      return;
    }

    let audioCtx: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array;
    let animationFrame: number;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 128;
      dataArray = new Uint8Array(analyser.frequencyBinCount);

      const update = () => {
        analyser.getByteFrequencyData(dataArray);

        // Calculate average volume to ensure it's completely flat when silent
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / dataArray.length;

        const newBars = [];

        for (let i = 0; i < 100; i++) {
          if (avgVolume > 2) {
            // Scatter the 30 active voice frequency bins across the 100 bars.
            // This means different pitches/words will trigger different parts of the bar
            // (sometimes left, sometimes right, sometimes middle) naturally!
            const binIndex = (i * 7) % 30;
            const value = dataArray[binIndex] || 0;
            const height = 4 + (value / 255) * 18;
            newBars.push(height);
          } else {
            // Silence
            newBars.push(4);
          }
        }
        setBars(newBars);
        animationFrame = requestAnimationFrame(update);
      };
      update();
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (audioCtx) audioCtx.close().catch(() => { });
    };
  }, [stream]);

  return (
    <div className="flex-1 flex items-center justify-start gap-[3px] overflow-hidden px-2 h-8">
      {bars.map((height, i) => (
        <div
          key={i}
          className="w-1 bg-foreground rounded-full shrink-0"
          style={{ height: `${height}px`, opacity: height > 5 ? 0.8 : 0.4 }}
        />
      ))}
    </div>
  );
};

// Project Mode: drag the AI panel's left edge to make it wider (never smaller than the normal 400 px). While
// dragging, a clear layer covers the page so the code editor iframe can't take the mouse.
function OverlayDragHandle({ onChange, onResizingChange }: { onChange: (w: number) => void; onResizingChange?: (r: boolean) => void }) {
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => onChange(Math.round(Math.min(Math.max(window.innerWidth - e.clientX, 400), Math.max(400, window.innerWidth * 0.6))));
    const up = () => setDragging(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", up);
    onResizingChange?.(true);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", up);
      onResizingChange?.(false);
    };
  }, [dragging, onChange, onResizingChange]);
  return (
    <>
      <div
        onPointerDown={(e) => { if (e.button === 0) { e.preventDefault(); setDragging(true); } }}
        className="group absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize touch-none"
        title="Drag to make the panel wider"
      >
        <div className={cn("mx-auto h-full w-px transition-colors", dragging ? "bg-foreground/40" : "bg-transparent group-hover:bg-foreground/25")} />
      </div>
      {dragging && ReactDOM.createPortal(<div className="fixed inset-0 z-[200] cursor-col-resize select-none" />, document.body)}
    </>
  );
}

type AskAiPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageContext?: PageContext;
  variant?: "in-flow" | "overlay" | "full-page";
  hideClearChat?: boolean; // e.g. Project Mode: no one-click way to wipe the chat
  overlayWidth?: number; // overlay only: the panel's width (Project Mode drag)
  onOverlayWidthChange?: (width: number) => void;
  onOverlayResizingChange?: (resizing: boolean) => void;
  initialMessages?: ChatMessage[];
  autoFocus?: boolean;
  readOnly?: boolean;
  inputHeader?: React.ReactNode;
  studioMenu?: boolean; // Studio Mode with its right pane hidden: the chat's ⋯ menu shows at the top right
};

type AiAttachment = {
  name: string;
  url: string;
  mimeType: string;
  size: number;
  content?: string;
};

type UIFileAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File; // Only present for live uploads, stripped for localStorage
  status: "uploading" | "done" | "error";
  url?: string;
};

export type AgentStep =
  | { id: string, type: "thought", title: string, details: string, status: "loading" | "success" }
  | { id: string, type: "tool", tool: string, args: any, result?: string, status: "loading" | "success" | "error", helpers?: { state: string, actions: { id: string, tool: string, args: any, result?: string, status: string }[], text: string }[] };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thought?: string;
  steps?: AgentStep[];
  /** How long the agent worked on this reply (ms), for the "Worked for X sec" summary */
  workedMs?: number;
  checkpoint?: string; // Project Mode: snapshot before this answer (Review / Reject / Undo)
  /** Web pages the answer cites as [n] (search_web) */
  sources?: ChatSource[];
  typing?: boolean;
  tocSummary?: string;
  fileUrls?: string[];
  createdAt: number;
  contextUrl?: string;
  contextTitle?: string;
  attachments?: AiAttachment[];
  hidden?: boolean;
  /** Share Grid: who sent this user message (empty for old messages and for the AI) */
  senderEmail?: string;
};

export type QueuedMessage = {
  id: string;
  text: string;
  attachedFiles: UIFileAttachment[];
  pastedTexts: string[];
  isEdit?: boolean;
  timestamp?: number;
};

type ListItem = {
  indexLabel?: string;
  text: string;
};

type StructuredBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: ListItem[] }
  | { type: "section"; title: string; paragraphs: string[]; items?: ListItem[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; code: string; language: string };

function suggestedQuestionsForPage(pageContext?: PageContext, userRole?: string) {
  // We have removed all hardcoded suggested questions.
  // In the future, these can be fetched from the backend dynamically.
  return [];
}

const panelTransition = {
  duration: 0.36,
  ease: [0.22, 1, 0.36, 1],
} as const;

const SECTION_ICON_RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /admission|enroll/i, icon: FileText },
  { match: /attendance/i, icon: BarChart3 },
  { match: /exam|result|quiz/i, icon: ClipboardList },
  { match: /fee|payment|billing/i, icon: CreditCard },
  { match: /communicat|chat|notice/i, icon: MessageCircleMore },
  { match: /website|domain|tenant/i, icon: Globe2 },
  { match: /dashboard|analytics|report/i, icon: LayoutDashboard },
  { match: /school|college|institute|coaching/i, icon: School },
  { match: /classgrid/i, icon: Sparkles },
  { match: /competitor|vs|comparison/i, icon: Globe2 },
];

function formatMessageTime(timestamp: number) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

function sanitizeAssistantText(text: string) {
  const normalized = text.replace(/\r/g, "");
  const cleanedLines = normalized.split("\n").map((line) => {
    let cleaned = line
      .replace(/__(.*?)__/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^#{1,6}\s*/g, "")
      .replace(/^>\s*/g, "");

    // Protect **bold** markers by temporarily replacing them
    cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "%%BOLD_START%%$1%%BOLD_END%%");
    // Now strip ALL remaining single asterisks (italic markers like *"text"*)
    cleaned = cleaned.replace(/\*/g, "");
    // Restore **bold** markers
    cleaned = cleaned.replace(/%%BOLD_START%%/g, "**").replace(/%%BOLD_END%%/g, "**");

    return cleaned.replace(/\s+$/g, "");
  });

  return cleanedLines
    .join("\n")
    .replace(/^-{3,}$/gm, "")         // strip markdown horizontal rules (---)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarkdownForPreview(content: string) {
  if (!content) return "";
  return content
    .replace(/^#{1,6}\s+/gm, "")           // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")        // bold
    .replace(/\*(.+?)\*/g, "$1")            // italic
    .replace(/`([^`]+)`/g, "$1")            // inline code
    .replace(/```[\s\S]*?```/g, "")          // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/\n+/g, " ")                    // collapse newlines to space
    .trim();
}

function splitLongParagraph(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= 170) return [trimmed];

  const sentences = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1) return [trimmed];

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((`${current} ${sentence}`.trim()).length <= 170) {
      current = `${current} ${sentence}`.trim();
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function extractInlineNumberedItems(text: string) {
  const matches = [...text.matchAll(/(\d+)\.\s+(.+?)(?=(?:\s+\d+\.\s)|$)/g)];
  if (matches.length < 2) return null;

  return matches.map((match) => ({
    indexLabel: `${match[1]}.`,
    text: match[2].trim(),
  }));
}

function parseListBlock(block: string) {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const inlineItems = lines.length === 1 ? extractInlineNumberedItems(lines[0]) : null;
  if (inlineItems) return inlineItems;

  const rows: ListItem[] = [];

  for (const line of lines) {
    const numbered = line.match(/^(\d+)\.\s+(.+)$/);
    if (numbered) {
      rows.push({ indexLabel: `${numbered[1]}.`, text: numbered[2].trim() });
      continue;
    }

    const bullet = line.match(/^[-*\u2022]\s+(.+)$/);
    if (bullet) {
      rows.push({ text: bullet[1].trim() });
      continue;
    }

    return null;
  }

  return rows.length ? rows : null;
}

function isLikelyHeading(title: string) {
  const trimmed = title.trim().replace(/:$/, "");
  if (!trimmed) return false;
  if (trimmed.startsWith("|")) return false; // Never treat a table row as a heading

  if (SECTION_ICON_RULES.some((rule) => rule.match.test(trimmed))) return true;

  return /^[A-Za-z][A-Za-z\s/&-]{2,50}$/.test(trimmed) && trimmed.split(/\s+/).length <= 6;
}

function parseSectionBlock(block: string): StructuredBlock | null {
  const lines = block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return null;

  const firstLine = lines[0];
  const headingWithBody = firstLine.match(/^([^:]{2,60}):\s+(.+)$/);
  if (headingWithBody && isLikelyHeading(headingWithBody[1])) {
    const paragraphs = splitLongParagraph(headingWithBody[2]);
    return {
      type: "section",
      title: headingWithBody[1].trim(),
      paragraphs,
    };
  }

  if (isLikelyHeading(firstLine) && lines.length > 1) {
    const bodyLines = lines.slice(1);
    const bodyText = bodyLines.join("\n");

    // Check if the body is a numbered/bullet list â€” preserve list structure
    const listItems = parseListBlock(bodyText);
    if (listItems) {
      return {
        type: "section",
        title: firstLine.replace(/:$/, "").trim(),
        paragraphs: [],
        items: listItems,
      };
    }

    const body = bodyLines.join(" ");
    return {
      type: "section",
      title: firstLine.replace(/:$/, "").trim(),
      paragraphs: splitLongParagraph(body),
    };
  }

  return null;
}

function parseTableBlock(block: string) {
  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 3) return null;

  // Find the first line that looks like a table header (contains |)
  let headerIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("|") && i + 1 < lines.length && /^[\|\-\s:]+$/.test(lines[i + 1])) {
      headerIndex = i;
      break;
    }
  }

  if (!lines[headerIndex].includes("|")) return null;
  if (headerIndex + 1 >= lines.length) return null;
  if (!/^[\|\-\s:]+$/.test(lines[headerIndex + 1])) return null;

  const extractCells = (line: string) => {
    const parts = line.split("|");
    if (parts.length > 0 && parts[0].trim() === "") parts.shift();
    if (parts.length > 0 && parts[parts.length - 1].trim() === "") parts.pop();
    return parts.map(c => c.trim());
  };

  const headers = extractCells(lines[headerIndex]);
  if (headers.length === 0) return null;

  const rows = lines.slice(headerIndex + 2).map(extractCells).filter(r => r.length > 0);
  if (rows.length === 0) return null;

  return { type: "table" as const, headers, rows };
}

function buildStructuredBlocks(text: string): StructuredBlock[] {
  const blocks: StructuredBlock[] = [];
  const parts = text.split(/(```[\s\S]*?(?:```|$))/g);

  for (const part of parts) {
    if (part.startsWith("```")) {
      const match = part.match(/^```([\w-]*)\n([\s\S]*?)(?:```|$)/);
      if (match) {
        blocks.push({
          type: "code",
          language: match[1].trim(),
          code: match[2],
        });
      } else {
        blocks.push({
          type: "code",
          language: "",
          code: part.replace(/```/g, "").trim(),
        });
      }
      continue;
    }

    const cleaned = sanitizeAssistantText(part);
    if (!cleaned) continue;

    const rawBlocks = cleaned.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);
    for (const rawBlock of rawBlocks) {
      const listItems = parseListBlock(rawBlock);
      if (listItems) {
        blocks.push({ type: "list", items: listItems });
        continue;
      }

      const tableBlock = parseTableBlock(rawBlock);
      if (tableBlock) {
        blocks.push(tableBlock);
        continue;
      }

      const sectionBlock = parseSectionBlock(rawBlock);
      if (sectionBlock) {
        blocks.push(sectionBlock);
        continue;
      }

      for (const paragraph of splitLongParagraph(rawBlock.trim())) {
        if (paragraph) {
          blocks.push({ type: "paragraph", text: paragraph });
        }
      }
    }
  }

  return blocks;
}

function getSectionIcon(title: string) {
  const match = SECTION_ICON_RULES.find((rule) => rule.match.test(title));
  return match?.icon ?? ChevronRight;
}

// Saved attachments keep only their URL, so the type comes from the file ending (query strings ignored).
// Every type the upload button accepts is listed, so reopened chats show the right card and preview
// (the old check only knew images and PDF, and its image test had a doubled backslash and never matched).
const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  bmp: "image/bmp", avif: "image/avif", heic: "image/heic", heif: "image/heif", ico: "image/x-icon",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv", txt: "text/plain", md: "text/markdown", json: "application/json",
  mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mkv: "video/x-matroska", avi: "video/x-msvideo",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", aac: "audio/aac", flac: "audio/flac",
};
function mimeFromUrl(url: string): string {
  const path = (String(url || "").split(/[?#]/)[0] || "").toLowerCase();
  const ext = path.includes(".") ? path.split(".").pop() || "" : "";
  return MIME_BY_EXTENSION[ext] || "application/octet-stream";
}

function TypingDots({ reducedMotion }: { reducedMotion: boolean }) {
  const dotClass = "h-1.5 w-1.5 rounded-full bg-muted-foreground";

  if (reducedMotion) {
    return (
      <div className="flex items-center gap-1">
        <span className={dotClass} />
        <span className={dotClass} />
        <span className={dotClass} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className={dotClass}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.14 }}
        />
      ))}
    </div>
  );
}

function SearchingSpinner({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) {
    return <Search className="h-3.5 w-3.5 text-emerald-400" />;
  }

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
    >
      <Globe2 className="h-3.5 w-3.5 text-emerald-400" />
    </motion.div>
  );
}

function isSafeAssistantHref(href: string) {
  return href.startsWith("/") || href.startsWith("#") || /^https?:\/\//i.test(href);
}

function renderInlineText(rawText: string) {
  // Pre-process to fix **[Link](url)** being caught as bold instead of a link
  const text = rawText.replace(/\*\*(\[[^\]]+\]\s*\((?:https?:\/\/|\/|#)[^\s)]*\))\*\*/g, "$1");

  const pattern = /(\[([^\]]+)\]\s*\(((?:https?:\/\/|\/|#)[^\s)]*)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    const fullMatch = match[0];
    const label = match[2];
    const href = match[3];
    const boldText = match[4];
    const inlineCode = match[5];

    if (label && href && isSafeAssistantHref(href)) {
      const external = /^https?:\/\//i.test(href);
      // Strip any bold asterisks that might be inside the label: [**Book Demo**](...)
      const cleanLabel = label.replace(/\*\*/g, "");

      nodes.push(
        <a
          key={`link-${match.index}`}
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-4 transition-colors hover:text-blue-500"
        >
          {cleanLabel}
        </a>
      );
    } else if (boldText) {
      nodes.push(
        <strong key={`bold-${match.index}`} className="font-semibold text-slate-900 dark:text-white">
          {boldText}
        </strong>
      );
    } else if (inlineCode) {
      nodes.push(
        <code
          key={`code-${match.index}`}
          className="font-mono text-[13px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-md mx-0.5"
        >
          {inlineCode}
        </code>
      );
    } else {
      nodes.push(<span key={`raw-${match.index}`}>{fullMatch}</span>);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}

function MessageActions({ content, messageId, onReply, time }: { content: string; messageId: string, onReply?: () => void, time?: number }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`classgrid:ai-feedback:${messageId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.feedback === "up" || parsed.feedback === "down") {
          setFeedback(parsed.feedback);
        }
      }
    } catch (e) { }
  }, [messageId]);

  async function handleCopy() {
    try {
      // Strip ALL markdown for clean plain-text copy (like Notion)
      const plainText = content
        .replace(/^#{1,6}\s+/gm, "")           // headings
        .replace(/\*\*(.+?)\*\*/g, "$1")        // bold
        .replace(/\*(.+?)\*/g, "$1")            // italic
        .replace(/`([^`]+)`/g, "$1")            // inline code
        .replace(/```[\s\S]*?```/g, "")          // code blocks
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
        .replace(/^[\-\*]\s+/gm, "• ")          // bullets → clean bullet
        .replace(/^\d+\.\s+/gm, (m) => m)       // keep numbered lists
        .replace(/^>\s+/gm, "")                 // blockquotes
        .replace(/\|[^\n]+\|/g, "")             // table rows
        .replace(/^[\-:| ]+$/gm, "")            // table separators
        .replace(/\n{3,}/g, "\n\n")             // collapse blank lines
        .trim();
      await navigator.clipboard.writeText(plainText);
      toast.success("Message copied to clipboard!");
      posthog?.capture("ai_message_copied", {
        message_id: messageId,
        content_preview: content.substring(0, 100)
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Clipboard API may not be available in some contexts
    }
  }

  function handleFeedback(type: "up" | "down") {
    if (type === "down") {
      setIsFeedbackModalOpen(true);
      return;
    }

    const newFeedback = type === feedback ? null : type;
    setFeedback(newFeedback);

    try {
      if (newFeedback) {
        localStorage.setItem(`classgrid:ai-feedback:${messageId}`, JSON.stringify({ feedback: newFeedback }));
      } else {
        localStorage.removeItem(`classgrid:ai-feedback:${messageId}`);
      }
    } catch (e) { }

    if (newFeedback === "up") {
      posthog?.capture("ai_message_thumbs_up", {
        message_id: messageId,
        content_preview: content.substring(0, 100)
      });
    }

    if (newFeedback) {
      const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env.VITE_API_URL || "https://api.classgrid.in"
        : "";

      const token = localStorage.getItem("token");
      fetchWithRescue(`${endpointPrefix}/api/ai/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messageId,
          type: "positive",
          text: "" // No text input implemented for positive right now
        })
      }).catch(console.error);
    }
  }

  const submitDetailedFeedback = async (text: string, files: File[]) => {
    setIsSubmittingFeedback(true);
    try {
      let fileUrls: string[] = [];

      // Upload files if any
      if (files.length > 0) {
        for (const file of files) {
          const result = await getPresignedUrlForAskAiFile(file.name, file.type, file.size);
          if (result.error) {
            toast.error(`Failed to get upload URL for ${file.name}`);
            continue;
          }
          if (result.uploadUrl === "mock") {
            await new Promise(r => setTimeout(r, 1000));
            fileUrls.push(result.publicUrl);
          } else {
            const uploadRes = await fetch(result.uploadUrl, {
              method: "PUT",
              body: file,
              headers: { "Content-Type": file.type }
            });
            if (!uploadRes.ok) throw new Error("Upload to R2 failed");
            fileUrls.push(result.publicUrl);
          }
        }
      }

      setFeedback("down");
      try {
        localStorage.setItem(`classgrid:ai-feedback:${messageId}`, JSON.stringify({ feedback: "down" }));
      } catch (e) { }

      posthog?.capture("ai_message_thumbs_down", {
        message_id: messageId,
        content_preview: content.substring(0, 100),
        has_text: !!text,
        num_attachments: files.length
      });

      const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env.VITE_API_URL || "https://api.classgrid.in"
        : "";

      const token = localStorage.getItem("token");
      await fetchWithRescue(`${endpointPrefix}/api/ai/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          messageId,
          type: "negative",
          text,
          fileUrl: fileUrls.length > 0 ? fileUrls.join(",") : null
        })
      });

      toast.success("Feedback submitted. Thank you!");
      setIsFeedbackModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <>
      <div className="mt-2 flex items-center gap-1">
        {time ? <span className="order-last ml-auto pr-1 text-[12px] text-muted-foreground/80 group-hover/answer:text-muted-foreground transition-colors duration-200">{messageTime(time)}</span> : null}
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer",
            copied
              ? "bg-emerald-500/15 text-emerald-500"
              : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
          )}
          title={copied ? "Copied!" : "Copy response"}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => handleFeedback("up")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer",
            feedback === "up"
              ? "bg-emerald-500/15 text-emerald-500"
              : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
          )}
          title="Helpful"
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        {onReply && (
          <button
            type="button"
            onClick={onReply}
            className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer text-muted-foreground/60 hover:bg-muted hover:text-foreground"
            title="Reply to message"
          >
            <CornerDownRight className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => handleFeedback("down")}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer",
            feedback === "down"
              ? "bg-red-500/15 text-red-400"
              : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
          )}
          title="Not helpful"
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {isFeedbackModalOpen && (
        <AiFeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          onSubmit={submitDetailedFeedback}
          isSubmitting={isSubmittingFeedback}
        />
      )}
    </>
  );
}

const preprocessLaTeX = (content: string) => {
  if (!content) return "";
  let processed = content
    .replace(/\\\[/g, () => '$$')
    .replace(/\\\]/g, () => '$$')
    .replace(/\\\(/g, () => '$')
    .replace(/\\\)/g, () => '$');

  // Strip code block wrappers for math/science to let KaTeX handle them normally
  processed = processed.replace(/```(?:math|science|latex|equation)\n?([\s\S]*?)```/gi, (match, p1) => {
    return `$$\n${p1.trim()}\n$$`;
  });

  // Strip code block wrappers for links to let GFM auto-link them normally
  processed = processed.replace(/```links?\n?([\s\S]*?)```/gi, (match, p1) => {
    return p1.trim();
  });

  return escapeMoneyDollars(processed);
};

// "$850B) and Anthropic ($380B" was read as inline maths between the two $ signs and drawn letter by letter.
// A $ that is money ($ + number, optional K/M/B/T/million/billion/crore/lakh, then a space, punctuation or the
// end) becomes \$ so it shows as a plain dollar sign. Maths such as $2^n$, $2x+1$ or $E=mc^2$ doesn't match
// (the number is followed by ^, a letter or another $), and code blocks / inline code are left as they are.
// Single, non-nested repeats only (see TAG_OR_CSS_RE below for why).
const MONEY_DOLLAR_RE = /(^|[\s([{>:;,*_~])\$(?=\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|b|bn|t|K|M|B|Bn|T|million|billion|trillion|crore|lakh)\b)?(?:$|[\s).,;:!?\]}*_~/-]))/g;
const CODE_SPANS_RE = /(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g;
function escapeMoneyDollars(text: string): string {
  if (!text.includes("$")) return text;
  return text
    .split(CODE_SPANS_RE)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(MONEY_DOLLAR_RE, "$1\\$")))
    .join("");
}

// Some models draft whole code blocks (e.g. widget cards) in their thinking. The thinking panel shows one
// "Drafting code…" line for each such stretch instead of a wall of raw code.
const DRAFTING_LINE = "✏️ Drafting code…";
// Single, non-nested repeats only: a nested one like ([\w-]+(\s*[\w-]+)*) backtracks forever on plain sentences and froze the page
const TAG_OR_CSS_RE = /^\s*(?:<\/?[a-z][\w-]*[\s>/]|[.#]?[\w-][\w\s.#:,>+~*="'()[\]-]*\{[^}]*:)/i;
const JS_START_RE = /^\s*(?:const|let|var|function|document\.|return|if\s*\(|for\s*\(|\w+\.\w+\s*=)/;
const CLOSERS_RE = /^\s*[})\];,]+\s*$/;
function hideCodeInThought(text: string): string {
  const withoutFences = text.replace(/```[\s\S]*?(?:```|$)/g, `\n${DRAFTING_LINE}\n`);
  const out: string[] = [];
  for (const line of withoutFences.split("\n")) {
    const isCode = line === DRAFTING_LINE || TAG_OR_CSS_RE.test(line) || CLOSERS_RE.test(line)
      || (JS_START_RE.test(line) && /[;{}=]/.test(line));
    if (isCode) {
      if (out[out.length - 1] !== DRAFTING_LINE) out.push(DRAFTING_LINE);
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}

// A flashcard slide's answer starts at a line like "Answer:", "**Answer:**" or "💡 **Answer:** ..."
const FLASHCARD_ANSWER_RE = /^[ \t]*(?:[^\w\s*#>]+[ \t]*)?(?:[*_]{1,2})?A(?:ns)?(?:wer)?(?:[*_]{1,2})?[ \t]*[:：]/im;

// One slide: plain slides render as before; flashcards keep the answer hidden until "Show answer"
const CarouselSlide = ({ slide, components }: { slide: string, components: any }) => {
  const [shown, setShown] = React.useState(false);
  const match = FLASHCARD_ANSWER_RE.exec(slide);
  const question = match ? slide.slice(0, match.index).trim() : slide;
  const answer = match ? slide.slice(match.index).trim() : "";
  const render = (text: string) => (
    <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm, remarkGithubAlerts]} rehypePlugins={[rehypeKatex]} components={components}>
      {text}
    </ReactMarkdown>
  );
  if (!match || !question) return <>{render(slide)}</>;
  return (
    <>
      {render(question)}
      {shown && render(answer)}
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className={`mt-2 w-full rounded-full px-4 py-2.5 text-[15px] font-medium transition-colors ${shown ? "border border-black/15 hover:bg-black/[0.04] dark:border-white/20 dark:hover:bg-white/[0.06]" : "bg-[#2C2C2B] text-white hover:bg-black dark:bg-[#F0EFED] dark:text-[#1A1A19] dark:hover:bg-white"}`}
      >
        {shown ? "Hide answer" : "Show answer"}
      </button>
    </>
  );
};

// MarkdownCarousel Component for rendering swipeable flashcards/slides inside the chat
const MarkdownCarousel = memo(({ content, components }: { content: string, components: any }) => {
  const rawSlides = content.split(/(?:<!--\s*slide\s*-->|^-{3,}$)/m);
  const slides = rawSlides.map(s => s.trim()).filter(s => s.length > 0);

  if (slides.length === 0) return null;

  return (
    <div className="w-full my-6 not-prose">
      <Carousel opts={{ align: "start", loop: true }} className="w-full">
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={index}>
              <div className="p-1 h-full">
                <div className="bg-white dark:bg-[#2C2C2C] border border-slate-200 dark:border-white/10 rounded-xl p-6 min-h-[200px] h-full shadow-sm flex flex-col justify-center">
                  <div className="space-y-4 text-[16px] leading-[24px] overflow-visible break-words max-w-none">
                    <CarouselSlide slide={slide} components={components} />
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="flex items-center justify-center gap-2 mt-4 relative">
          <CarouselPrevious className="relative inset-0 translate-x-0 translate-y-0 h-8 w-8" />
          <div className="text-xs text-muted-foreground font-medium">Swipe</div>
          <CarouselNext className="relative inset-0 translate-x-0 translate-y-0 h-8 w-8" />
        </div>
      </Carousel>
    </div>
  );
});

// We need to define `pre` to just return children because we handle block code fully inside the `code` component.
// Otherwise, Tailwind's typography plugin will wrap our custom cards in a dark <pre> box and force monospace.
const MarkdownComponents = {
  blockquote({ className, children, ...props }: any) {
    if (className?.includes("markdown-alert")) {
      const type = className.replace("markdown-alert", "").trim().replace("markdown-alert-", "");
      let icon = null;
      let colorClass = "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800/50 dark:text-slate-300";

      if (type === "note") {
        icon = <Info className="w-5 h-5 text-blue-500" />;
        colorClass = "border-blue-500 bg-blue-50/50 text-blue-900 dark:border-blue-500/50 dark:bg-blue-900/20 dark:text-blue-200";
      } else if (type === "tip") {
        icon = <Lightbulb className="w-5 h-5 text-emerald-500" />;
        colorClass = "border-emerald-500 bg-emerald-50/50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-900/20 dark:text-emerald-200";
      } else if (type === "important") {
        icon = <MessageSquareWarning className="w-5 h-5 text-purple-500" />;
        colorClass = "border-purple-500 bg-purple-50/50 text-purple-900 dark:border-purple-500/50 dark:bg-purple-900/20 dark:text-purple-200";
      } else if (type === "warning") {
        icon = <AlertTriangle className="w-5 h-5 text-amber-500" />;
        colorClass = "border-amber-500 bg-amber-50/50 text-amber-900 dark:border-amber-500/50 dark:bg-amber-900/20 dark:text-amber-200";
      } else if (type === "caution") {
        icon = <OctagonAlert className="w-5 h-5 text-red-500" />;
        colorClass = "border-red-500 bg-red-50/50 text-red-900 dark:border-red-500/50 dark:bg-red-900/20 dark:text-red-200";
      }

      return (
        <div className={`my-5 border-l-4 rounded-r-lg px-5 py-4 ${colorClass}`} {...props}>
          <div className="flex items-center gap-2 font-semibold mb-2">
            {icon}
            <span className="capitalize">{type}</span>
          </div>
          <div className="text-[15px] leading-relaxed [&>p]:m-0 [&>p]:mb-2 [&>p:last-child]:mb-0">
            {children}
          </div>
        </div>
      );
    }

    return (
      <blockquote className="border-l-[3px] border-slate-300 dark:border-[#4B4B4B] pl-4 my-4 text-slate-700 dark:text-[#ececf1] bg-transparent" {...props}>
        {children}
      </blockquote>
    );
  },
  table({ children, ...props }: any) {
    return (
      <div className="w-full pb-2 overflow-x-auto my-4">
        <div className="rounded-md border border-slate-200 dark:border-white/10 min-w-[500px]">
          <table className="w-full text-sm" {...props}>{children}</table>
        </div>
      </div>
    );
  },
  thead({ children, ...props }: any) {
    return <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10" {...props}>{children}</thead>;
  },
  tbody({ children, ...props }: any) {
    return <tbody className="divide-y divide-slate-200 dark:divide-white/10" {...props}>{children}</tbody>;
  },
  tr({ children, ...props }: any) {
    return <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors" {...props}>{children}</tr>;
  },
  th({ children, ...props }: any) {
    return <th className="h-10 px-4 text-left align-middle font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/10 last:border-r-0" {...props}>{children}</th>;
  },
  td({ children, ...props }: any) {
    return <td className="p-4 align-middle text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 last:border-r-0" {...props}>{children}</td>;
  },
  pre({ children }: any) {
    return <>{children}</>;
  },
  code({ node, inline, className, children, ...props }: any, isTyping?: boolean, onRetry?: (errorMsg: string) => void) {
    const codeString = String(children).replace(/\n$/, "");

    // In react-markdown v9+, the 'inline' prop is removed and undefined.
    // We can reliably determine if it's inline if it lacks a language class and has no newlines.
    const isActuallyInline = !className?.includes('language-') && !codeString.includes('\n');

    // 🚨 Intercept Emails that the AI hallucinates into code blocks (e.g. inside tables) 🚨
    const isJustAnEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(codeString.trim());
    if (isJustAnEmail) {
      return (
        <a href={`mailto:${codeString.trim()}`} className="text-indigo-500 dark:text-indigo-400 hover:underline break-all">
          {codeString.trim()}
        </a>
      );
    }

    // 🚨 Intercept URLs/Links that the AI hallucinates into code blocks 🚨
    const isJustAUrl = /^(https?:\/\/[^\s]+|wss?:\/\/[^\s]+|www\.[^\s]+|[\w-]+\.classgrid\.in[^\s]*)$/i.test(codeString.trim());
    if (isJustAUrl) {
      const url = (codeString.trim().startsWith('http') || codeString.trim().startsWith('ws')) ? codeString.trim() : `https://${codeString.trim()}`;
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 dark:text-indigo-400 hover:underline break-all">
          {codeString.trim()}
        </a>
      );
    }

    // A file named in the answer opens in the Project Mode editor (at its line, when one is given)
    if (isActuallyInline) {
      const mention = parseFileMention(codeString);
      if (mention) return <FileMentionChip {...mention} />;
    }

    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";

    // 🚨 Intercept Hallucinated Prose in Code Blocks 🚨
    // If the AI wraps an entire normal sentence in backticks, un-wrap it so the user doesn't see a random grey box.
    const isProse = !language && codeString.length > 15 && codeString.includes(" ") && !/[{}();=<>\[\]\/\\]/.test(codeString) && !/const|let|var|function|import|export|if|for|while/.test(codeString);
    if (isProse) {
      return <span className={!isActuallyInline ? "block mb-4" : ""}>{codeString}</span>;
    }

    // 🚨 Intercept Hallucinated Single Words (like `teacher` or emails inside tables) 🚨
    // We only strip if it's NOT inline. If it's inline, it was deliberately wrapped in single backticks.
    const isSingleWordHallucination = !isActuallyInline && !language && !codeString.includes('\n') && codeString.length < 50 && !/[{}();=<>\[\]\/\\]/.test(codeString) && !/const|let|var|function|import|export|if|for|while/.test(codeString);
    if (isSingleWordHallucination) {
      return <span className="block mb-4">{codeString}</span>;
    }

    const isMermaid = language === "mermaid";

    if (!isActuallyInline && language === "chart") {
      try {
        const chartConfig = JSON5.parse(codeString);
        return (
          <div className="my-4 p-4 rounded-xl border border-border bg-card shadow-sm w-full">
            <AiChartRenderer config={chartConfig} />
          </div>
        );
      } catch (e) {
        return <pre>Error parsing chart config...</pre>;
      }
    }

    if (!isActuallyInline && isMermaid) {
      return <MermaidViewer chart={codeString} onRetry={onRetry} isTyping={isTyping} />;
    }

    if (!isActuallyInline && language === "carousel") {
      return <MarkdownCarousel content={String(children).replace(/\n$/, "")} components={MarkdownComponents} />;
    }



    if (!isActuallyInline && ["prompt", "email", "message", "copy"].includes(language)) {
      return <CopyBlockClient text={String(children).replace(/\n$/, "")} label={language} />;
    }

    if (!isActuallyInline) {
      return (
        <div className="w-full pb-2 overflow-hidden not-prose">
          <CodeBlockClient
            language={language}
            rawCode={String(children).replace(/\n$/, "")}
            html={`<pre class="text-[13px] py-4 px-4 !m-0 flex flex-col"><code class="font-mono hljs">${!isTyping && language && hljs.getLanguage(language)
              ? hljs.highlight(String(children).replace(/\n$/, ""), { language }).value
              : String(children).replace(/\n$/, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
              }</code></pre>`}
          />
        </div>
      );
    }

    return (
      <code className="bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 shadow-sm text-[#c92a2a] dark:text-[#ff6b6b] px-[5px] py-[2px] rounded-[3px] text-[13px] font-mono break-words mx-0.5" {...props}>
        {children}
      </code>
    );
  }
};

const memoizedRemarkPlugins = [remarkMath, remarkGfm, remarkGithubAlerts];
const memoizedRehypePlugins = [rehypeKatex];

const CraftingBlock = () => {
  const [timer, setTimer] = React.useState(0);
  React.useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  return (
    <div className="flex flex-col p-3 max-w-xl">
      <div className="flex items-center justify-start gap-2 mb-4">
        <p
          className="bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] bg-[length:200%_100%] bg-clip-text text-base text-transparent animate-[shimmer_5s_linear_infinite]"
          style={{ animation: "shimmer 5s linear infinite" }}
        >
          Crafting
        </p>
        <span className="text-sm text-muted-foreground">
          {timer}s
        </span>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    </div>
  );
};

// [n] citations in web-search answers become markdown links that the `a` renderer swaps for source chips.
// Matches "[1]", "[1][3]" and "[1, 3]" for ids that exist; leaves markdown links "[1](...)", footnote
// definitions "[1]: ..." and inline code alone. (Fenced code is split off before this runs.)
const CITE_HREF_PREFIX = "#cg-cite-";
function linkCitations(text: string, sources: ChatSource[]): string {
  const known = new Set(sources.map((s) => s.id));
  return text
    .split(/(`[^`\n]*`)/g)
    .map((chunk, i) => {
      if (i % 2 === 1) return chunk;
      return chunk.replace(/(?:\[\d{1,3}(?:\s*,\s*\d{1,3})*\]\s?)+(?![(:])/g, (group) => {
        const ids = [...new Set((group.match(/\d{1,3}/g) || []).map(Number).filter((n) => known.has(n)))];
        if (ids.length === 0) return group;
        const trailing = /\s$/.test(group) ? " " : "";
        return `[cite](${CITE_HREF_PREFIX}${ids.join("-")})${trailing}`;
      });
    })
    .join("");
}

// Files our CDN serves that the answer links to (made by the AI): shown as file cards under the answer
const ANSWER_FILE_LINK = /https:\/\/cdn\.classgrid\.in\/[^\s)\]"'<>]+?\.(?:pdf|csv|xlsx|xls|docx|doc|pptx|txt|zip)(?![\w/])/gi;
function answerFileLinks(text: string): { url: string; name: string }[] {
  const urls = [...new Set(text.match(ANSWER_FILE_LINK) || [])];
  return urls.map((url) => {
    let name = url.split("/").pop() || url;
    try { name = decodeURIComponent(name); } catch { /* keep as is */ }
    // Drop the upload timestamp in front: "1792640743942-report_clean.pdf" → "report_clean.pdf"
    return { url, name: name.replace(/^\d{10,}[-_]/, "") };
  });
}

// Share Grid live refresh: a saved message from the server → a chat message (same as the chat loaders)
function toChatMessage(m: any): ChatMessage {
  let content = m.content;
  let thought, steps, sources, workedMs: number | undefined, checkpoint: string | undefined;
  if (m.role === "assistant" && typeof m.content === "string") {
    try {
      const parsed = JSON.parse(m.content);
      if (parsed && typeof parsed === "object" && parsed.classgrid_ai_message) {
        content = parsed.content;
        thought = parsed.thought;
        steps = parsed.steps;
        sources = parsed.sources;
        workedMs = typeof parsed.worked_ms === "number" ? parsed.worked_ms : undefined;
        checkpoint = typeof parsed.checkpoint === "string" ? parsed.checkpoint : undefined;
      }
    } catch { /* plain text */ }
  }
  return {
    id: m.id || crypto.randomUUID(),
    role: m.role,
    content,
    thought,
    steps,
    sources,
    workedMs,
    checkpoint,
    fileUrls: m.file_urls || undefined,
    senderEmail: m.sender_email || undefined,
    attachments: m.file_urls && m.file_urls.length > 0 ? m.file_urls.map((url: string) => ({
      url,
      name: url.split("/").pop() || "attachment",
      mimeType: mimeFromUrl(url),
      size: 0,
    })) : undefined,
    createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
  };
}

// The user's own message bubble: markdown they pasted (links, bold, inline code, lists) shows formatted.
// Plain markdown only: raw HTML is skipped and unsafe links are removed by react-markdown.
const USER_MD_COMPONENTS: any = {
  p: ({ children }: any) => <p className="m-0 [&+p]:mt-2">{children}</p>,
  a: ({ href, children }: any) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2 text-blue-600 dark:text-blue-400 break-all">{children}</a>
  ),
  code: ({ children }: any) => <code className="bg-black/5 dark:bg-white/10 px-1 py-0.5 rounded text-[14px] font-mono break-words">{children}</code>,
  pre: ({ children }: any) => <pre className="my-1 p-2 rounded-lg bg-black/5 dark:bg-white/10 overflow-x-auto text-[14px] whitespace-pre">{children}</pre>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 my-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 my-1">{children}</ol>,
  li: ({ children }: any) => <li className="my-0.5">{children}</li>,
  h1: ({ children }: any) => <p className="m-0 font-semibold">{children}</p>,
  h2: ({ children }: any) => <p className="m-0 font-semibold">{children}</p>,
  h3: ({ children }: any) => <p className="m-0 font-semibold">{children}</p>,
  h4: ({ children }: any) => <p className="m-0 font-semibold">{children}</p>,
  blockquote: ({ children }: any) => <blockquote className="border-l-2 border-foreground/30 pl-2 my-1">{children}</blockquote>,
  img: () => null,
};
function UserMessageText({ text }: { text: string }) {
  return (
    <div className="text-[16px] leading-[24px] break-words text-[#37352f] dark:text-[#F0EFED] cursor-text">
      {/* every line break the user typed stays a line break */}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={USER_MD_COMPONENTS} skipHtml>{String(text || "").replace(/\n/g, "  \n")}</ReactMarkdown>
    </div>
  );
}

// Header icon before Share: two circles, each with a line
function ShareGridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="6" cy="7" r="3" />
      <path d="M12 7h8" />
      <circle cx="6" cy="17" r="3" />
      <path d="M12 17h8" />
    </svg>
  );
}

const AssistantMessageContent = memo(({ content, sources, createdAt, isTyping, onApprovalAction, isHistorical, onRetry, currentStepIndex, setActiveBuildSessionId }: { content: string, sources?: ChatSource[], createdAt?: number, isTyping?: boolean, onApprovalAction?: (text: string) => void, isHistorical?: boolean, onRetry?: (error: string) => void, currentStepIndex?: number, setActiveBuildSessionId?: (id: string) => void }) => {
  // `components` below must keep a stable identity: a new object makes ReactMarkdown remount
  // every code block and Mermaid diagram. So it reads changing props from refs, which are
  // assigned during render so the markdown rendered in this same pass sees current values.
  const onApprovalActionRef = React.useRef(onApprovalAction);
  const isTypingRef = React.useRef(isTyping);
  const onRetryRef = React.useRef(onRetry);
  const isHistoricalRef = React.useRef(isHistorical);
  const currentStepIndexRef = React.useRef(currentStepIndex);
  const contentRef = React.useRef(content);
  const sourcesRef = React.useRef(sources);
  sourcesRef.current = sources;
  // When this answer was written: timers ("duration" countdowns) count from here, to the second
  const createdAtRef = React.useRef(createdAt);
  createdAtRef.current = createdAt;
  onApprovalActionRef.current = onApprovalAction;
  isTypingRef.current = isTyping;
  onRetryRef.current = onRetry;
  isHistoricalRef.current = isHistorical;
  currentStepIndexRef.current = currentStepIndex;
  contentRef.current = content;

  // Preprocess AI output:
  // 1. Convert fake bullet chars to real Markdown list markers
  // 2. Remove blank lines between consecutive list items (prevents <p> wrap inside <li> = big gaps)
  // 3. Fix orphaned commas and strange line breaks that some models hallucinate
  const processedContent = React.useMemo(() => {
    let text = content
      .replace(/^[•]\s/gm, '- ')
      .replace(/^\s{4}[◦]\s/gm, '    - ')
      .replace(/(^[ \t]*[-*][ \t].*)\n{2,}(?=[ \t]*[-*][ \t])/gm, '$1\n'); // collapse blank lines between bullets

    // Split by code blocks to avoid messing up JSON/code formatting
    const parts = text.split(/(```[\s\S]*?```)/g);
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { // Not a code block
        // Remove newlines that isolate commas (e.g. \n,\n or \n, ) and slashes
        parts[i] = parts[i]
          .replace(/(?:\r?\n)+\s*,\s*(?:\r?\n)+/g, ', ')
          .replace(/(\S)(?:\r?\n)+\s*,/g, '$1,')
          .replace(/,\s*(?:\r?\n)+\s*(\S)/g, ', $1')
          .replace(/(?:\r?\n)+\s*\/\s*(?:\r?\n)+/g, ' / ')
          .replace(/(\S)(?:\r?\n)+\s*\//g, '$1 /')
          .replace(/\/\s*(?:\r?\n)+\s*(\S)/g, '/ $1')
          .replace(/\(([^)]+)\)/g, (match, inner) => `(${inner.replace(/\s*(?:\r?\n)+\s*/g, ' ').trim()})`);
        if (sources && sources.length > 0) parts[i] = linkCitations(parts[i] ?? "", sources);
      }
    }
    return parts.join('');
  }, [content, sources]);
  const components = React.useMemo(() => {
    return {
      ...MarkdownComponents,
      code({ node, inline, className, children, ...props }: any) {
        const match = /language-(\w+)/.exec(className || "");
        const language = match ? match[1] : "";
        const isApprovalLang = !inline && language && "approval".startsWith(language.toLowerCase());

        // ```cards: rows with a thumbnail, title, text and source chip (web-search answers)
        if (language === "cards" && !inline) {
          try {
            const parsed = JSON5.parse(String(children));
            const items = Array.isArray(parsed) ? parsed : parsed?.items;
            if (Array.isArray(items)) return <SourceCards items={items} sources={sourcesRef.current} />;
          } catch {
            if (isTypingRef.current) return null; // still streaming
          }
        }

        // ```widget: the AI's own HTML card, run in a sandboxed iframe (anything no built-in block covers)
        // It draws live while being written; its scripts run once its own block has closed (not the whole answer)
        if (language === "widget" && !inline) {
          const code = String(children).replace(/\n$/, "");
          const raw = contentRef.current;
          const at = code ? raw.indexOf(code) : -1;
          const closed = at >= 0 && /^\s*```/.test(raw.slice(at + code.length));
          return <WidgetBlock code={code} done={!isTypingRef.current || closed} onAsk={(text) => onApprovalActionRef.current?.(text)} />;
        }

        // ```followups / ```actions (buttons send a message), ```reportcard, ```timetable, ```attendance, ```planner
        if ((language === "followups" || language === "actions" || language === "reportcard" || language === "timetable" || language === "attendance" || language === "planner") && !inline) {
          try {
            const parsed = JSON5.parse(String(children));
            if (parsed && typeof parsed === "object") {
              const ask = (text: string) => onApprovalActionRef.current?.(text);
              // Next-question suggestions only under the latest answer, like ChatGPT
              if (language === "followups") return isHistoricalRef.current ? null : <FollowUps data={Array.isArray(parsed) ? { questions: parsed } : parsed} onAsk={ask} />;
              if (language === "actions") return <ActionCards data={Array.isArray(parsed) ? { items: parsed } : parsed} onAsk={ask} />;
              if (language === "reportcard") return <ReportCard data={parsed} />;
              if (language === "timetable") return <Timetable data={parsed} />;
              if (language === "attendance") return <AttendanceCalendar data={parsed} />;
              return <StudyPlanner data={parsed} onAsk={ask} />;
            }
          } catch {
            if (isTypingRef.current) return null;
          }
        }

        // ```review (title, website, big score, summary, verdict) and ```scores (bar per category)
        // ```weather / ```market / ```map / ```countdown: live cards that fetch their own fresh data
        if ((language === "weather" || language === "market" || language === "map" || language === "countdown") && !inline) {
          try {
            const parsed = JSON5.parse(String(children));
            if (parsed && typeof parsed === "object") {
              if (language === "weather") return <WeatherCard data={parsed} />;
              if (language === "market") return <MarketCard data={parsed} />;
              if (language === "map") return <MapCard data={parsed} />;
              return <CountdownCard data={parsed} startedAt={createdAtRef.current} />;
            }
          } catch {
            if (isTypingRef.current) return null;
          }
        }

        // ```clock: live clock card for a place (time is computed in the browser every second)
        if (language === "clock" && !inline) {
          try {
            const parsed = JSON5.parse(String(children));
            if (parsed && typeof parsed === "object") return <ClockBlock data={parsed} />;
          } catch {
            if (isTypingRef.current) return null;
          }
        }

        // ```points (icon rows: "tiles" box or orange "icons" list) and ```rating (score card with stars)
        if ((language === "review" || language === "scores" || language === "points" || language === "rating") && !inline) {
          try {
            const parsed = JSON5.parse(String(children));
            if (parsed && typeof parsed === "object") {
              if (language === "review") return <ReviewSummary data={parsed} sources={sourcesRef.current} />;
              if (language === "scores") return <ScoreBreakdown data={parsed} />;
              if (language === "points") return <PointsList data={parsed} sources={sourcesRef.current} />;
              return <RatingCard data={parsed} sources={sourcesRef.current} />;
            }
          } catch {
            if (isTypingRef.current) return null; // still streaming
          }
        }

        if (language === "chart" && !inline) {
          try {
            const chartConfig = JSON5.parse(String(children));
            return (
              <div className="my-4 w-full rounded-xl border border-border bg-card p-4 shadow-sm relative z-10 overflow-hidden" data-no-ring="true">
                <AiChartRenderer config={chartConfig} />
              </div>
            );
          } catch (e: any) {
            if (isTypingRef.current) {
              return null;
            }
            return (
              <div className="my-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-500 text-sm">
                Failed to parse chart configuration: {e?.message}
                <pre className="mt-2 text-xs overflow-auto max-h-[200px]">{String(children)}</pre>
              </div>
            );
          }
        }

        if (language === "skill" && !inline) {
          const rawSkill = String(children);
          let skillData: { name?: string; instructions?: string } | null = null;
          try {
            const parsed = JSON5.parse(rawSkill);
            skillData = parsed && typeof parsed === "object" ? parsed : {};
          } catch {
            // Text the model wrote with stray quotes or line breaks: read the fields directly
            if (!isTypingRef.current) {
              const name = rawSkill.match(/["']?name["']?\s*:\s*["']([^"'\n]*)["']/)?.[1];
              const instructions = rawSkill.match(/["']?instructions["']?\s*:\s*["']([\s\S]*?)["']\s*}?\s*$/)?.[1];
              skillData = { name, instructions: instructions?.replace(/\\n/g, "\n").replace(/\\"/g, '"') };
            }
          }
          if (!skillData) return <CraftingBlock />;
          return (
            <div
              className="my-4 w-full rounded-xl border border-border/50 hover:border-border hover:bg-muted/10 bg-card p-4 shadow-sm relative z-10 overflow-hidden cursor-pointer transition-colors"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-ai-hub', { detail: { tab: 'skills' } }));
              }}
            >
              <div className="flex items-center gap-3 mb-1.5">
                <div className="p-2 bg-muted/50 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                </div>
                <h4 className="font-semibold text-[15px]">{skillData.name || "Custom Skill"}</h4>
              </div>
              <p className="text-[13px] text-muted-foreground ml-[46px]">{skillData.instructions || "Click to manage your AI skills."}</p>
            </div>
          );
        }

        if (isApprovalLang) {
          try {
            let parsedProps = JSON5.parse(String(children));
            if (parsedProps.variant === "survey" || parsedProps.variant === "questions" || parsedProps.questions) {
              parsedProps.variant = "questions";
              if (Array.isArray(parsedProps.questions)) {
                parsedProps.questions = parsedProps.questions.map((q: any, qIdx: number) => {
                  const prompt = q.prompt || q.question || q.title || "Question";
                  // Each option to plain text (strings or {label|value|text}); empty ones are dropped so the card
                  // never shows a blank row
                  const options = (Array.isArray(q.options) ? q.options : [])
                    .map((opt: any) => (opt && typeof opt === 'object' ? (opt.label ?? opt.value ?? opt.text ?? "") : opt))
                    .map((opt: any) => String(opt ?? "").trim())
                    .filter((opt: string) => opt.length > 0);
                  return {
                    ...q,
                    id: q.id || `q-${qIdx}`,
                    prompt,
                    options
                  };
                });
              }
            }
            const card = (
              <ApprovalCard
                {...parsedProps}
                isHistorical={isHistoricalRef.current}
                currentStepIndex={currentStepIndexRef.current}
                onApprove={(payload) => {
                  if (parsedProps.variant === "plan" && parsedProps.plan && Array.isArray(parsedProps.plan)) {
                    // The chat agent executes the approved plan itself and streams plan_step_update events
                    onApprovalActionRef.current?.(`I approve this plan.`);
                  } else if (parsedProps.questions && Array.isArray(parsedProps.questions)) {
                    const formatted = parsedProps.questions.map((q: any) => {
                      const ans = payload?.answers?.[q.id];
                      if (!ans || ans.trim() === "") {
                        return `- ${q.prompt}: Skipped`;
                      }
                      return `- ${q.prompt}: ${ans}`;
                    }).join("\n");
                    onApprovalActionRef.current?.(`Here are my answers:\n${formatted}`);
                  } else if (payload?.answers) {
                    const formatted = Object.entries(payload.answers).map(([k, v]) => `- ${v}`).join("\n");
                    onApprovalActionRef.current?.(`Here are my answers:\n${formatted}`);
                  } else {
                    onApprovalActionRef.current?.(`I approve this plan.`);
                  }
                }}
                onReject={() => {
                  onApprovalActionRef.current?.(`I want to skip this or I do not approve.`);
                }}
                onViewPlan={() => {
                  // Only opens the plan, never sends a message: Project Mode shows the plan/ file in the editor, otherwise the side panel
                  let inProject = false;
                  try {
                    const parts = window.location.pathname.split("/");
                    inProject = (parts.includes("project") && !!(sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")))
                      || (parts.includes("studio") && !!(sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open"))); // Studio: the plan opens in its Files tab
                  } catch { /* storage blocked */ }
                  if (inProject) window.dispatchEvent(new CustomEvent("classgrid:open-project-file", { detail: { plan: true, planTitle: parsedProps.planTitle } }));
                  else window.dispatchEvent(new Event("classgrid:open-plan-panel"));
                }}
              />
            );

            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full"
              >
                {card}
              </motion.div>
            );
          } catch (e: any) {
            if (isTypingRef.current) {
              return <CraftingBlock />;
            }

            // If it finishes typing but fails to parse, trigger a silent background retry!
            if (onRetryRef.current) {
              onRetryRef.current(e?.message || "Invalid JSON syntax in interactive card");
            }

            return (
              <div className="p-4 my-4 bg-slate-50 dark:bg-[#222] rounded-xl border border-slate-200 dark:border-white/5 flex flex-col items-center justify-center min-h-[120px]">
                <Spinner className="w-5 h-5 text-indigo-500 mb-2" />
                <div className="text-[13px] font-medium text-slate-700 dark:text-slate-300">Repairing interactive card...</div>
              </div>
            );
          }
        }
        if (!inline && contentRef.current.includes('"variant": "plan"') && typeof children === "string" && (className?.includes("language-html") || className?.includes("language-css") || className?.includes("language-js") || className?.includes("language-javascript"))) {
          return null; // Hide code blocks in chat, they are shown in WorkspacePanel
        }
        return MarkdownComponents.code({ node, inline, className, children, ...props }, isTypingRef.current, onRetryRef.current);
      },
      table({ children, ...props }: any) {
        return (
          <div className="w-full pb-2 overflow-x-auto my-4">
            <div className="rounded-md border border-slate-200 dark:border-white/10 min-w-[500px]">
              <table className="w-full text-sm" {...props}>{children}</table>
            </div>
          </div>
        );
      },
      thead({ children, ...props }: any) {
        return <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10" {...props}>{children}</thead>;
      },
      tbody({ children, ...props }: any) {
        return <tbody className="divide-y divide-slate-200 dark:divide-white/10" {...props}>{children}</tbody>;
      },
      tr({ children, ...props }: any) {
        return <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors" {...props}>{children}</tr>;
      },
      th({ children, ...props }: any) {
        return <th className="h-10 px-4 text-left align-middle font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/10 last:border-r-0" {...props}>{children}</th>;
      },
      td({ children, ...props }: any) {
        return <td className="p-4 align-middle text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 last:border-r-0" {...props}>{children}</td>;
      },
      img({ src, alt }: any) {
        // Images in the answer text: rounded thumbnail that opens the full-screen viewer
        return <AnswerImage src={typeof src === "string" ? src : undefined} alt={typeof alt === "string" ? alt : ""} />;
      },
      a({ href, children, ...props }) {
        // [n] citations (see linkCitations) become a source chip with the site's icon
        if (typeof href === "string" && href.startsWith(CITE_HREF_PREFIX)) {
          const ids = href.slice(CITE_HREF_PREFIX.length).split("-").map(Number);
          const cited = (sourcesRef.current || []).filter((s) => ids.includes(s.id));
          return cited.length > 0 ? <SourceChip sources={cited} /> : null;
        }
        // Project Mode: a link to a project file or folder opens it in the code editor, not as a web page
        const projectLink = parseProjectLink(href);
        if (projectLink) return <FileMentionChip {...projectLink} label={children} />;
        const external = href && /^https?:\/\//i.test(href);
        return (
          <a
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            className="font-medium text-blue-600 dark:text-blue-400 underline underline-offset-4 transition-colors hover:text-blue-500"
            {...props}
          >
            {children}
          </a>
        );
      },
      p({ children, ...props }) {
        return <p className="text-[#2C2C2B] dark:text-[#F0EFED] whitespace-normal mb-3 last:mb-0" {...props}>{children}</p>;
      },
      strong({ children, ...props }) {
        return <strong className="font-semibold text-[#2C2C2B] dark:text-[#F0EFED]" {...props}>{children}</strong>;
      },
      h1({ children, ...props }) {
        return <h1 className="text-[1.875em] font-semibold text-[#2C2C2B] dark:text-[#F0EFED] leading-[1.3] m-0 p-0 mb-3 mt-6 first:mt-0" {...props}>{children}</h1>;
      },
      h2({ children, ...props }) {
        return <h2 className="text-[1.5em] font-semibold text-[#2C2C2B] dark:text-[#F0EFED] leading-[1.3] m-0 p-0 mb-2 mt-5 first:mt-0" {...props}>{children}</h2>;
      },
      h3({ children, ...props }) {
        return <h3 className="text-[1.25em] font-semibold text-[#2C2C2B] dark:text-[#F0EFED] leading-[1.3] m-0 p-0 mb-2 mt-4 first:mt-0" {...props}>{children}</h3>;
      },
      h4({ children, ...props }) {
        return <h4 className="text-[1em] font-semibold text-[#2C2C2B] dark:text-[#F0EFED] leading-[1.3] m-0 p-0 mb-1 mt-3 first:mt-0" {...props}>{children}</h4>;
      },
      ul({ children, ...props }) {
        // Level 1 = disc (filled), nested ul inside = circle (hollow) — matches Notion exactly
        return <ul className="mb-3 last:mb-0 pl-[22px] list-disc [&_ul]:list-[circle] [&_ul]:pl-[22px] [&_ul]:mb-0 marker:text-[#37352f] dark:marker:text-[#F0EFED]" {...props}>{children}</ul>;
      },
      ol({ children, ...props }) {
        return <ol className="mb-3 last:mb-0 pl-[22px] list-decimal marker:text-[#37352f] dark:marker:text-[#F0EFED]" {...props}>{children}</ol>;
      },
      li({ children, ...props }) {
        // Notion DevTools: padding-top: 2px; padding-bottom: 2px; padding-inline-start: 6px
        return <li className="text-[#2C2C2B] dark:text-[#F0EFED] py-[2px] pl-[2px] break-words [&>p]:m-0 [&>p]:inline" {...props}>{children}</li>;
      },
      blockquote({ className, children, ...props }) {
        // If it's a GitHub alert, defer to the main MarkdownComponents blockquote to get the rich colors
        if (className?.includes("markdown-alert")) {
          return MarkdownComponents.blockquote({ className, children, ...props });
        }
        return <blockquote className="border-l-[3px] border-slate-200 dark:border-slate-700 pl-4 my-4 text-slate-500 dark:text-slate-400 italic" {...props}>{children}</blockquote>;
      },
      hr({ ...props }) {
        return <hr className="my-6 border-slate-100 dark:border-slate-800" {...props} />;
      }
    };
  }, []);

  const fileLinks = React.useMemo(() => answerFileLinks(content || ""), [content]);

  return (
    <div className="space-y-4 text-[16px] leading-[24px] overflow-visible break-words max-w-none">
      <ReactMarkdown
        remarkPlugins={memoizedRemarkPlugins}
        rehypePlugins={memoizedRehypePlugins}
        components={components}
      >
        {preprocessLaTeX(processedContent)}
      </ReactMarkdown>
      {fileLinks.length > 0 && (
        <div className="flex flex-col gap-2">
          {fileLinks.map((f) => (
            <DocumentGenerationView
              key={f.url}
              fileName={f.name}
              size=""
              hideAnimation
              url={f.url}
              onClick={() => window.open(f.url, "_blank", "noopener")}
            />
          ))}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.sources === nextProps.sources &&
    prevProps.isTyping === nextProps.isTyping &&
    prevProps.isHistorical === nextProps.isHistorical
  );
});
export const INTEGRATIONS_LIST: any[] = [
  { id: "image", name: "Create image", description: "Visualize anything", icon: FileImage, type: "action" },
  { id: "web", name: "Web search", description: "Find real-time news and info", icon: Globe2, type: "action" },
  // { id: "mcp-cursor", name: "Cursor", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/cursor.svg", invertInLightMode: true },
  // { id: "mcp-chatgpt", name: "ChatGPT", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/chatgpt-light_(1).svg", invertInLightMode: true },
  // { id: "mcp-claude", name: "Claude", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/claude-ai-icon.svg" },
  { id: "mcp-notion", name: "Notion", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Notion-logo.svg" },
  { id: "gmail", name: "Gmail", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Gmail_icon_(2026).svg" },
  { id: "gcal", name: "Google Calendar", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Google_Calendar_icon_(2026).svg" },
  { id: "gdrive", name: "Google Drive", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Google_Drive_icon_(2026).svg" },
  { id: "gclass", name: "Google Classroom", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Google_Classroom_Logo.svg" },
  { id: "gmeet", name: "Google Meet", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Google_Meet_icon_(2026).svg" },
  { id: "gforms", name: "Google Forms", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Google_Forms_icon_(2026).svg" },
  { id: "outlook", name: "Microsoft Outlook", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Microsoft_Outlook_Icon_(2025%C3%A2%C2%80%C2%93present).svg" },
  { id: "teams", name: "Microsoft Teams", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/microsoft-teams-svgrepo-com.svg" },
  { id: "zoom", name: "Zoom", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/zoom-communications-icon_(1).svg" },
  { id: "whatsapp", name: "WhatsApp Business", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/whatsapp-svgrepo-com_(1).svg" },
  { id: "vercel", name: "Vercel", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/vercel-icon-svgrepo-com.svg", invertInDarkMode: true },
  { id: "slack", name: "Slack", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/slack-new-logo-logo-svgrepo-com.svg" },
  { id: "github", name: "GitHub", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/github-icon.svg", invertInDarkMode: true },
  { id: "canva", name: "Canva", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/canva.svg" },
  { id: "spotify", name: "Spotify", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/spotify.svg" },
  { id: "youtube", name: "YouTube", imgUrl: "https://cdn.classgrid.in/youtube-icon.svg" },
  { id: "supabase", name: "Supabase", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/supabase-icon.svg" },
  { id: "sanity", name: "Sanity CMS", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/sanity-icon-logo-png_seeklogo-653456.png", invertInDarkMode: true },
  { id: "facebook", name: "Facebook Pages", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/2023_Facebook_icon.svg" },
  { id: "instagram", name: "Instagram Business", imgUrl: "https://cdn.classgrid.in/classgrid_intgration/Instagram_logo_2016.svg" },
];


export function AskAiPanel({ open, onOpenChange, pageContext, variant = "in-flow", initialMessages, autoFocus = true, readOnly = false, hideClearChat = false, overlayWidth, onOverlayWidthChange, onOverlayResizingChange, inputHeader, studioMenu = false }: AskAiPanelProps) {
  const { data: user } = useCurrentUser();
  const session = user ? { user } : null;
  // No SidebarContext subscription here: this whole panel would re-render (every message) on each sidebar toggle.
  const prefersReducedMotion = useReducedMotion();

  // Ref to hold latest askQuestion to avoid stale closures in retries
  const askQuestionRef = useRef<any>(null);

  const typingRunRef = useRef(0);
  // Changes on New Chat / opening another chat. A reply still streaming for the previous chat then stops touching
  // the screen (it keeps being received in the background, so the server finishes and saves it to that chat).
  const chatGenRef = useRef(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Word-by-word typing buffer (like sandbox simulation)
  const tokenBufferRef = useRef("");
  const thoughtBufferRef = useRef("");
  const wordTypingActiveRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages ?? []);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState<string>("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageQueue, setMessageQueue] = useState<QueuedMessage[]>([]);
  const [isQueueVisible, setIsQueueVisible] = useState(true);
  const [priorityMessage, setPriorityMessage] = useState<QueuedMessage | null>(null);
  const [input, setInput] = useState("");
  // Set when Classgrid AI (or the user) ended this chat: the composer is replaced by a "Chat ended" card.
  const [chatEnded, setChatEnded] = useState<{ reason: string | null; canReopen: boolean } | null>(null);
  const [endedFeedbackOpen, setEndedFeedbackOpen] = useState(false);
  // The chat whose ended/not-ended state is known. Until it is, the composer stays hidden so an ended chat never flashes it.
  const [endedCheckedFor, setEndedCheckedFor] = useState<string | null>(null);
  const [endedFeedbackSubmitting, setEndedFeedbackSubmitting] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [completedPlanSteps, setCompletedPlanSteps] = useState<string[]>([]);
  const [planStepStatus, setPlanStepStatus] = useState<Record<string, "running" | "done" | "failed">>({});
  const [selectedModel, setSelectedModel] = useSelectedModel();

  // --- Voice Dictation State ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);


  // --- Auto-Execution Queue State (Removed: Now handled by Backend Control Plane) ---
  // Build TOC items from user questions
  const tocItems = useMemo(() => {
    return messages
      .filter((m) => m.role === "user" && m.content)
      .map((m) => {
        let label = m.tocSummary || m.content.trim();
        if (!m.tocSummary) {
          const words = label.split(/\s+/);
          if (words.length > 4) {
            label = words.slice(0, 4).join(" ") + "...";
          } else if (label.length > 25) {
            label = label.substring(0, 25) + "...";
          }
        }
        return { id: `msg-${m.id}`, label, text: m.content.trim().slice(0, 200), time: m.createdAt };
      });
  }, [messages]);
  const [activeSection, setActiveSection] = useState("");
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [showGridPanel, setShowGridPanel] = useState(false);
  const [isAiHubOpen, setIsAiHubOpen] = useState(false);
  const [aiHubInitialTab, setAiHubInitialTab] = useState<string>("plugins");

  useEffect(() => {
    const handleOpenAiHub = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.tab) {
        setAiHubInitialTab(customEvent.detail.tab);
      }
      setIsAiHubOpen(true);
    };
    window.addEventListener('open-ai-hub', handleOpenAiHub);

    // Handle post-payment redirect
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("ai_payment") === "success") {
      setAiHubInitialTab("credits");
      setIsAiHubOpen(true);
      // Let the AiUpgradePanel handle the toast via another mechanism, or just show it here:
      toast.success("Payment successful! AI Credits have been added to your account.");
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (searchParams.get("ai_payment") === "failed") {
      setAiHubInitialTab("upgrade");
      setIsAiHubOpen(true);
      toast.error("Payment failed or was cancelled.");
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    return () => window.removeEventListener('open-ai-hub', handleOpenAiHub);
  }, []);

  // @ mention state
  const [atMenuOpen, setAtMenuOpen] = useState(false);
  const [atMenuQuery, setAtMenuQuery] = useState("");
  const [atMenuSelectedIndex, setAtMenuSelectedIndex] = useState(0);

  const handleApprovalAction = useCallback((text: string) => {
    askQuestionRef.current?.(text);
  }, []);

  // Auto-open workspace panel when a plan is detected
  const hasPlan = useMemo(() => {
    return messages.some((m) => m.role === 'assistant' && (m.content.includes('"variant": "plan"') || m.content.includes('"variant":"plan"') || m.content.includes("'variant': 'plan'") || m.content.includes('variant="plan"')));
  }, [messages]);

  // Extract plan steps string first to prevent new array recreation on every token
  const planStepsString = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant' && m.content.includes('```approval')) {
        const match = m.content.match(/```approval\n([\s\S]*?)```/);
        if (match && match[1]) {
          try {
            const parsed = typeof JSON5 !== 'undefined' ? JSON5.parse(match[1]) : JSON.parse(match[1]);
            if (parsed.variant === "plan" && Array.isArray(parsed.plan)) {
              return JSON.stringify(parsed.plan);
            }
          } catch (e) { }
        }
      }
    }
    return null;
  }, [messages]);

  // Only parse and return a new array when the underlying JSON string actually changes
  const planSteps = useMemo(() => {
    return planStepsString ? JSON.parse(planStepsString) : null;
  }, [planStepsString]);

  // Reset live step progress when a new plan appears or the chat changes (chat change swaps the plan too)
  useEffect(() => {
    setCompletedPlanSteps([]);
    setPlanStepStatus({});
  }, [planStepsString]);

  // Extract plan text as a string first
  const planText = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === 'assistant' && (m.content.includes('"variant": "plan"') || m.content.includes('"variant":"plan"') || m.content.includes("'variant': 'plan'") || m.content.includes('variant="plan"'))) {
        const approvalIndex = m.content.indexOf('```approval');
        return approvalIndex > 0 ? m.content.substring(0, approvalIndex).trim() : '';
      }
    }
    return '';
  }, [messages]);

  // Only re-render the heavy ReactMarkdown tree when the planText string actually changes
  const planNode = useMemo(() => {
    if (!planText) return null;
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={memoizedRemarkPlugins}
          rehypePlugins={memoizedRehypePlugins}
          components={MarkdownComponents}
        >
          {planText}
        </ReactMarkdown>
      </div>
    );
  }, [planText]);

  // Derive preview sources from the sandbox file stream (single source of truth)
  const latestHtml = sandboxFiles["index.html"] || "";
  const latestCss = sandboxFiles["style.css"] || "";
  const latestJs = sandboxFiles["script.js"] || "";
  // Controls showing the Code/Preview tabs; whether the AI is still streaming is `submitting`
  const hasSandboxFiles = Object.keys(sandboxFiles).length > 0;

  // Live site link (Vercel / ClassGrid Sites) from the latest assistant message, for build-step projects
  const liveSiteUrl = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m?.role !== 'assistant') continue;
      const match = (m.content || "").match(/https?:\/\/[a-z0-9.-]+\.(?:vercel\.app|sites\.classgrid\.in)(?:\/[^\s)"'<>\]`]*)?/i);
      return match ? match[0] : null;
    }
    return null;
  }, [messages]);

  // Watch for the latest assistant message to finish typing
  const isAssistantTyping = useMemo(() => {
    const lastMsg = messages[messages.length - 1];
    return lastMsg?.role === 'assistant' && lastMsg?.typing;
  }, [messages]);

  const prevIsTypingRef = useRef(isAssistantTyping);

  useEffect(() => {
    prevIsTypingRef.current = isAssistantTyping;
  }, [isAssistantTyping]);

  useEffect(() => {
    if (hasPlan) {
      setShowFilesPanel(true);
    }
  }, [hasPlan]);

  // The plan card's "View Plan" button opens the side panel (outside Project Mode)
  useEffect(() => {
    const open = () => setShowFilesPanel(true);
    window.addEventListener("classgrid:open-plan-panel", open);
    return () => window.removeEventListener("classgrid:open-plan-panel", open);
  }, []);

  // ─── Voice Dictation Methods ───
  const getSupportedAudioMimeType = () => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
    return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      const mimeType = getSupportedAudioMimeType();
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setMicStream(null);
        const recordedMimeType = mediaRecorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: recordedMimeType });
        mediaRecorderRef.current = null;
        stream.getTracks().forEach(track => track.stop());

        if (blob.size < 500) { // If the blob is extremely small, it's an empty recording
          setRecordingTime(0);
          return;
        }

        setIsTranscribing(true);
        try {
          const formData = new FormData();
          const ext = recordedMimeType.includes('mp4') ? 'mp4' : recordedMimeType.includes('ogg') ? 'ogg' : 'webm';
          formData.append('audio', new window.File([blob], `dictation.${ext}`, { type: recordedMimeType }));

          const endpoint = typeof import.meta !== "undefined" && import.meta.env
            ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/voice/transcribe"
            : "/api/voice/transcribe";

          const token = localStorage.getItem("token");
          const res = await fetchWithRescue(endpoint, {
            method: "POST",
            body: formData,
            credentials: "include",
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
          });

          if (!res.ok) {
            const errorText = await res.text().catch(() => "");
            console.error("Transcription API error:", res.status, errorText);
            throw new Error(`API error: ${res.status}`);
          }

          const data = await res.json();
          if (data.success && data.text) {
            setInput(prev => prev ? prev + " " + data.text : data.text);
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 180)}px`;
              }
            }, 100);
          } else {
            toast.error("Failed to transcribe audio");
          }
        } catch (err) {
          console.error("Transcription fetch error:", err);
          toast.error("Error transcribing audio");
        } finally {
          setIsTranscribing(false);
          setRecordingTime(0);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing mic", err);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === "recording") {
        try { mediaRecorderRef.current.requestData(); } catch (e) { }
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // ─── Header Action Handlers ───
  const handleDirectShare = async () => {
    if (!sessionId) return;
    const loadingToast = toast.loading("Generating share link...");
    try {
      const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
        : "";
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${sessionId}/public-share`, {
        method: "POST",
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.shareUrl) {
          await navigator.clipboard.writeText(data.shareUrl);
          toast.success("Link copied to clipboard!");
        }
      } else {
        toast.error("Failed to generate link");
      }
    } catch (e) {
      toast.error("Error creating share link");
    } finally {
      toast.dismiss(loadingToast);
    }
  };

  const handlePinToggle = async () => {
    if (!sessionId) return;
    try {
      const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
        : "";
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !isPinned }),
        credentials: "include"
      });
      if (res.ok) {
        setIsPinned(!isPinned);
        toast.success(!isPinned ? "Chat pinned" : "Chat unpinned");
        window.dispatchEvent(new Event("agent:refresh-sessions"));
      } else {
        toast.error("Failed to update pin status");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeletingChat, setIsDeletingChat] = React.useState(false);

  const handleDeleteChat = async () => {
    if (!sessionId) return;
    setIsDeletingChat(true);
    try {
      const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
        : "";
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (res.ok) {
        toast.success("Chat deleted");
        setShowDeleteConfirm(false);
        window.dispatchEvent(new Event("agent:refresh-sessions"));

        // Clear local state instantly
        setMessages([]);
        if (typeof setLocalSessionId === "function") setLocalSessionId(null);


        // Go back to the base agent path to clear the chat view
        const currentPath = window.location.pathname;
        const pathParts = currentPath.split('/');
        const agentIndex = pathParts.indexOf('agent') !== -1 ? pathParts.indexOf('agent') : pathParts.indexOf('studio');
        if (agentIndex !== -1) {
          const baseAgentPath = pathParts.slice(0, agentIndex + 1).join('/');
          if (currentPath !== baseAgentPath) {
            window.history.pushState(null, "", baseAgentPath);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      } else {
        toast.error("Failed to delete chat");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsDeletingChat(false);
    }
  };
  // ──────────────────────────────

  const chatFiles = useMemo(() => {
    const files: { url: string; name: string; mimeType: string }[] = [];
    messages.forEach(m => {
      if (m.attachments) {
        m.attachments.forEach(a => {
          files.push(a);
        });
      }
    });
    return files;
  }, [messages]);

  useEffect(() => {
    if (tocItems.length === 0) return;

    // Initially select the last item if none is selected
    if (!activeSection) {
      setActiveSection(tocItems[tocItems.length - 1].id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the top-most visible intersecting element
        const intersecting = entries.filter(e => e.isIntersecting);
        if (intersecting.length > 0) {
          // Sort by top offset to get the highest one in the viewport
          intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          setActiveSection(intersecting[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -70% 0px" } // Triggers when element is in top 30% of screen
    );

    // Give the DOM a moment to render new messages before observing
    const timeoutId = setTimeout(() => {
      tocItems.forEach((item) => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [tocItems]);

  const [thinkingLabel, setThinkingLabel] = useState("Thinking");
  const params = useParams<{ sessionId?: string; "*"?: string }>();
  const routeSessionId = params.sessionId;
  const detailId = params["*"] || undefined;
  const [localSessionId, setLocalSessionId] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [viewingPastedText, setViewingPastedText] = useState<{ title: string, content: string } | null>(null);
  const [isExpandedBox, setIsExpandedBox] = useState(false);

  // Use route parameter if present (dashboard mode), otherwise fallback to local state (website floating mode)
  const sessionId = routeSessionId || localSessionId;

  // Every tool the agent (or one of its helpers) starts and finishes, for Studio Mode's live Files and Terminal tabs
  const agentToolArgsRef = useRef<Record<string, any[]>>({});
  const helperToolRef = useRef<Record<string, { tool: string; args: any }>>({});
  const announceAgentTool = (phase: "start" | "end", tool: string | undefined, args?: any, result?: any) => {
    if (!tool) return;
    const started = (agentToolArgsRef.current[tool] ||= []);
    if (phase === "start") started.push(args);
    else args = started.shift();
    window.dispatchEvent(new CustomEvent("agent:tool", { detail: { phase, tool, args, result } }));
  };
  const setSessionId = setLocalSessionId; // Keep existing setSessionId calls pointing to local state for backward compatibility

  // Project mode: a chat started here gets its id in the address, so the code editor next to it opens this chat's
  // sandbox folder. The chat is already on screen, so the route change must not reload it.
  const urlSyncedSessionRef = useRef<string | null>(null);
  useEffect(() => {
    if (variant !== "overlay" || !localSessionId || routeSessionId) return;
    const parts = window.location.pathname.split("/");
    if (parts[parts.length - 1] !== "project") return;
    urlSyncedSessionRef.current = localSessionId;
    window.history.pushState(null, "", `${window.location.pathname}/${localSessionId}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [localSessionId, routeSessionId, variant]);

  // Incognito (full page only): the server saves the chat hidden from the user's lists; this browser keeps its id and
  // messages in local storage, so a refresh brings it back (unless the address is for a saved chat). Closing deletes it.
  const [isIncognito, setIsIncognito] = useState(() => {
    try {
      return variant === "full-page" && !routeSessionId && !new URLSearchParams(window.location.search).get("session") && !!loadIncognitoChat()?.length;
    } catch { return false; }
  });
  const enteringIncognitoRef = useRef(false);
  useEffect(() => {
    if (!isIncognito) return;
    const saved = loadIncognitoChat();
    if (saved?.length) setMessages((prev) => (prev.length ? prev : saved));
    const savedId = loadIncognitoSessionId();
    if (savedId) setSessionId(savedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!isIncognito) return;
    const t = setTimeout(() => saveIncognitoChat(messages, sessionId), 400);
    return () => clearTimeout(t);
  }, [isIncognito, messages, sessionId]);
  // "New Chat" or opening a saved chat from the sidebar leaves incognito (like claude.ai)
  useEffect(() => {
    const leave = () => {
      if (enteringIncognitoRef.current) { enteringIncognitoRef.current = false; return; }
      setIsIncognito((on) => { if (on) clearIncognitoChat(); return false; });
    };
    window.addEventListener("agent:new-chat", leave);
    window.addEventListener("agent:load-chat", leave);
    return () => { window.removeEventListener("agent:new-chat", leave); window.removeEventListener("agent:load-chat", leave); };
  }, []);
  const enterIncognitoNow = () => {
    clearIncognitoChat();
    enteringIncognitoRef.current = true;
    setIsIncognito(true);
    window.dispatchEvent(new Event("agent:new-chat"));
  };
  const leaveIncognitoNow = () => {
    clearIncognitoChat();
    setIsIncognito(false);
    window.dispatchEvent(new Event("agent:new-chat"));
  };
  // Opening / closing play the cover animation from the pressed button; the chat switches while the screen is covered
  const [incognitoRun, setIncognitoRun] = useState<IncognitoRun | null>(null);
  const incognitoPoint = (e?: React.MouseEvent<HTMLElement>) => {
    const r = e?.currentTarget?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth - 40, y: 40 };
  };
  const startIncognito = (e?: React.MouseEvent<HTMLElement>) => {
    if (incognitoRun) return;
    setIncognitoRun({ kind: "enter", ...incognitoPoint(e), id: Date.now() });
  };
  const exitIncognito = (e?: React.MouseEvent<HTMLElement>) => {
    if (incognitoRun) return;
    setIncognitoRun({ kind: "exit", ...incognitoPoint(e), id: Date.now() });
  };
  const [copiedAll, setCopiedAll] = useState(false);
  const [lastSentDocsPath, setLastSentDocsPath] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback(() => {
    if (!chatScrollRef.current) return;
    isAutoScrollingRef.current = true;
    chatScrollRef.current.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth"
    });
    setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 200);
    userScrolledUpRef.current = false;
    setShowScrollButton(false);
  }, []);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // â”€â”€ File attachment state â”€â”€
  const [attachedFiles, setAttachedFiles] = useState<UIFileAttachment[]>([]);
  const [pastedTexts, setPastedTexts] = useState<string[]>([]);
  const [editingMode, setEditingMode] = useState<'input' | number | null>(null);
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);
  // File cards in the answer (PDF, Word, PowerPoint, Excel) open in the chat's own file viewer
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isRestoredRef = useRef(false);

  // â”€â”€ Local Storage Draft Persistence â”€â”€
  useEffect(() => {
    try {
      const savedInput = localStorage.getItem("askAiDraftInput");
      if (savedInput) setInput(savedInput);

      const savedFilesStr = localStorage.getItem("askAiDraftFiles");
      if (savedFilesStr) {
        const savedFiles = JSON.parse(savedFilesStr) as UIFileAttachment[];
        // Only restore files that finished uploading and have URLs,
        // because we can't restore the raw File object to resume failed uploads.
        const validRestoredFiles = savedFiles.filter(f => f.status === "done" && f.url);
        if (validRestoredFiles.length > 0) {
          setAttachedFiles(validRestoredFiles);
        }
      }

      const savedContext = localStorage.getItem("askAiDraftContext");
      if (savedContext) setLastSentDocsPath(savedContext);

      const savedPasted = localStorage.getItem("askAiDraftPastedTexts");
      if (savedPasted) setPastedTexts(JSON.parse(savedPasted));
    } catch (err) {
      console.error("Failed to restore Ask AI draft:", err);
    } finally {
      setTimeout(() => {
        isRestoredRef.current = true;
      }, 0);
    }
  }, []);

  useEffect(() => {
    if (!isRestoredRef.current) return;

    if (input.trim() || attachedFiles.length > 0 || pastedTexts.length > 0) {
      localStorage.setItem("askAiDraftInput", input);

      const filesToSave = attachedFiles
        .filter(f => f.status === "done" && f.url)
        .map(f => ({
          id: f.id,
          name: f.name,
          size: f.size,
          type: f.type,
          status: f.status,
          url: f.url
        }));
      localStorage.setItem("askAiDraftFiles", JSON.stringify(filesToSave));
      localStorage.setItem("askAiDraftPastedTexts", JSON.stringify(pastedTexts));
    } else {
      localStorage.removeItem("askAiDraftInput");
      localStorage.removeItem("askAiDraftFiles");
      localStorage.removeItem("askAiDraftPastedTexts");
    }

    if (lastSentDocsPath) {
      localStorage.setItem("askAiDraftContext", lastSentDocsPath);
    } else {
      localStorage.removeItem("askAiDraftContext");
    }
  }, [input, attachedFiles, pastedTexts, lastSentDocsPath]);

  const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB
  const ACCEPTED_FILE_TYPES = "image/*,audio/*,video/*,.pdf,.md,.txt,.csv,.doc,.docx,.xlsx,.pptx";

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return FileImage;
    if (mimeType.startsWith("video/")) return Video;
    if (mimeType.startsWith("audio/")) return Music;
    if (mimeType === "application/pdf") return FileText;
    return File;
  }

  const processFiles = useCallback(async (files: File[]) => {
    const newFiles: UIFileAttachment[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      status: "uploading"
    }));

    for (const f of newFiles) {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" is too large (${formatFileSize(f.size)}).`, { description: "Limit: 6 files • 150MB each" });
        return;
      }
    }

    if (newFiles.length === 0) return;

    const remaining = 6 - attachedFiles.length;

    if (remaining <= 0) {
      toast.error("You can attach up to 6 files per message.");
      return;
    }

    let accepted = newFiles;
    let droppedWarning = false;
    if (newFiles.length > remaining) {
      droppedWarning = true;
      accepted = newFiles.slice(0, remaining);
    }

    // Show files in UI immediately (optimistic) â€” no delay like Vercel/ChatGPT
    setAttachedFiles(prev => [...prev, ...accepted]);

    // If we had dropped files, show the warning now
    if (droppedWarning) {
      toast.error("You can attach up to 6 files per message.");
    }

    // Pre-flight check: See if we have enough hourly quota
    try {
      const preCheck = await checkAiUploadRateLimit(accepted.length);
      if (preCheck.error) {
        toast.error(preCheck.error);
        // Remove optimistically added files since quota is exceeded
        const acceptedIds = accepted.map(f => f.id);
        setAttachedFiles(prev => prev.filter(f => !acceptedIds.includes(f.id)));
        return;
      }
    } catch (err) {
      console.error("Pre-flight rate limit check failed:", err);
      // Fail open so we don't break the app if DB is down
    }

    let rateLimitToastShown = false;

    // Upload accepted files immediately in the background
    for (const newFile of accepted) {
      try {
        const result = await getPresignedUrlForAskAiFile(newFile.name, newFile.type, newFile.size);
        if ("error" in result) {
          if (!rateLimitToastShown) {
            toast.error(result.error);
            rateLimitToastShown = true;
          }

          if (result.error.includes("maximum limit")) {
            // If it's a rate limit, remove this file and all remaining unprocessed files from the UI
            const remainingIds = accepted.slice(accepted.indexOf(newFile)).map(f => f.id);
            setAttachedFiles(prev => prev.filter(f => !remainingIds.includes(f.id)));
            break; // Abort the rest of the batch
          } else {
            // For normal errors (like network/size), leave it as a red Failed box
            setAttachedFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: "error" } : f));
          }
          continue;
        }

        // Upload directly to R2 via presigned URL
        if (!newFile.file) throw new Error("Missing file blob for upload");

        if (result.uploadUrl === "mock") {
          // Simulate a network upload delay for the mock
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          await fetch(result.uploadUrl, {
            method: "PUT",
            body: newFile.file,
            headers: { "Content-Type": newFile.type },
          });
        }

        // Mark as done and save URL
        const finalUrl = result.publicUrl === "mock" ? URL.createObjectURL(newFile.file) : result.publicUrl;
        setAttachedFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: "done", url: finalUrl } : f));
      } catch (err) {
        console.error(`Failed to upload ${newFile.name}:`, err);
        if (!rateLimitToastShown) {
          toast.error(`Failed to upload "${newFile.name}".`);
        }
        setAttachedFiles(prev => prev.map(f => f.id === newFile.id ? { ...f, status: "error" } : f));
      }
    }
  }, [attachedFiles.length]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    await processFiles(Array.from(files));
    e.target.value = "";
  }, [processFiles]);

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData?.getData("text/plain");
    const wordCount = pastedText ? pastedText.trim().split(/\s+/).length : 0;

    // Create chip only if the pasted text has more than 600 WORDS
    if (pastedText && wordCount > 600) {
      e.preventDefault();
      setPastedTexts(prev => {
        if (prev.length >= 2) {
          setTimeout(() => toast.error("You can only attach up to 2 long texts per message."), 0);
          return prev;
        }
        return [...prev, pastedText];
      });
      return;
    }

    // Copied text with formatting (from a website, a doc, an AI answer): keep it as markdown, so links, bold,
    // code and lists stay and the sent message shows them formatted. Plain text pastes are unchanged.
    const pastedHtml = e.clipboardData?.getData("text/html") || "";
    const hasFiles = Array.from(e.clipboardData?.items || []).some((it) => it.kind === "file");
    if (e.currentTarget.tagName === "TEXTAREA" && !hasFiles && pastedHtml && /<(a\s[^>]*href|strong|b|em|i|code|pre|ul|ol|h[1-6]|blockquote|del|s)[\s>]/i.test(pastedHtml)) {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      let markdown = pastedText || "";
      try {
        const TurndownService = (await import("turndown")).default;
        const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
        td.remove(["script", "style", "img", "meta", "head"] as any);
        const doc = new DOMParser().parseFromString(pastedHtml, "text/html");
        // Google Docs wraps the whole copy in a "not bold" <b>: unwrap it so everything doesn't turn bold
        doc.querySelectorAll('b[id^="docs-internal-guid"]').forEach((b) => b.replaceWith(...Array.from(b.childNodes)));
        markdown = td.turndown(doc.body.innerHTML).trim() || markdown;
      } catch { /* keep the plain text */ }
      setInput((prev) => prev.slice(0, start) + markdown + prev.slice(end));
      setTimeout(() => {
        try { el.selectionStart = el.selectionEnd = start + markdown.length; } catch { /* textarea gone */ }
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
      }, 10);
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      await processFiles(pastedFiles);

      // If they copied both an image AND text (e.g., from a website), make sure the text isn't lost!
      if (pastedText && pastedText.trim() && wordCount <= 2000) {
        setInput(prev => {
          if (!prev) return pastedText;
          return prev + (prev.endsWith(" ") || prev.endsWith("\n") ? "" : " ") + pastedText;
        });

        // Auto-adjust height after programmatic text insertion
        setTimeout(() => {
          const els = document.querySelectorAll("textarea[name='askAiQuestion']") as NodeListOf<HTMLTextAreaElement>;
          els.forEach(el => {
            el.style.height = 'auto';
            el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
          });
        }, 10);
      }
    }
  }, [processFiles, setInput]);

  const removeAttachedFile = useCallback((id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Restore active chat on page reload, or start fresh if user changed
  useEffect(() => {
    if (readOnly) return; // Do not overwrite state for read-only viewer (e.g. Shared Chat)

    const currentEmail = session?.user?.email || "";
    const storedEmail = localStorage.getItem("classgrid_ai_user_email") || "";
    const savedSessionId = sessionStorage.getItem("classgrid_ai_session_id");
    const savedHistory = sessionStorage.getItem("classgrid_ai_chat_history");

    // If the user changed (logout + login as different user) OR if we have a current user but no stored user (legacy chat), clear old chat
    const userChanged = (currentEmail && storedEmail && currentEmail !== storedEmail) || (currentEmail && !storedEmail);

    if (!userChanged && savedSessionId && savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
          setSessionId(savedSessionId);
          setMessages(parsedHistory);
          return;
        }
      } catch (e) {
        // ignore parse error and fall through to fresh start
      }
    }

    // Fresh start â€” clear chat history
    setMessages([]);
    setSessionId(null);
    setChatEnded(null);
    setLastSentDocsPath(null);

    // ONLY clear drafts if the user actually changed (security)
    if (userChanged) {
      setInput("");
      setAttachedFiles([]);
      setPastedTexts([]);
      localStorage.removeItem("askAiDraftInput");
      localStorage.removeItem("askAiDraftFiles");
      localStorage.removeItem("askAiDraftPastedTexts");
    }

    localStorage.removeItem("askAiDraftContext");
    if (currentEmail) {
      localStorage.setItem("classgrid_ai_user_email", currentEmail);
    }

    // A question from an "Ask Classgrid" link (chat.classgrid.in/?q=...) goes into the message box, ready to send
    const pendingPrompt = sessionStorage.getItem("classgrid:pendingPrompt");
    if (pendingPrompt) {
      sessionStorage.removeItem("classgrid:pendingPrompt");
      setInput(pendingPrompt);
    }
  }, []);

  // Listen for external commands (like clicking "New Chat" or an old chat in the sidebar)
  useEffect(() => {
    const detachRunningReply = () => {
      chatGenRef.current++;
      typingRunRef.current++; // stop any typing animation of the old reply
      setThinking(false);
      setSubmitting(false);
      setMessageQueue([]);
      setPriorityMessage(null);
    };

    const handleNewChat = () => {
      detachRunningReply();
      setMessages([]);
      setSessionId(null);
      setChatEnded(null);
      setInput("");
      setAttachedFiles([]);
      setLastSentDocsPath(null);

      // CLEAR BUFFERS SO OLD STREAM DOESN'T BLEED IN
      tokenBufferRef.current = "";
      thoughtBufferRef.current = "";
      wordTypingActiveRef.current = false;

      localStorage.removeItem("askAiDraftContext");

      // Focus input
      setTimeout(() => {
        const input = document.getElementById("ai-chat-input");
        if (input) input.focus();

        // Check if there is an attached file waiting to be added
        const attachUrl = sessionStorage.getItem("agent:attach_file_url");
        const attachName = sessionStorage.getItem("agent:attach_file_name");

        if (attachUrl) {
          sessionStorage.removeItem("agent:attach_file_url");
          sessionStorage.removeItem("agent:attach_file_name");

          const newFile: UIFileAttachment = {
            id: Math.random().toString(36).substring(7),
            name: attachName || attachUrl.split('/').pop() || "attached_file",
            size: 0,
            type: mimeFromUrl(attachUrl),
            status: "done",
            url: attachUrl
          };
          setAttachedFiles([newFile]);
        }

        // Check if there is a pre-filled prompt waiting to be auto-sent
        const prefillPrompt = sessionStorage.getItem("agent:schedule_prompt");
        if (prefillPrompt) {
          sessionStorage.removeItem("agent:schedule_prompt");
          if (askQuestionRef.current) {
            askQuestionRef.current(prefillPrompt, { explicitSessionId: null });
          }
        }
      }, 100);
    };

    const handleLoadChat = async (e: any) => {
      const id = e.detail?.sessionId;
      if (!id || id === "schedule" || id === "library") return;

      detachRunningReply();
      setMessages([]);
      setSessionId(id);
      setIsLoadingChat(true);
      setIsPinned(false);

      // CLEAR BUFFERS SO OLD STREAM DOESN'T BLEED IN
      tokenBufferRef.current = "";
      thoughtBufferRef.current = "";
      wordTypingActiveRef.current = false;

      try {
        const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
          ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
          : "";
        const sessionRes = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}`, { credentials: "include" });
        if (sessionRes.ok) {
          const sData = await sessionRes.json();
          // A project's chat opened from Agent mode (Library, an old link...): open it in Project Mode, in its project
          const parts = window.location.pathname.split("/");
          const agentAt = parts.indexOf("agent");
          if (sData.projectId && agentAt !== -1) {
            try { localStorage.setItem("cg_project_open", sData.projectId); sessionStorage.setItem("cg_project_open", sData.projectId); } catch { /* storage blocked */ }
            parts[agentAt] = "project";
            window.location.assign(parts.slice(0, agentAt + 1).join("/") + `/${id}`);
            return;
          }
          if (sData.session) setIsPinned(!!sData.session.pinned);
          setChatEnded(sData.session?.ended
            ? { reason: sData.session.end_reason ?? null, canReopen: sData.session.end_reason === "user_requested" }
            : null);
        }

        const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${id}/messages`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const loadedMessages = data.messages.map((m: any) => {
            let content = m.content;
            let thought = undefined;
            let steps = undefined;
            let sources = undefined;
            let workedMs: number | undefined = undefined;
            let checkpoint: string | undefined = undefined;

            if (m.role === 'assistant') {
              let parsed = m.content;
              if (typeof m.content === 'string') {
                try {
                  parsed = JSON.parse(m.content);
                } catch (e) {
                  // Not JSON, ignore
                }
              }
              if (parsed && typeof parsed === 'object' && parsed.classgrid_ai_message) {
                content = parsed.content;
                thought = parsed.thought;
                steps = parsed.steps;
                sources = parsed.sources;
                workedMs = typeof parsed.worked_ms === 'number' ? parsed.worked_ms : undefined;
                checkpoint = typeof parsed.checkpoint === 'string' ? parsed.checkpoint : undefined;
              }
            }

            return {
              role: m.role,
              content: content,
              thought: thought,
              steps: steps,
              sources: sources,
              workedMs: workedMs,
              checkpoint,
              fileUrls: m.file_urls || undefined,
              senderEmail: m.sender_email || undefined,
              attachments: m.file_urls && m.file_urls.length > 0 ? m.file_urls.map((url: string) => ({
                url: url,
                name: url.split('/').pop() || "attachment",
                mimeType: mimeFromUrl(url),
                size: 0
              })) : undefined,
              createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now()
            };
          });
          setMessages(loadedMessages);
        }
      } catch (err) {
        console.error("Failed to load chat", err);
      } finally {
        setIsLoadingChat(false);
      }
    };

    // Another part of the page sends a message for the user (e.g. Project Mode's "Ask Agent to create repo")
    const handleAsk = (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text;
      if (text) askQuestionRef.current?.(text);
    };

    window.addEventListener("agent:new-chat", handleNewChat);
    window.addEventListener("agent:load-chat", handleLoadChat);
    window.addEventListener("agent:ask", handleAsk);

    return () => {
      window.removeEventListener("agent:new-chat", handleNewChat);
      window.removeEventListener("agent:load-chat", handleLoadChat);
      window.removeEventListener("agent:ask", handleAsk);
    };
  }, []);

  // Sync chat when routeSessionId changes
  const [routeLoadAttempt, setRouteLoadAttempt] = useState(0);
  useEffect(() => {
    if (!routeSessionId || routeSessionId === "schedule" || routeSessionId === "library") return;
    if (urlSyncedSessionRef.current === routeSessionId) { urlSyncedSessionRef.current = null; return; }

    // Each load gets its own abort controller: opening another chat (or leaving) cancels this one,
    // so a late reply can never overwrite the chat that is open now.
    const controller = new AbortController();
    const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
      : "";

    // One request with a 15 s timeout (a stuck connection must not leave the skeleton up forever)
    const getJson = async (url: string) => {
      const timeout = new AbortController();
      const timer = window.setTimeout(() => timeout.abort(), 15000);
      const onCancel = () => timeout.abort();
      controller.signal.addEventListener("abort", onCancel);
      try {
        const res = await fetchWithRescue(url, { credentials: "include", signal: timeout.signal });
        if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
        return await res.json();
      } finally {
        window.clearTimeout(timer);
        controller.signal.removeEventListener("abort", onCancel);
      }
    };

    const loadRouteSession = async () => {
      // Opening another chat: a reply still streaming for the previous chat must not land in this one
      // (re-opening the same chat keeps its running reply)
      if (routeSessionId !== sessionId) {
        chatGenRef.current++;
        typingRunRef.current++;
        setThinking(false);
        setSubmitting(false);
        setMessageQueue([]);
        setPriorityMessage(null);
        setChatEnded(null);
      }
      setMessages([]);
      setSessionId(routeSessionId);
      setIsLoadingChat(true);
      setIsPinned(false);
      try {
        let data: any = null;
        for (let attempt = 0; attempt < 2 && !data; attempt++) {
          try {
            // Session details and messages load at the same time
            const [sData, mData] = await Promise.all([
              getJson(`${endpointPrefix}/api/ai/sessions/${routeSessionId}`).catch(() => null),
              getJson(`${endpointPrefix}/api/ai/sessions/${routeSessionId}/messages`),
            ]);
            if (controller.signal.aborted) return;
            if (sData?.session) setIsPinned(!!sData.session.pinned);
            if (sData?.session) {
              setChatEnded(sData.session.ended
                ? { reason: sData.session.end_reason ?? null, canReopen: sData.session.end_reason === "user_requested" }
                : null);
              setEndedCheckedFor(routeSessionId);
            }
            data = mData;
          } catch (err: any) {
            if (controller.signal.aborted) return;
            // Not found / not yours: retrying won't help
            if (attempt === 1 || err?.status === 403 || err?.status === 404) throw err;
          }
        }
        const loadedMessages = (data.messages || []).map((m: any) => {
            let content = m.content;
            let thought = undefined;
            let steps = undefined;
            let sources = undefined;
            let workedMs: number | undefined = undefined;
            let checkpoint: string | undefined = undefined;

            if (m.role === 'assistant') {
              let parsed = m.content;
              if (typeof m.content === 'string') {
                try {
                  parsed = JSON.parse(m.content);
                } catch (e) {
                  // Not JSON, ignore
                }
              }
              if (parsed && typeof parsed === 'object' && parsed.classgrid_ai_message) {
                content = parsed.content;
                thought = parsed.thought;
                steps = parsed.steps;
                sources = parsed.sources;
                workedMs = typeof parsed.worked_ms === 'number' ? parsed.worked_ms : undefined;
                checkpoint = typeof parsed.checkpoint === 'string' ? parsed.checkpoint : undefined;
              }
            }

            return {
              id: m.id || crypto.randomUUID(),
              role: m.role,
              content: content,
              thought: thought,
              steps: steps,
              sources: sources,
              workedMs: workedMs,
              checkpoint,
              fileUrls: m.file_urls || undefined,
              senderEmail: m.sender_email || undefined,
              attachments: m.file_urls && m.file_urls.length > 0 ? m.file_urls.map((url: string) => ({
                url: url,
                name: url.split('/').pop() || "attachment",
                mimeType: mimeFromUrl(url),
                size: 0
              })) : undefined,
              createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now()
            };
          });
          setMessages(loadedMessages);
      } catch (err: any) {
        if (controller.signal.aborted) return;
        console.error("Failed to load chat from route", err);
        toast.error(err?.status === 403 || err?.status === 404 ? "This chat was not found." : "Couldn't load this chat.", {
          action: err?.status === 403 || err?.status === 404 ? undefined : { label: "Retry", onClick: () => setRouteLoadAttempt((n) => n + 1) },
        });
      } finally {
        if (!controller.signal.aborted) setIsLoadingChat(false);
      }
    };
    loadRouteSession();
    return () => controller.abort();
  }, [routeSessionId, routeLoadAttempt]);

  // Save chat history and session ID to local storage whenever they update
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("agent:active-session-changed", { detail: { sessionId } }));

    // Sync URL so refreshing doesn't lose the active session
    if (variant === "full-page" && typeof window !== "undefined") {
      const currentPath = window.location.pathname;
      const pathParts = currentPath.split('/');
      const agentIndex = pathParts.indexOf('agent') !== -1 ? pathParts.indexOf('agent') : pathParts.indexOf('studio');

      if (agentIndex !== -1) {
        const baseAgentPath = pathParts.slice(0, agentIndex + 1).join('/');
        const expectedPath = sessionId ? `${baseAgentPath}/${sessionId}` : baseAgentPath;
        if (currentPath !== expectedPath && !currentPath.startsWith(expectedPath + '/')) {
          window.history.replaceState(null, "", expectedPath);
        }
      }
    }
  }, [messages, sessionId, variant]);
  const [submitting, setSubmitting] = useState(false);

  // Share Grid: people in this chat, and live updates when someone else sends a message
  const gridSessionId = sessionId && !isIncognito && sessionId !== "schedule" && sessionId !== "library" ? sessionId : null;
  const gridSubmittingRef = useRef(submitting);
  gridSubmittingRef.current = submitting;
  const gridOpenChatRef = useRef(gridSessionId);
  gridOpenChatRef.current = gridSessionId;
  const gridMyEmailRef = useRef("");
  gridMyEmailRef.current = (session?.user?.email || "").toLowerCase();
  const refreshSharedMessages = React.useCallback(async (e?: { by?: string; kind?: string; reason?: string | null; canReopen?: boolean }) => {
    // The chat was ended (by anyone's message): it ends on my screen too
    if (e?.kind === "ended") {
      setChatEnded({ reason: e.reason ?? null, canReopen: !!e.canReopen });
      setMessageQueue([]);
      setPriorityMessage(null);
    }
    if (!gridSessionId || gridSubmittingRef.current) return; // my own reply is streaming: it shows already
    // My own message and its reply are already on my screen: reloading them re-draws the chat (the Thought box flashed)
    if (e?.by && e.by.toLowerCase() === gridMyEmailRef.current) return;
    try {
      const prefix = import.meta.env.VITE_API_URL || "https://api.classgrid.in";
      const forChat = gridSessionId;
      const res = await fetchWithRescue(`${prefix}/api/ai/sessions/${forChat}/messages`, { credentials: "include" });
      if (gridOpenChatRef.current !== forChat) return; // the user opened another chat meanwhile
      if (res.status === 403 || res.status === 404) {
        toast.error("You're no longer in this shared chat.");
        window.location.assign(window.location.pathname.startsWith("/superadmin") ? "/superadmin/agent" : "/agent");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (gridOpenChatRef.current === forChat && !gridSubmittingRef.current) setMessages((data.messages || []).map(toChatMessage));
    } catch { /* next update will try again */ }
  }, [gridSessionId]);
  const grid = useShareGrid(gridSessionId, refreshSharedMessages);
  const gridMyEmail = (session?.user?.email || "").toLowerCase();
  const gridPeople = React.useMemo(() => Object.fromEntries((grid.data?.members || []).map((p) => [p.email, p])), [grid.data]);
  const gridOwner = grid.data?.members?.find((p) => p.role === "owner");
  // Messages from before the chat was shared have no sender: they are the owner's
  const gridStart = gridOwner?.joinedAt ? new Date(gridOwner.joinedAt).getTime() : 0;
  const gridSenderOf = (m: ChatMessage) => m.senderEmail?.toLowerCase() || (m.createdAt < gridStart ? gridOwner?.email : gridMyEmail);
  // The agent is answering someone else in this shared chat: I can't send until it's done
  const gridBlockedBy = grid.replying && grid.replying.email.toLowerCase() !== gridMyEmail ? grid.replying : null;
  // "X joined the chat" lines: each one shows just before the first message sent after that person joined
  const gridJoinLines = React.useMemo(() => {
    if (!grid.shared || !grid.data) return { byMessage: {} as Record<string, any[]>, after: [] as any[] };
    const via: Record<string, string> = {};
    for (const h of grid.data.history) if (h.status === "accepted" && h.email && !via[h.email.toLowerCase()]) via[h.email.toLowerCase()] = h.type;
    const joins = grid.data.members
      .filter((p) => p.role === "member" && p.joinedAt)
      .map((p) => ({ name: p.name, email: p.email, via: via[p.email], at: new Date(p.joinedAt as string).getTime() }))
      .sort((a, b) => a.at - b.at);
    const visible = messages.filter((m) => !m.hidden && !(m.role === "user" && typeof m.content === "string" && m.content.trim().startsWith("[SYSTEM:")));
    const byMessage: Record<string, any[]> = {};
    const after: any[] = [];
    for (const j of joins) {
      const next = visible.find((m) => m.createdAt >= j.at);
      if (next) (byMessage[next.id] ||= []).push(j);
      else after.push(j);
    }
    return { byMessage, after };
  }, [grid.shared, grid.data, messages]);
  const [error, setError] = useState("");
  const [isTerminated, setIsTerminated] = useState(false);

  // Track page history to answer "what page was I on" questions
  const [pageHistory, setPageHistory] = useState<{ path: string; title: string }[]>([]);

  useEffect(() => {
    if (!pageContext?.path) return;

    try {
      // Load current history from storage
      const savedHistory = localStorage.getItem("classgrid_page_history");
      let history: { path: string; title: string }[] = savedHistory ? JSON.parse(savedHistory) : [];

      const newEntry = {
        path: pageContext.path,
        title: pageContext.title || document.title
      };

      // If the current page is different from the last page in history, add it
      if (history.length === 0 || history[history.length - 1].path !== newEntry.path) {
        history = [...history, newEntry].slice(-8); // Keep max 8 pages
        localStorage.setItem("classgrid_page_history", JSON.stringify(history));
      }

      setPageHistory(history);
    } catch (_) { }
  }, [pageContext?.path, pageContext?.title]);
  const [bannedUntil, setBannedUntil] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);

  // Fetch contextual user data on mount if session exists
  useEffect(() => {
    if (session?.user?.email) {
      const endpoint = typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/user/ai-context"
        : "/api/user/ai-context";

      fetchWithRescue(endpoint, { credentials: "include" })
        .then((res) => {
          if (!res.ok) throw new Error("Network response was not ok");
          return res.json();
        })
        .then((data) => {
          if (data?.userContext) {
            setUserContext(data.userContext);
          }
        })
        .catch((err) => console.error("Failed to fetch user context", err));
    }
  }, [session?.user?.email]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const isGenerating = submitting || thinking || (messages[messages.length - 1]?.typing === true);
  // Studio's Browser tab is locked while the agent works in it
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("agent:generating", { detail: { on: isGenerating } }));
  }, [isGenerating]);

  // Live countdown timer for ban expiry
  useEffect(() => {
    if (!bannedUntil) {
      setCountdown("");
      return;
    }

    const tick = () => {
      const now = Date.now();
      const diff = bannedUntil.getTime() - now;

      if (diff <= 0) {
        // Ban expired â€” unlock the chat!
        setIsTerminated(false);
        setBannedUntil(null);
        setCountdown("");
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(`${mins}m ${secs.toString().padStart(2, "0")}s`);
    };

    tick(); // run immediately
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [bannedUntil]);



  async function handleCopyUserMessage(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (e) {
      console.error("Failed to copy text", e);
    }
  }

  function handleSendEditedMessage(messageId: string) {
    if (!editContent.trim()) return;

    const index = messages.findIndex(m => m.id === messageId);
    if (index === -1) {
      setEditingMessageId(null);
      return;
    }

    const newMessages = messages.slice(0, index);
    setMessages(newMessages);

    setEditingMessageId(null);
    const textToSend = editContent;
    setEditContent("");

    setPriorityMessage({
      id: Date.now().toString(),
      text: textToSend,
      timestamp: Date.now(),
      isEdit: true,
      attachedFiles: [],
      pastedTexts: []
    });
  }

  function handleClearChat() {
    setMessages([]);
    setInput("");
    setSessionId(null);
    setAttachedFiles([]);
    setLastSentDocsPath(null);

    // CLEAR BUFFERS SO OLD STREAM DOESN'T BLEED IN
    tokenBufferRef.current = "";
    thoughtBufferRef.current = "";
    wordTypingActiveRef.current = false;

    localStorage.removeItem("askAiDraftContext");
  }

  function handleStop() {
    // 1. Abort any ongoing network request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // 2. Stop any ongoing typing animation
    typingRunRef.current++;

    // 3. Reset states
    setThinking(false);
    setSubmitting(false);

    // 4. Update the last message to stop the typing indicator
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "assistant" && last.typing) {
        return current.map(m => m.id === last.id ? { ...m, typing: false } : m);
      }
      return current;
    });
  }

  async function handleCopyAll() {
    if (messages.length === 0) return;
    try {
      const text = messages
        .map((m) => `${m.role === "user" ? "You" : "Classgrid AI"}:\n${m.content}`)
        .join("\n\n---\n\n");
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (_) { }
  }

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : null;

  const hasDocsContext = pageContext?.path?.startsWith("/docs") && pageContext.path !== lastSentDocsPath;
  const isAnyFileUploading = attachedFiles.some(f => f.status === "uploading");
  const canSubmit = (input.trim().length > 0 || hasDocsContext || attachedFiles.length > 0 || pastedTexts.length > 0) && !isAnyFileUploading && !gridBlockedBy;
  const emptyState = useMemo(() => messages.length === 0, [messages.length]);
  const suggestedQuestions = useMemo(() => suggestedQuestionsForPage(pageContext, session?.user?.role), [pageContext, session?.user?.role]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 220);

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile || variant === "full-page") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow || "auto";
    };
  }, [open, isMobile]);

  const userScrolledUpRef = useRef(false);
  const prevMessageCountRef = useRef(0);
  const isAutoScrollingRef = useRef(false);

  // Track when user manually scrolls â€” use 'scroll' event which fires for ALL scroll types
  useEffect(() => {
    const element = chatScrollRef.current;
    if (!element) return;

    const handleScroll = () => {
      // Skip if we caused this scroll programmatically
      if (isAutoScrollingRef.current) return;

      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      // Make it highly sensitive: if user scrolls up even slightly (>10px), stop auto-scrolling
      const isScrolledUp = distanceFromBottom > 10;
      userScrolledUpRef.current = isScrolledUp;
      setShowScrollButton(isScrolledUp);
    };

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      element.removeEventListener("scroll", handleScroll);
    };
  }, [open, emptyState]);

  // Auto-scroll when a new message is added or thinking state changes
  useEffect(() => {
    if (!open) return;
    const element = chatScrollRef.current;
    if (!element) return;

    const currentCount = messages.length;
    const isNewMessage = currentCount > prevMessageCountRef.current;
    prevMessageCountRef.current = currentCount;

    // If user scrolled up, don't force them down â€” unless it's a brand new message they just sent
    const lastMessage = messages[messages.length - 1];
    const isUserMessage = lastMessage?.role === "user";

    if (userScrolledUpRef.current && !isUserMessage && !thinking) return;

    // Only auto-scroll on: new message added, thinking started, or user just sent a message
    if (!isNewMessage && !thinking) return;

    // Reset scroll lock when user sends a new message
    if (isUserMessage) {
      userScrolledUpRef.current = false;
    }

    isAutoScrollingRef.current = true;
    requestAnimationFrame(() => {
      element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
      setTimeout(() => { isAutoScrollingRef.current = false; }, 200);
    });
  }, [messages.length, thinking, open]);

  // Follow along during typing animation via a gentle interval
  // instead of reacting to every message state change (which fights user scroll)
  useEffect(() => {
    if (!open) return;
    const element = chatScrollRef.current;
    if (!element) return;

    // Only run while a message is actively being typed or we are streaming
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg?.typing && !thinking && !submitting) return;

    const interval = setInterval(() => {
      // If user scrolled up, respect their position
      if (userScrolledUpRef.current) return;

      const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
      if (distanceFromBottom > 150) return;

      isAutoScrollingRef.current = true;
      element.scrollTo({ top: element.scrollHeight, behavior: "auto" });
      setTimeout(() => { isAutoScrollingRef.current = false; }, 80);
    }, 150);

    return () => clearInterval(interval);
  }, [open, messages.length, messages[messages.length - 1]?.typing, thinking, submitting]);

  // Adaptive drain: reveals buffered stream text at a steady base pace, and speeds up
  // when a burst lands so the screen never trails the stream by more than ~CATCH_UP_MS.
  // Chunk size scales with elapsed time, so slow renders mean bigger chunks, not lag.
  useEffect(() => {
    const BASE_CHARS_PER_SEC = 400;
    const CATCH_UP_MS = 400;
    let lastTick = performance.now();

    const takeChunk = (buffer: string, elapsedMs: number) => {
      if (!buffer) return "";
      if (document.hidden) return buffer;
      const charsPerSec = Math.max(BASE_CHARS_PER_SEC, buffer.length / (CATCH_UP_MS / 1000));
      return buffer.slice(0, Math.max(1, Math.round((charsPerSec * elapsedMs) / 1000)));
    };

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsedMs = now - lastTick;
      lastTick = now;

      const tokenChunk = takeChunk(tokenBufferRef.current, elapsedMs);
      const thoughtChunk = takeChunk(thoughtBufferRef.current, elapsedMs);
      tokenBufferRef.current = tokenBufferRef.current.slice(tokenChunk.length);
      thoughtBufferRef.current = thoughtBufferRef.current.slice(thoughtChunk.length);

      if (tokenChunk || thoughtChunk) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (!lastMsg || lastMsg.role !== 'assistant') return prev;
          return [...prev.slice(0, -1), {
            ...lastMsg,
            ...(tokenChunk ? { content: (lastMsg.content || '') + tokenChunk, typing: true } : {}),
            ...(thoughtChunk ? { thought: (lastMsg.thought || '') + thoughtChunk } : {}),
          }];
        });
      }

      // When both buffers are empty and stream is done, mark typing as finished
      if (tokenBufferRef.current.length === 0 && thoughtBufferRef.current.length === 0 && wordTypingActiveRef.current) {
        // Reset the typing active ref so the queue engine can proceed
        wordTypingActiveRef.current = false;
      }
    }, 33);

    return () => clearInterval(interval);
  }, []);

  function createMessageId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function wait(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  // Reveal is time-based (not per-character) so its total duration stays bounded
  // no matter how expensive each markdown render becomes in a long chat.
  function getRevealDurationMs(length: number) {
    return Math.min(2000, 400 + length * 1.5);
  }

  async function typeAssistantResponse(answer: string) {
    const runId = ++typingRunRef.current;

    setMessages((current) => {
      const last = current[current.length - 1];
      if (last && last.role === "assistant" && !last.content) {
        return current.map(m => m.id === last.id ? { ...m, typing: true } : m);
      }
      return [
        ...current,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          content: "",
          createdAt: Date.now(),
          typing: true,
        },
      ];
    });

    const showText = (text: string) =>
      setMessages((current) => {
        const last = current[current.length - 1];
        if (!last || last.role !== "assistant") return current;
        return [...current.slice(0, -1), { ...last, content: text }];
      });

    if (prefersReducedMotion || document.hidden) {
      showText(answer);
    } else {
      const duration = getRevealDurationMs(answer.length);
      const start = performance.now();
      let shown = 0;

      await new Promise<void>((resolve) => {
        const step = (now: number) => {
          if (runId !== typingRunRef.current) return resolve();

          let target = Math.ceil(answer.length * Math.min(1, (now - start) / duration));
          if (target < answer.length) {
            const nextSpace = answer.indexOf(" ", target);
            target = nextSpace === -1 ? answer.length : nextSpace + 1;
          }
          if (target > shown) {
            shown = target;
            showText(answer.slice(0, shown));
          }

          if (shown >= answer.length) return resolve();
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }

    if (runId !== typingRunRef.current) return;

    setMessages((current) => {
      const last = current[current.length - 1];
      if (!last || last.role !== "assistant") return current;
      return current.map((message) =>
        message.id === last.id ? { ...message, typing: false } : message
      );
    });
  }

  useEffect(() => {
    askQuestionRef.current = askQuestion;
  }, [askQuestion]);

  // Whatever way a chat was opened (refresh restore, sidebar, link), read whether it has ended.
  useEffect(() => {
    if (!sessionId || readOnly) return;
    let cancelled = false;
    const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
      : "";
    fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${sessionId}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.session) {
          setChatEnded(data.session.ended
            ? { reason: data.session.end_reason ?? null, canReopen: data.session.end_reason === "user_requested" }
            : null);
        }
        setEndedCheckedFor(sessionId);
      })
      .catch(() => { if (!cancelled) setEndedCheckedFor(sessionId); });
    return () => { cancelled = true; };
  }, [sessionId, readOnly]);

  // An ended chat takes no queued messages: drop them so they don't fire one by one.
  useEffect(() => {
    if (!chatEnded) return;
    setMessageQueue([]);
    setPriorityMessage(null);
  }, [chatEnded]);

  // Keep the ended-chats list in step with what the server confirmed for this chat.
  useEffect(() => {
    if (!sessionId || endedCheckedFor !== sessionId) return;
    rememberEndedChat(sessionId, chatEnded ? chatEnded.reason : undefined);
  }, [sessionId, endedCheckedFor, chatEnded]);
  const cachedEnded = sessionId ? readEndedChats() : {};
  const endedView = chatEnded ?? (sessionId && sessionId in cachedEnded ? { reason: cachedEnded[sessionId], canReopen: false } : null);

  // "Start a new chat" on the Chat ended card: same as the sidebar's New Chat.
  function handleEndedNewChat() {
    const parts = window.location.pathname.split("/");
    // Agent mode (/agent/<chat>) or Project Mode (/project/<chat>): drop the ended chat from the address, so the
    // new chat stays in the same mode (and in the open project)
    const agentIndex = parts.indexOf("project") !== -1 ? parts.indexOf("project") : parts.indexOf("studio") !== -1 ? parts.indexOf("studio") : parts.indexOf("agent");
    if (agentIndex !== -1 && parts.length > agentIndex + 1) {
      window.history.pushState({}, "", parts.slice(0, agentIndex + 1).join("/"));
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
    window.dispatchEvent(new Event("agent:new-chat"));
  }

  // "Send feedback" on the Chat ended card: the same thumbs-down feedback as on a reply.
  async function submitEndedFeedback(text: string, files: File[]) {
    setEndedFeedbackSubmitting(true);
    try {
      const fileUrls: string[] = [];
      for (const file of files) {
        const result = await getPresignedUrlForAskAiFile(file.name, file.type, file.size);
        if (result.error) {
          toast.error(`Failed to get upload URL for ${file.name}`);
          continue;
        }
        if (result.uploadUrl !== "mock") {
          const uploadRes = await fetch(result.uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
          if (!uploadRes.ok) throw new Error("Upload to R2 failed");
        }
        fileUrls.push(result.publicUrl);
      }
      const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
      const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
        ? import.meta.env.VITE_API_URL || "https://api.classgrid.in"
        : "";
      const token = localStorage.getItem("token");
      await fetchWithRescue(`${endpointPrefix}/api/ai/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messageId: lastAssistant?.id || sessionId, type: "negative", text, fileUrl: fileUrls.length > 0 ? fileUrls.join(",") : null })
      });
      toast.success("Feedback submitted. Thank you!");
      setEndedFeedbackOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback");
    } finally {
      setEndedFeedbackSubmitting(false);
    }
  }

  async function handleReopenChat() {
    if (!sessionId) return;
    try {
      const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
        : "";
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/sessions/${sessionId}/reopen`, { method: "POST", credentials: "include" });
      if (res.ok) setChatEnded(null);
    } catch (_) {
      // keep the card; the user can start a new chat instead
    }
  }

  async function askQuestion(question: string, options?: { hidden?: boolean; isEdit?: boolean; explicitSessionId?: string | null }) {
    if (chatEnded) { setSubmitting(false); return; } // ended chats take no new messages
    const workStartedAt = Date.now(); // for the "Worked for X sec" summary of this reply
    const myGen = chatGenRef.current;
    const isStale = () => chatGenRef.current !== myGen; // the user moved to another chat
    if (!options?.hidden) {
      retryCountRef.current = 0;
    }
    let displayQuestion = question.trim();
    let apiQuestion = question.trim();
    const isDocsContextActive = pageContext?.path?.startsWith("/docs") && pageContext.path !== lastSentDocsPath;

    // Only send files that successfully uploaded
    const filesToUpload = attachedFiles
      .filter(f => f.status === "done" && f.url)
      .map(f => ({
        name: f.name,
        url: f.url!,
        mimeType: f.type,
        size: f.size,
      }));

    if (!apiQuestion && !isDocsContextActive && filesToUpload.length === 0 && pastedTexts.length === 0) return;

    if (pastedTexts.length > 0) {
      apiQuestion = `${apiQuestion}\n\n${pastedTexts.map((pt, i) => `[PASTED TEXT ${i + 1}]:\n${pt}`).join("\n\n")}`;
    }

    if (isDocsContextActive && pageContext?.path && filesToUpload.length === 0) {
      const docsUrl = `https://classgrid.in${pageContext.path}`;
      setLastSentDocsPath(pageContext.path);

      if (!apiQuestion) {
        apiQuestion = `Explain this page: ${pageContext.title || "Documentation"} (${docsUrl})`;
      } else {
        apiQuestion = `${apiQuestion}\n\n*(Context: ${docsUrl})*`;
      }
    }

    // If user only attached files with no text, set a default question
    if (!displayQuestion && filesToUpload.length > 0) {
      displayQuestion = ""; // Leave UI blank so only the image renders
      apiQuestion = "Please analyze the attached file(s).";
    }

    setError("");
    setInput("");
    setAttachedFiles([]);
    setPastedTexts([]);
    localStorage.removeItem("askAiDraftInput");
    localStorage.removeItem("askAiDraftFiles");
    localStorage.removeItem("askAiDraftPastedTexts");
    localStorage.removeItem("askAiDraftContext");

    // CLEAR BUFFERS SO OLD STREAM DOESN'T BLEED IN
    tokenBufferRef.current = "";
    thoughtBufferRef.current = "";
    wordTypingActiveRef.current = false;

    setSubmitting(true);
    setThinking(true);
    setThinkingLabel("Thinking");
    const requestStartTime = Date.now(); // Track when we start thinking
    userScrolledUpRef.current = false; // Reset scroll lock for new question
    setIsExpandedBox(false); // Close expanded box on submit

    const uploadedAttachments: AiAttachment[] = filesToUpload;

    const pastedTextAttachments: AiAttachment[] = pastedTexts.map((pt, i) => ({
      name: pastedTexts.length > 1 ? `Pasted text ${i + 1}.txt` : `Pasted text.txt`,
      url: "",
      mimeType: "text/plain",
      size: new Blob([pt]).size,
      content: pt
    }));

    const allAttachments = [...uploadedAttachments, ...pastedTextAttachments];

    // Record file sends for rate limiting (only counts when actually sent, not uploaded)
    if (uploadedAttachments.length > 0) {
      recordAiFilesSent(uploadedAttachments.length).catch(console.error);
    }

    // We no longer append [Attached file: ...] to apiQuestion here,
    // the backend automatically parses body.fileUrls and handles it!

    const sentContextUrl = isDocsContextActive && pageContext?.path
      ? `https://classgrid.in${pageContext.path}`
      : undefined;
    const sentContextTitle = isDocsContextActive && pageContext?.title
      ? pageContext.title
      : undefined;

    const userMsgId = createMessageId("user");
    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMsgId,
        role: "user",
        content: displayQuestion,
        createdAt: Date.now(),
        contextUrl: sentContextUrl,
        contextTitle: sentContextTitle,
        attachments: allAttachments.length > 0 ? allAttachments : undefined,
        hidden: options?.hidden,
      },
      {
        id: createMessageId("assistant"),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
      },
    ];

    setMessages(nextMessages);

    // Auto-open the Agent sidebar when the user sends their first question
    if (messages.length === 0) {
      window.dispatchEvent(new Event("agent:auto-open-sidebar"));
    }

    // BACKGROUND SUMMARY GENERATOR FOR TOC (Delayed to prevent rate limits)
    if (displayQuestion.length > 25) {
      setTimeout(() => {
        console.log("firing background summary fetch for message:", userMsgId);
        const endpoint = typeof import.meta !== "undefined" && import.meta.env
          ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/ai/ask"
          : "/api/ai/ask";
        fetchWithRescue(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            purpose: "message_summary",
            question: `Create a 3 to 5 word summary title for this message. Output ONLY the raw words, no quotes, no preambles: ${displayQuestion}`,
            history: [{ role: "system", content: "You are a title generator. Output only a short title, without quotes." }],
            isIncognito: true
          })
        })
          .then(async (res) => {
            console.log("background summary fetch response status:", res.status);
            const contentType = res.headers.get("content-type") || "";
            if (contentType.includes("text/event-stream") && res.body) {
              const reader = res.body.getReader();
              const decoder = new TextDecoder();
              let buffer = "";
              let finalAnswer = "";
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";
                for (const part of parts) {
                  const dataMatch = part.match(/^data:\s*(.+)$/m);
                  if (dataMatch) {
                    try {
                      const event = JSON.parse(dataMatch[1]);
                      if (event.type === "answer") {
                        finalAnswer = event.answer;
                        console.log("background summary parsed final answer:", finalAnswer);
                      }
                    } catch (_) { }
                  }
                }
              }
              if (finalAnswer) {
                console.log("updating state with tocSummary:", finalAnswer);
                const safeAnswer = typeof finalAnswer === 'string' ? finalAnswer : String(finalAnswer || '');
                setMessages(prev => prev.map(m => m.id === userMsgId ? { ...m, tocSummary: safeAnswer.trim().replace(/^["']|["']$/g, '') } : m));
              } else {
                console.log("background summary finished but finalAnswer was empty");
              }
            } else {
              console.log("background summary response was not event-stream", contentType);
            }
          })
          .catch(err => console.error("background summary fetch failed:", err));
      }, 2000);
    }

    let wasTerminated = false;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // --- INTERCEPT @Create image ---
    if (apiQuestion.trim().startsWith("@Create image")) {
      const prompt = apiQuestion.replace("@Create image", "").trim() || "A beautiful image";

      // Update assistant message to QUEUED state
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") return prev;
        return [
          ...prev.slice(0, -1),
          { ...lastMsg, content: `[IMAGE_GENERATION_QUEUED: ${prompt}]` }
        ];
      });

      try {
        const endpoint = typeof import.meta !== "undefined" && import.meta.env
          ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/ai/generate-image"
          : "/api/ai/generate-image";

        const res = await fetchWithRescue(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            prompt,
            sessionId: sessionId ?? undefined,
            userEmail: session?.user?.email ?? undefined,
            isIncognito: isIncognito
          })
        });

        if (!res.ok) {
          let errorMsg = "Failed to generate image";
          let limitReached = false;
          try {
            const errData = await res.json();
            if (errData.error) errorMsg = errData.error;
            limitReached = errData.code === "IMAGE_LIMIT_REACHED";
            if (errData.error === "ai_quota_exceeded" && errData.resetDate) {
              errorMsg = `ai_quota_exceeded|${errData.resetDate}`;
              limitReached = true;
            }
          } catch (e) { }
          if (limitReached) {
            // Weekly image limit used up: say so plainly instead of showing a failed-image card
            setMessages(prev => {
              const lastMsg = prev[prev.length - 1];
              if (!lastMsg || lastMsg.role !== "assistant") return prev;
              return [...prev.slice(0, -1), { ...lastMsg, content: errorMsg }];
            });
            return;
          }
          console.error("Backend returned 500 error:", errorMsg);
          throw new Error(errorMsg);
        }

        const data = await res.json();

        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
          setEndedCheckedFor(data.sessionId);
          
          if (variant === "full-page") {
            const pathParts = window.location.pathname.split('/');
            const agentIndex = pathParts.indexOf('agent') !== -1 ? pathParts.indexOf('agent') : pathParts.indexOf('studio');
            // If we are in superadmin context but 'agent' is not in path, default to /superadmin/agent
            const fallbackPath = window.location.pathname.includes('/superadmin') ? '/superadmin/agent' : '/agent';
            const baseAgentPath = agentIndex !== -1 ? pathParts.slice(0, agentIndex + 1).join('/') : fallbackPath;
            
            window.history.pushState({}, "", `${baseAgentPath}?session=${data.sessionId}`);
          }
          window.dispatchEvent(new Event("agent:refresh-sessions"));
        }

        // Preload the image before switching from QUEUED animation to COMPLETE.
        // This keeps the existing loading animation visible until the image is ready,
        // preventing a black box or broken image flash.
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve(); // Still show the URL even if preload fails
          img.src = data.imageUrl;
          // Safety timeout: don't wait more than 60 seconds
          setTimeout(() => resolve(), 60000);
        });

        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            // Use | as separator because prompts can contain colons (e.g. 16:9)
            { ...lastMsg, content: `[IMAGE_GENERATION_COMPLETE: ${prompt} | ${data.imageUrl}]` }
          ];
        });
      } catch (err) {
        console.error("Image generation failed", err);
        setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: `[IMAGE_GENERATION_ERROR: ${prompt}]` }
          ];
        });
      } finally {
        setSubmitting(false);
        setThinking(false);
      }
      return; // Exit early!
    }

    try {
      const endpoint = typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in") + "/api/ai/ask"
        : "/api/ai/ask";
      const response = await fetchWithRescue(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          question: apiQuestion,
          selectedModel,
          userName: session?.user?.name ?? undefined,
          userEmail: session?.user?.email ?? undefined,
          userRole: session?.user?.role ?? undefined,
          isEdit: options?.isEdit,
          subdomain: typeof window !== "undefined" ? window.location.hostname : undefined,
          userContext: userContext,
          sessionId: (options && options.explicitSessionId !== undefined) ? (options.explicitSessionId ?? undefined) : (sessionId ?? undefined),
          isIncognito: isIncognito,
          // Which mode the user is in (Agent, Project or Studio), so the AI knows what the user can see and do
          appMode: (() => {
            const parts = window.location.pathname.split("/");
            return parts.includes("studio") ? "studio" : parts.includes("project") ? "project" : "agent";
          })(),
          // Project Mode: the project open next to the chat (the backend links the chat to it)
          projectId: (() => {
            try {
              const parts = window.location.pathname.split("/");
              if (parts.includes("project")) return (sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")) || undefined;
              if (parts.includes("studio")) return (sessionStorage.getItem("cg_project_open") || localStorage.getItem("cg_project_open")) || undefined; // Studio Mode: the same open project as Project Mode
              return undefined;
            } catch { return undefined; }
          })(),
          fileUrls: uploadedAttachments.length > 0 ? uploadedAttachments.map(a => a.url) : [],
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments.map(a => ({ url: a.url, name: a.name, mimeType: a.mimeType })) : undefined,
          history: messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-500)
            .map((m) => ({
              role: m.role,
              content: m.content && m.content.length > 2000 ? m.content.substring(0, 2000) + "\n...[TRUNCATED]" : (m.content || "")
            })),
          pageContext: {
            ...pageContext,
            pageHistory: pageHistory,
            summary: pageContext?.summary || (typeof window !== "undefined" ? (window as any).classgrid_current_ticket_context : undefined),
          },
        }),
      });

      // Error responses (403 ban, 429 rate-limit) are still JSON
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setIsTerminated(true);
          wasTerminated = true;
          if (payload?.bannedUntil) {
            setBannedUntil(new Date(payload.bannedUntil));
          }
        }
        throw new Error(
          typeof payload?.error === "string" && payload.error.trim().length > 0
            ? (payload.error === "ai_quota_exceeded" && payload.resetDate ? `${payload.error}|${payload.resetDate}` : payload.error)
            : "Unable to answer right now. Please try again."
        );
      }

      // --- SSE STREAM READER ---
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalPayload: any = null;
        let streamError: string | null = null;
        let chatEndedSeen = false;
        let hasReceivedTokens = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          if (isStale()) continue; // old chat's reply: received to the end (server saves it), never shown here

          for (const part of parts) {
            const dataMatch = part.match(/^data:\s*(.+)$/m);
            if (!dataMatch) continue;

            try {
              const event = JSON.parse(dataMatch[1]);
              if (event.type === "status") {
                setThinkingLabel(
                  event.label === "searching" ? "Searching the web" :
                    event.label === "reading page" ? "Reading webpage" :
                      event.label === "reading image" ? "Reading image" :
                        event.label === "reading document" ? "Reading document" :
                          event.label === "analyzing" ? "Analyzing results" :
                            "Thinking"
                );
              } else if (event.type === "title_updated") {
                window.dispatchEvent(new Event("agent:refresh-sessions"));
              } else if (event.type === "session_info" && event.sessionId) {
                setSessionId(event.sessionId);
                setEndedCheckedFor(event.sessionId);
                if (isIncognito) {
                  saveIncognitoChat(messages, event.sessionId); // remembered at once, so closing right away still deletes it
                } else {
                  // An incognito chat never shows up in the sidebar
                  window.dispatchEvent(new CustomEvent("agent:session-created", { detail: { id: event.sessionId, title: question } }));
                  window.dispatchEvent(new Event("agent:refresh-sessions"));
                  // The real title is made a few seconds after the first message: load the list again so it shows
                  // without a page refresh (the live title update covers this too when the socket is connected)
                  setTimeout(() => window.dispatchEvent(new Event("agent:refresh-sessions")), 8000);
                  setTimeout(() => window.dispatchEvent(new Event("agent:refresh-sessions")), 15000);
                }
              } else if (event.type === "answer") {
                finalPayload = event;
              } else if (event.type === "generated_image" && event.url) {
                // The image tool finished: show the picture now, at the top of the reply
                const marker = `[IMAGE_GENERATION_COMPLETE: ${String(event.prompt || "").replace(/[\]\n|]/g, " ")} | ${event.url}]\n\n`;
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (!lastMsg || lastMsg.role !== "assistant") {
                    return [...prev, { id: createMessageId("assistant"), role: "assistant", content: marker, createdAt: Date.now(), typing: true }];
                  }
                  return [...prev.slice(0, -1), { ...lastMsg, content: marker + (lastMsg.content || "") }];
                });
              } else if (event.type === "token") {
                hasReceivedTokens = true;
                setThinking(false);
                // Buffer tokens for word-by-word typing (like sandbox simulation)
                tokenBufferRef.current += (event.token || "");
                wordTypingActiveRef.current = true;
                // Ensure an assistant message exists to receive the words
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (!lastMsg || lastMsg.role !== "assistant") {
                    return [...prev, { id: createMessageId("assistant"), role: "assistant", content: "", createdAt: Date.now(), typing: true }];
                  }
                  if (!lastMsg.typing) {
                    return [...prev.slice(0, -1), { ...lastMsg, typing: true }];
                  }
                  return prev;
                });
              } else if (event.type === "thought") {
                const thoughtText = event.thought || event.content;
                if (thoughtText) {
                  // Buffer thoughts for word-by-word typing (like sandbox simulation)
                  thoughtBufferRef.current += thoughtText;
                  wordTypingActiveRef.current = true;
                  // Ensure an assistant message exists
                  setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (!lastMsg || lastMsg.role !== "assistant") {
                      return [...prev, { id: createMessageId("assistant"), role: "assistant", content: "", createdAt: Date.now() }];
                    }
                    return prev;
                  });
                }
              } else if (event.type === "checkpoint") {
                // Project Mode: this answer's snapshot, for Review / Reject / Undo under the answer
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.role === "assistant") return [...prev.slice(0, -1), { ...lastMsg, checkpoint: event.id }];
                  return [...prev, { id: createMessageId("assistant"), role: "assistant", content: "", createdAt: Date.now(), checkpoint: event.id }];
                });
              } else if (event.type === "file_update") {
                setSandboxFiles(prev => ({ ...prev, ...(event.files || {}) }));
              } else if (event.type === "plan_step_update") {
                // Track completed plan steps from backend SSE events
                const completedSteps = event.completedSteps || [];
                setCompletedPlanSteps((prev: string[]) => {
                  const updated = new Set([...prev, ...completedSteps]);
                  return Array.from(updated);
                });
                // Per-step status (running/done/failed); completed ids count as done unless stepStatus says otherwise
                setPlanStepStatus((prev) => {
                  const next = { ...prev };
                  completedSteps.forEach((id: string) => { next[id] = "done"; });
                  return { ...next, ...(event.stepStatus || {}) };
                });
              } else if (event.type === "tool_start") {
                announceAgentTool("start", event.tool, event.args);
                if (event.tool === "open_integration_panel") {
                  setIsAiHubOpen(true);
                }
                setMessages((prev) => {
                  let lastMsg = prev[prev.length - 1];
                  let targetPrev = prev;
                  if (!lastMsg || lastMsg.role !== "assistant") {
                    lastMsg = { id: createMessageId("assistant"), role: "assistant", content: "", createdAt: Date.now() };
                    targetPrev = [...prev, lastMsg];
                  }

                  const newStep: AgentStep = (event.tool === 'internal_thought' || event.tool === 'internal_thought_process')
                    ? { id: crypto.randomUUID(), type: 'thought', title: event.args?.title || 'Thought', details: event.args?.details || '', status: 'loading' }
                    : { id: crypto.randomUUID(), type: 'tool', tool: event.tool, args: event.args, status: 'loading' };

                  return [
                    ...targetPrev.slice(0, -1),
                    { ...lastMsg, steps: [...(lastMsg.steps || []), newStep] }
                  ];
                });
              } else if (event.type === "sources") {
                // Numbered web pages for [n] citations (the full list so far for this answer)
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (!lastMsg || lastMsg.role !== "assistant" || !Array.isArray(event.sources)) return prev;
                  return [...prev.slice(0, -1), { ...lastMsg, sources: event.sources }];
                });
              } else if (event.type === "tool_result") {
                announceAgentTool("end", event.tool, undefined, event.result);
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.steps) return prev;

                  const stepIndex = [...lastMsg.steps].reverse().findIndex(s =>
                    (s.type === 'tool' && s.tool === event.tool && s.status === 'loading') ||
                    (s.type === 'thought' && (event.tool === 'internal_thought' || event.tool === 'internal_thought_process') && s.status === 'loading')
                  );

                  if (stepIndex === -1) return prev;

                  const actualIndex = lastMsg.steps.length - 1 - stepIndex;
                  const updatedSteps = [...lastMsg.steps];

                  const step = updatedSteps[actualIndex];
                  if (step.type === 'tool') {
                    const isError = event.result && typeof event.result === 'string' && (event.result.trim().startsWith('Error:') || event.result.trim().startsWith('ERROR:') || event.result.trim().startsWith('FAILED:'));
                    updatedSteps[actualIndex] = { ...step, status: isError ? 'error' : 'success', result: event.result };
                  } else if (step.type === 'thought') {
                    updatedSteps[actualIndex] = { ...step, status: 'success' };
                  }

                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, steps: updatedSteps }
                  ];
                });
              } else if (event.type === "helper_progress" && typeof event.helper === "number") {
                if (event.tool) {
                  helperToolRef.current[String(event.id)] = { tool: event.tool, args: event.args };
                  window.dispatchEvent(new CustomEvent("agent:tool", { detail: { phase: "start", tool: event.tool, args: event.args, helper: event.helper } }));
                } else if (event.id && typeof event.result === "string" && helperToolRef.current[String(event.id)]) {
                  const started = helperToolRef.current[String(event.id)];
                  delete helperToolRef.current[String(event.id)];
                  window.dispatchEvent(new CustomEvent("agent:tool", { detail: { phase: "end", ...started, result: event.result, helper: event.helper } }));
                }
                // Project Mode helpers working: each helper's reads/searches and its report as it is written
                setMessages((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (!lastMsg || lastMsg.role !== "assistant" || !lastMsg.steps) return prev;
                  // The newest helpers step: helpers started with wait: false keep working after their step is done
                  const idx = lastMsg.steps.map((s) => s.type === 'tool' && s.tool === 'run_project_helpers').lastIndexOf(true);
                  const step = lastMsg.steps[idx];
                  if (!step || step.type !== 'tool') return prev;
                  const helpers = [...(step.helpers || [])];
                  const h = { state: 'waiting', actions: [] as { id: string, tool: string, args: any, result?: string, status: string }[], text: '', ...(helpers[event.helper] || {}) };
                  if (event.tool) h.actions = [...h.actions, { id: String(event.id), tool: event.tool, args: event.args, status: 'loading' }];
                  else if (event.id && typeof event.result === 'string') h.actions = h.actions.map((a) => (a.id === event.id ? { ...a, result: event.result, status: 'success' } : a));
                  else if (typeof event.thought === 'string') {
                    // Thinking goes between the helper's steps: add to the current thought, or start a new one after a step
                    const last = h.actions[h.actions.length - 1];
                    h.actions = last?.tool === '__thought'
                      ? [...h.actions.slice(0, -1), { ...last, result: (last.result || '') + event.thought }]
                      : [...h.actions, { id: `t${h.actions.length}`, tool: '__thought', args: null, result: event.thought, status: 'loading' }];
                  }
                  if (event.text) h.text += event.text;
                  if (event.state === 'restart') h.text = '';
                  else if (event.state) h.state = event.state;
                  helpers[event.helper] = h;
                  const updatedSteps = [...lastMsg.steps];
                  updatedSteps[idx] = { ...step, helpers };
                  return [...prev.slice(0, -1), { ...lastMsg, steps: updatedSteps }];
                });
              } else if (event.type === "chat_ended") {
                chatEndedSeen = true;
                setChatEnded({ reason: event.reason ?? null, canReopen: !!event.canReopen });
                setMessageQueue([]);
                setPriorityMessage(null);
              } else if (event.type === "error") {
                streamError = event.error || "Unable to answer right now. Please try again.";
              }
            } catch (_) {
              // Skip malformed JSON chunks
            }
          }
        }

        if (isStale()) return;

        if (chatEndedSeen && !finalPayload) {
          // The chat was already ended: nothing to show except the "Chat ended" card.
          setThinking(false);
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            return last && last.role === "assistant" && !String(last.content || "").trim() ? prev.slice(0, -1) : prev;
          });
          return;
        }

        if (streamError) {
          throw new Error(streamError);
        }

        if (finalPayload) {
          if (finalPayload.sessionId) {
            setSessionId(finalPayload.sessionId);
            setEndedCheckedFor(finalPayload.sessionId);

          }

          const answer =
            typeof finalPayload.answer === "string" && finalPayload.answer.trim().length > 0
              ? finalPayload.answer
              : session?.user?.name
                ? `Hi ${session.user.name.split(" ")[0]}, I can help you with Classgrid features, pricing, or setup. What would you like to explore?`
                : "I can help you with Classgrid features, pricing, or setup. What would you like to explore?";

          setThinking(false);

          if (hasReceivedTokens) {
            // Wait for the word-by-word buffer to finish draining before finalizing
            while (tokenBufferRef.current.length > 0 || thoughtBufferRef.current.length > 0) {
              await wait(100);
            }
            wordTypingActiveRef.current = false;
            // Wait a moment for the last word-by-word interval to finish
            await wait(200);
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (!lastMsg || lastMsg.role !== "assistant") return prev;
              return [
                ...prev.slice(0, -1),
                { ...lastMsg, content: answer, typing: false, workedMs: Date.now() - workStartedAt }
              ];
            });
          } else {
            // Non-streamed response (tool calls, error fallbacks), so type it out
            await wait(prefersReducedMotion ? 0 : 100);
            await typeAssistantResponse(answer);
          }
        } else {
          throw new Error("The AI connection was interrupted. Please try again.");
        }
      } else {
        // Fallback: JSON response (for ban_check or older format)
        const payload = await response.json().catch(() => ({}));

        if (payload?.sessionId) {
          setSessionId(payload.sessionId);
          setEndedCheckedFor(payload.sessionId);

        }

        const answer =
          typeof payload?.answer === "string" && payload.answer.trim().length > 0
            ? payload.answer
            : session?.user?.name
              ? `Hi ${session.user.name.split(" ")[0]}, I can help you with Classgrid features, pricing, or setup. What would you like to explore?`
              : "I can help you with Classgrid features, pricing, or setup. What would you like to explore?";

        setThinking(false);
        await wait(prefersReducedMotion ? 0 : 100);
        await typeAssistantResponse(answer);
      }
    } catch (error: any) {
      if (isStale()) return;
      if (error.name === "AbortError" || error.message?.includes("abort")) {
        // User manually stopped the generation, silently exit
        setSubmitting(false);
        setThinking(false);
        return;
      }
      let rawMessage =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to answer right now. Please try again.";

      if (rawMessage.includes("Failed to fetch") || rawMessage.includes("fetch failed") || rawMessage.includes("NetworkError")) {
        rawMessage = "The connection timed out or was dropped. Please try again or ask a shorter question.";
      }

      // If terminated, add support info to the message shown in chat
      const fallback = wasTerminated || rawMessage.includes("terminated") || rawMessage.includes("restricted")
        ? `${rawMessage}\n\nIf you believe this is a mistake, please contact us at support@classgrid.in.\n\nTo understand why this action was taken, please read our [Privacy Policy](/privacy) and [Terms of Service](/terms).`
        : rawMessage;

      setThinking(false);

      if (fallback.trim().startsWith("ai_quota_exceeded")) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (!lastMsg || lastMsg.role !== "assistant") return prev;
          return [
            ...prev.slice(0, -1),
            { ...lastMsg, content: fallback, typing: false }
          ];
        });
      } else {
        await wait(prefersReducedMotion ? 0 : 100);
        await typeAssistantResponse(fallback);
      }
    } finally {
      if (!isStale()) setSubmitting(false);
    }
  }

  function submitInput() {
    if (!canSubmit) return;

    let finalInput = input;
    if (replyToMessage) {
      finalInput = `> ${replyToMessage.content.substring(0, 500).replace(/\n/g, "\n> ")}\n\n${input}`;
      setReplyToMessage(null);
    }

    const isTyping = messages.length > 0 && messages[messages.length - 1]?.typing === true;
    if (thinking || submitting || isTyping || wordTypingActiveRef.current) {
      // Linear Approach: Queue the message instead of sending immediately to prevent stream collisions
      setMessageQueue(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          text: finalInput,
          attachedFiles: [...attachedFiles],
          pastedTexts: [...pastedTexts],
        }
      ]);
      // Clear inputs since it's safely queued
      setInput("");
      setAttachedFiles([]);
      setPastedTexts([]);
      localStorage.removeItem("askAiDraftInput");
      localStorage.removeItem("askAiDraftFiles");
      localStorage.removeItem("askAiDraftPastedTexts");
      return;
    }

    void askQuestion(finalInput);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitInput();
  }

  // --- AI Message Queue Engine ---
  useEffect(() => {
    // We check the actual React state (messages[last].typing), not the ref, because refs don't trigger re-renders
    const lastMsg = messages[messages.length - 1];
    const isTyping = lastMsg?.role === "assistant" && lastMsg.typing === true;

    // If we are fully done generating and typing (and, in a shared chat, the agent isn't answering someone else)
    if (!thinking && !submitting && !isTyping && !gridBlockedBy) {
      // First check if there is a priority message
      if (priorityMessage) {
        setSubmitting(true);
        const textToSend = priorityMessage.text;
        const isEditMsg = priorityMessage.isEdit;
        setPriorityMessage(null);
        setTimeout(() => {
          if (askQuestionRef.current) {
            askQuestionRef.current(textToSend, { isEdit: isEditMsg });
          }
        }, 50); // fast fire
      }
      // Else check normal queue
      else if (messageQueue.length > 0) {
        const nextMsg = messageQueue[0];

        // CRITICAL: Set submitting to true IMMEDIATELY so the next re-render won't cascade
        setSubmitting(true);
        setMessageQueue(prev => prev.slice(1));

        setTimeout(() => {
          if (askQuestionRef.current) {
            askQuestionRef.current(nextMsg.text, { isEdit: nextMsg.isEdit });
          }
        }, 50); // fast fire
      }
    }
  }, [thinking, submitting, messages, messageQueue.length, priorityMessage, gridBlockedBy]);

  // ─── Panel content (shared between desktop sidebar and mobile bottom-sheet) ───
  const pendingQueueUI = null;

  const panelHeader = (
    <div className={cn("flex items-center justify-between px-4 py-4", variant !== "full-page" && "border-b border-border")}>
      <div className="flex items-center gap-2">
      </div>
      <div className="flex items-center gap-1">
        {variant !== "full-page" && messages.length > 0 && (
          <>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground cursor-pointer"
              onClick={handleCopyAll}
              title="Copy entire chat"
            >
              {copiedAll ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copy chat</span>
            </button>
            {!hideClearChat && (
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground cursor-pointer"
                onClick={handleClearChat}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Clear chat</span>
              </button>
            )}
            <div className="mx-1 h-4 w-[1px] bg-border" />
          </>
        )}

        {/* NEW TOP RIGHT HEADER ACTIONS */}
        {variant === "full-page" && messages.length > 0 && sessionId && !isIncognito && (
          <div className="flex items-center gap-1 mr-2 text-muted-foreground">
            <button
              type="button"
              aria-label="Share Grid"
              onClick={() => { setShowFilesPanel(false); setShowGridPanel((o) => !o); }}
              className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ShareGridIcon className="h-4 w-4" />
            </button>
            {/* Direct Share Button */}
            <button
              onClick={handleDirectShare}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[13px] font-medium transition-colors cursor-pointer"
            >
              <Share className="h-4 w-4" />
              Share
            </button>

            {/* Three Dot Menu */}
            {sessionId ? (
              <StudioChatMenu
                sessionId={sessionId}
                isPinned={isPinned}
                onTogglePin={handlePinToggle}
                onDelete={() => setShowDeleteConfirm(true)}
                onFilesInChat={() => setShowFilesPanel(true)}
                messages={messages.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" }))}
              />
            ) : null}
            <div className="mx-1 h-4 w-[1px] bg-border" />
          </div>
        )}

        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-md text-foreground cursor-pointer"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close panel</span>
        </button>
      </div>
    </div>
  );

  const panelChat = (
    <div ref={variant !== "full-page" ? chatScrollRef : undefined} className={cn("relative overscroll-contain chat-scrollbar [scrollbar-gutter:stable]", variant === "full-page" ? "w-full" : "flex-1 min-h-0 overflow-y-auto")}>


      <div className={cn("flex flex-col gap-4 px-4 py-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]", variant === "full-page" && "max-w-[48rem] mx-auto w-full pb-48")}>
        {isLoadingChat ? (
          <div className="flex flex-col gap-6 py-8 px-2 animate-in fade-in duration-300">
            {/* Skeleton message 1 - user */}
            <div className="flex justify-end">
              <div className="w-[65%] space-y-2">
                <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-[40%] rounded-lg bg-muted animate-pulse ml-auto" />
              </div>
            </div>
            {/* Skeleton message 2 - assistant */}
            <div className="flex justify-start">
              <div className="w-[80%] space-y-2.5">
                <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-[90%] rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-[70%] rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
            {/* Skeleton message 3 - user */}
            <div className="flex justify-end">
              <div className="w-[50%] space-y-2">
                <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
            {/* Skeleton message 4 - assistant */}
            <div className="flex justify-start">
              <div className="w-[85%] space-y-2.5">
                <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-[95%] rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-[60%] rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-[80%] rounded-lg bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        ) : emptyState ? (
          <>
            {/* PostHog-style centered greeting with logo & suggestion chips */}
            <div className="flex flex-col items-center justify-center py-16 gap-5 select-none">
              {/* Logo on the left of the greeting, one line */}
              <div className="flex items-center justify-center gap-3">
                <img src="/logo.png" alt="Classgrid" className="h-9 w-9 sm:h-[46px] sm:w-[46px] shrink-0 object-contain" />
                <h2 style={{ fontFamily: "Newsreader, Georgia, serif" }} className="font-normal text-[1.75rem] sm:text-[2.25rem] leading-tight tracking-[-0.01em] text-[#141413] dark:text-[#faf9f5] min-h-[2.5rem]">
                  <TypingGreeting name={user?.name} paused={input.trim().length > 0} />
                </h2>
              </div>
            </div>
          </>
        ) : (
          <>
            {messages.map((rawMessage, index) => {
              if (rawMessage.hidden) return null;
              if (rawMessage.role === 'user' && typeof rawMessage.content === 'string' && rawMessage.content.trim().startsWith('[SYSTEM:')) return null;

              // Parse pasted text out of the content dynamically to reconstruct chips on page refresh
              const message = { ...rawMessage };
              let displayContent = typeof message.content === 'object' && message.content !== null
                ? (message.content as any).content || JSON.stringify(message.content)
                : String(message.content || '');

              if (message.role === "user" && displayContent.includes("[PASTED TEXT")) {
                const extractedPastedTexts: string[] = [];
                const pastedTextRegex = /\[PASTED TEXT \d+\]:\n([\s\S]*?)(?=\n\n\[PASTED TEXT \d+\]:|$)/g;
                let match;
                while ((match = pastedTextRegex.exec(displayContent)) !== null) {
                  extractedPastedTexts.push(match[1]);
                }
                displayContent = displayContent.replace(/\[PASTED TEXT \d+\]:\n[\s\S]*?(?=\n\n\[PASTED TEXT \d+\]:|$)/g, "").trim();
                message.content = displayContent;

                if (extractedPastedTexts.length > 0) {
                  const newAttachments = [...(message.attachments || [])];
                  extractedPastedTexts.forEach((text, i) => {
                    const expectedName = extractedPastedTexts.length > 1 ? `Pasted text ${i + 1}.txt` : `Pasted text.txt`;
                    const existing = newAttachments.find(a => a.name === expectedName);
                    if (existing) {
                      existing.content = text;
                    } else {
                      newAttachments.push({
                        name: expectedName,
                        url: "",
                        mimeType: "text/plain",
                        size: new Blob([text]).size,
                        content: text
                      });
                    }
                  });
                  message.attachments = newAttachments;
                }
              }

              const isUser = message.role === "user";

              let showDateHeader = false;
              if (index === 0) {
                showDateHeader = true;
              } else {
                const prevMsg = messages[index - 1];
                if (message.createdAt && prevMsg.createdAt) {
                  const diff = message.createdAt - prevMsg.createdAt;
                  if (diff > 3600000) { // 1 hour
                    showDateHeader = true;
                  }
                }
              }

              const formattedDate = message.createdAt
                ? new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(message.createdAt))
                : "";

              return (
                <React.Fragment key={message.id}>
                  {(gridJoinLines.byMessage[message.id] || []).map((j) => <GridJoinLine key={`join-${j.email}`} {...j} />)}
                  {showDateHeader && formattedDate && (
                    <div className="flex justify-center w-full my-6">
                      <span className="text-[11px] font-semibold text-muted-foreground">{formattedDate}</span>
                    </div>
                  )}
                  <motion.div
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.16 }}
                    className={cn("flex w-full mb-6", isUser ? "justify-end" : "justify-start")}
                    // Long chats: the browser skips layout/paint for older messages while they are off-screen
                    // (e.g. during the sidebar animation). The latest messages are left alone so streaming isn't affected.
                    style={index < messages.length - 6 ? { contentVisibility: "auto", containIntrinsicSize: "auto 240px" } : undefined}
                  >
                    <div className={cn("flex flex-col gap-1.5 min-w-0", isUser ? "items-end max-w-[75%]" : "w-full")}>
                      {isUser && grid.shared && (() => {
                        const who = gridSenderOf(message);
                        return who && who !== gridMyEmail ? <GridSenderTag person={gridPeople[who] || { name: who }} /> : null;
                      })()}

                      {/* ── Text Bubble ── */}
                      {(message.content || (message.steps && message.steps.length > 0) || (message.thought && message.thought.trim().length > 0) || (message.attachments && message.attachments.length > 0) || (!isUser && index === messages.length - 1 && thinking)) && (
                        <div
                          id={`msg-${message.id}`}
                          className={cn(
                            "relative min-w-0 transition-all duration-700 msg-target-glow scroll-mt-12",
                            isUser
                              ? "group rounded-[16px] px-[14px] py-[6px] bg-[#f1f1ef] dark:bg-[#2C2C2C] max-w-full"
                              : "group/answer w-full max-w-full bg-transparent text-foreground"
                          )}
                        >
                          {isUser ? (
                            <>
                              {editingMessageId === message.id ? (
                                <div className="flex flex-col gap-3 min-w-[200px] sm:min-w-[300px]">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full text-[16px] leading-[24px] bg-transparent p-0 text-[#37352f] dark:text-[#F0EFED] min-h-[80px] resize-none !border-none !outline-none !ring-0 !shadow-none focus:!border-none focus:!outline-none focus:!ring-0 focus:!shadow-none hover:!border-none hover:!outline-none hover:!ring-0"
                                    autoFocus
                                    data-no-ring="true"
                                    style={{ border: 'none', outline: 'none', boxShadow: 'none', backgroundColor: 'transparent' }}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingMessageId(null); setEditContent(""); }}
                                      className="px-4 py-1.5 text-[13px] font-medium bg-background text-foreground rounded-full border border-border hover:bg-muted transition-colors shadow-sm cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSendEditedMessage(message.id); }}
                                      className="px-4 py-1.5 text-[13px] font-medium bg-foreground text-background rounded-full hover:bg-foreground/90 transition-colors shadow-sm cursor-pointer"
                                    >
                                      Send
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {message.content && message.content.trim().length > 0 && (() => {
                                    const rawContent = (typeof message.content === 'object' && message.content !== null
                                      ? (message.content as any).content || JSON.stringify(message.content)
                                      : String(message.content || '')
                                    ).replace(/\[Attached file:.*?\]/g, '').trim();

                                    const replyMatch = rawContent.match(/^>\s([\s\S]*?)\n\n([\s\S]*)$/);

                                    if (replyMatch) {
                                      const quotedText = replyMatch[1].replace(/\n>\s/g, '\n').trim();
                                      const userReply = replyMatch[2].trim();
                                      return (
                                        <div className="flex flex-col gap-2 w-full min-w-0 max-w-full text-left">
                                          <div 
                                            className="flex flex-col min-w-0 max-w-full overflow-hidden border-l-2 border-foreground/30 pl-2 bg-black/5 dark:bg-white/5 py-1 pr-3 rounded-r-lg cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const searchPreview = stripMarkdownForPreview(quotedText).substring(0, 40);
                                              const idx = messages.findIndex(m => m.id === message.id);
                                              const preceding = messages.slice(0, idx >= 0 ? idx : messages.length).reverse();
                                              const target = preceding.find(m => m.content && stripMarkdownForPreview(m.content).includes(searchPreview));
                                              if (target) {
                                                const el = document.getElementById(`msg-${target.id}`);
                                                if (el) {
                                                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                  el.style.transition = 'background-color 0.3s ease';
                                                  el.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
                                                  setTimeout(() => el.style.backgroundColor = '', 1000);
                                                }
                                              }
                                            }}
                                          >
                                            <span className="font-semibold text-[11px] text-foreground mb-0.5 uppercase tracking-wider pointer-events-none">Replied to AI</span>
                                            <span className="block min-w-0 max-w-full text-muted-foreground truncate whitespace-nowrap text-[13px] pointer-events-none">
                                              {stripMarkdownForPreview(quotedText).substring(0, 100)}
                                              {stripMarkdownForPreview(quotedText).length > 100 ? "..." : ""}
                                            </span>
                                          </div>
                                          <UserMessageText text={userReply} />
                                        </div>
                                      );
                                    }

                                    return (
                                      <UserMessageText text={rawContent} />
                                    );
                                  })()}

                                  {/* Hover Actions (Copy / Edit) */}
                                  {typeof message.content === 'string' && message.content.replace(/\[Attached file:.*?\]/g, '').trim().length > 0 && (
                                    <div className="absolute top-full right-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-row items-center gap-1 z-50 before:absolute before:-top-4 before:left-0 before:right-0 before:h-4">
                                      {pageContext?.path === "/c/studio" && message.createdAt ? (
                                        <span className="mr-1 whitespace-nowrap text-[12px] text-muted-foreground">{messageTime(message.createdAt)}</span>
                                      ) : null}
                                      {!(grid.shared && (gridSenderOf(message) !== gridMyEmail || gridBlockedBy)) && (
                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault(); e.stopPropagation();
                                                setEditingMessageId(message.id);
                                                setEditContent(typeof message.content === 'string' ? message.content.replace(/\[Attached file:.*?\]/g, '').trim() : '');
                                              }}
                                              className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer text-muted-foreground/60 hover:bg-muted hover:text-foreground bg-background/60 backdrop-blur-sm"
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" sideOffset={4} className="text-xs bg-black text-white dark:bg-white dark:text-black">
                                            Edit Message
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      )}

                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <button
                                              type="button"
                                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyUserMessage(typeof message.content === 'string' ? message.content.replace(/\[Attached file:.*?\]/g, '').trim() : '', message.id); }}
                                              className="flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200 cursor-pointer text-muted-foreground/60 hover:bg-muted hover:text-foreground bg-background/60 backdrop-blur-sm"
                                            >
                                              {copiedMessageId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                            </button>
                                          </TooltipTrigger>
                                          <TooltipContent side="bottom" sideOffset={4} className="text-xs bg-black text-white dark:bg-white dark:text-black">
                                            Copy Message
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </div>
                                  )}
                                </>
                              )}
                              {message.contextUrl && (
                                <a
                                  href={message.contextUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1.5 flex items-center gap-1.5 text-[11px] text-sky-300 dark:text-sky-300 hover:text-sky-200 transition-opacity relative z-10"
                                >
                                  <FileText className="h-3 w-3" />
                                  <span className="underline underline-offset-2 truncate max-w-[200px]">
                                    {message.contextTitle || message.contextUrl}
                                  </span>
                                </a>
                              )}
                            </>
                          ) : (
                            <div className="pl-1 w-full max-w-full">
                              {/* Phase 1-3: AgentStepper wraps both the reasoning block AND the steps
                                  so CombinedReasoningBlock is a DIRECT sibling of the step elements.
                                  This is required for the CSS .combined-reasoning-block ~ * trick to work! */}
                              {((message.thought && message.thought.trim().length > 0) || (index === messages.length - 1 && thinking) || (message.steps && message.steps.length > 0)) && (
                                <div className="mb-4">
                                  {(() => {
                                    // Steps stay open while the agent works, then fold into "Worked for X sec" (old messages load folded)
                                    const isLiveReply = index === messages.length - 1 && (thinking || submitting || !!message.typing);
                                    const toolSteps = (message.steps || []).filter((s) => s.type === 'tool');
                                    const workDone = !isLiveReply && !(message.steps || []).some((s) => s.status === 'loading');
                                    const stepper = (
                                  <AgentStepper>
                                    {/* CombinedReasoningBlock MUST be first child - direct sibling of steps */}
                                    {((message.thought && message.thought.trim().length > 0) || (index === messages.length - 1 && thinking)) && (
                                      <CombinedReasoningBlock
                                        sentences={message.thought && message.thought.trim().length > 0 ? hideCodeInThought(message.thought).trim().split(/(?<=[.!?\n])\s+/).filter(Boolean) : []}
                                        isStreaming={index === messages.length - 1 && thinking && !(message.steps && message.steps.some(s => s.status === 'loading'))}
                                      />
                                    )}

                                    {/* Steps - CSS sibling hiding hides these during Phase 1 & 2 */}
                                    {(() => {
                                      const elements: React.ReactNode[] = [];
                                      let thoughtGroup: any[] = [];

                                      // Project file reads/searches in a row show as one "Exploring 2 files, 1 search" group
                                      let exploreGroup: any[] = [];
                                      const flushExplore = () => {
                                        if (exploreGroup.length > 0) {
                                          elements.push(<ProjectExploreGroup key={`explore-${exploreGroup[0].id}`} steps={exploreGroup} />);
                                          exploreGroup = [];
                                        }
                                      };

                                      const flushThoughts = () => {
                                        flushExplore();
                                        if (thoughtGroup.length > 0) {
                                          if (thoughtGroup.length === 1) {
                                            const step = thoughtGroup[0];
                                            elements.push(
                                              <ThoughtStepView
                                                key={step.id}
                                                title={step.title}
                                                details={step.details}
                                              />
                                            );
                                          } else {
                                            elements.push(
                                              <WorkflowAccordion
                                                key={`group-${thoughtGroup[0].id}`}
                                                title={`${thoughtGroup.length} steps`}
                                                steps={thoughtGroup.map(s => ({
                                                  id: s.id,
                                                  type: 'thought',
                                                  title: s.title,
                                                  details: s.details
                                                }))}
                                                defaultExpanded={false}
                                              />
                                            );
                                          }
                                          thoughtGroup = [];
                                        }
                                      };

                                      (message.steps || []).forEach((step) => {
                                        if (step.type === 'thought') {
                                          thoughtGroup.push(step);
                                        } else if (step.type === 'tool') {
                                          if (PROJECT_EXPLORE_TOOLS.has(step.tool)) {
                                            if (thoughtGroup.length > 0) flushThoughts();
                                            exploreGroup.push(step);
                                            return;
                                          }
                                          flushThoughts();

                                          if (PROJECT_EDIT_TOOLS.has(step.tool)) {
                                            // "File already exists, use the edit tool" is only for the AI: it then edits the file,
                                            // and that edit is the step the user sees
                                            if (step.tool === 'write_project_file' && /already exists, so it was not changed/i.test(String(step.result || ''))) return;
                                            // A failed edit try that changed nothing ("old_text was not found…"): the AI reads the file and tries again
                                            if (step.tool === 'edit_project_file' && /Nothing was changed\./.test(String(step.result || ''))) return;
                                            elements.push(<ProjectEditStep key={step.id} step={step} />);
                                            return;
                                          }
                                          if (step.tool === 'push_project_to_github') {
                                            elements.push(<ProjectPushStep key={step.id} step={step} />);
                                            return;
                                          }
                                          if (step.tool === 'run_project_helpers') {
                                            elements.push(<ProjectHelpersStep key={step.id} step={step} />);
                                            return;
                                          }
                                          if (PROJECT_BACKGROUND_TOOLS.has(step.tool ?? '')) {
                                            // Same look as a normal command: the command (or the check run inside it) and its output
                                            const bgCommand = step.tool === 'start_background_command'
                                              ? String(step.args?.command || '')
                                              : step.tool === 'check_background_command'
                                                ? (step.args?.run_inside ? String(step.args.run_inside) : `check job ${step.args?.job_id || ''}`)
                                                : `stop job ${step.args?.job_id || ''}`;
                                            elements.push(
                                              <TerminalStep
                                                key={step.id}
                                                name="Bash"
                                                description={step.args?.description ? String(step.args.description) : undefined}
                                                command={bgCommand}
                                                output={step.result}
                                                status={step.status}
                                              />
                                            );
                                            return;
                                          }

                                          // Render specific tool views
                                          if (step.tool === 'run_code' || step.tool === 'execute_terminal_command') {
                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? (step.tool === 'run_code' ? 'Executing Code' : 'Running a command')}
                                                status={step.status}                                              >
                                                <TerminalToolView
                                                  command={step.args?.command || step.args?.code || 'Running...'}
                                                  output={step.result || 'Waiting for output...'}
                                                  running={step.status === 'loading'}
                                                />
                                              </AgentStepAccordion>
                                            );
                                            elements.push(<ProjectRunChanges key={`changes-${step.id}`} result={step.result} />);
                                            return;
                                          }

                                          if (step.tool === 'unified_db_query') {
                                            let results = [];
                                            try {
                                              if (step.result && step.result.startsWith('[')) {
                                                results = JSON.parse(step.result.split('\n\n[SYSTEM DIRECTIVE')[0]);
                                              } else if (step.result && step.result.startsWith('{')) {
                                                results = [JSON.parse(step.result)];
                                              }
                                            } catch (e) { }
                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Querying Database"}
                                                status={step.status}                                              >
                                                <DatabaseQueryView
                                                  query={JSON.stringify(step.args, null, 2)}
                                                  results={results}
                                                />
                                              </AgentStepAccordion>
                                            );
                                            return;
                                          }

                                          if (step.tool === 'parse_document') {
                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Uploaded File"}
                                                status={step.status}                                              >
                                                <FileActionView fileName={step.args?.url?.split('/').pop() || 'document'} />
                                              </AgentStepAccordion>
                                            );
                                            return;
                                          }

                                          if (step.tool === 'send_email') {
                                            const draftingStep = (
                                              <AgentStepAccordion
                                                key={`${step.id}-draft`}
                                                title={emailTitle(step.args, false, step.status) ?? (step.status === 'success' ? "Drafted email" : "Drafting email")}
                                                status={step.status === 'success' ? 'success' : step.status}                                              >
                                                <EmailActionView
                                                  to={step.args?.to || "Unknown Recipient"}
                                                  subject={step.args?.subject || "No Subject"}
                                                  bodyPreview={step.args?.htmlBody || step.args?.body || "Empty body"}
                                                />
                                              </AgentStepAccordion>
                                            );

                                            if (step.status === 'success') {
                                              let toCount = 1;
                                              if (step.args?.to && step.args.to.includes(',')) {
                                                toCount = step.args.to.split(',').length;
                                              }
                                              elements.push(
                                                <React.Fragment key={step.id}>
                                                  {draftingStep}
                                                  <AgentStepAccordion
                                                    key={`${step.id}-sent`}
                                                    title={emailTitle(step.args, true, "success") ?? "Sent email"}
                                                    status="success"
                                                  >
                                                    <EmailSentView
                                                      toCount={toCount}
                                                      subject={step.args?.subject || "No Subject"}
                                                    />
                                                  </AgentStepAccordion>
                                                </React.Fragment>
                                              );
                                            } else {
                                              elements.push(draftingStep);
                                            }
                                            return;
                                          }

                                          if (step.tool === 'open_url') {
                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? (step.status === 'loading' ? "Opening page" : step.status === 'error' ? "Couldn't open page" : "Opened page")}
                                                status={step.status}
                                              >
                                                <OpenPageView url={step.args?.url} result={step.result} status={step.status} />
                                              </AgentStepAccordion>
                                            );
                                            return;
                                          }

                                          if (step.tool === 'search_web') {
                                            let searchResults = [];
                                            let searchError;
                                            if (step.result) {
                                              if (step.result.startsWith('Web Search failed')) {
                                                searchError = step.result;
                                              } else {
                                                try {
                                                  const parsed = JSON.parse(step.result);
                                                  if (parsed.results && Array.isArray(parsed.results)) {
                                                    searchResults = parsed.results;
                                                  }
                                                } catch (e) {
                                                  searchError = "Could not parse search results.";
                                                }
                                              }
                                            }
                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Searched the web"}
                                                status={step.status}                                              >
                                                <WebSearchView
                                                  query={step.args?.query}
                                                  searchDomain={step.args?.domain}
                                                  results={searchResults}
                                                  error={searchError}
                                                />
                                              </AgentStepAccordion>
                                            );
                                            return;
                                          }

                                          if (step.tool === 'generate_pdf' || step.tool === 'generate_pdf_from_db') {
                                            let fileName = "document.pdf";
                                            let pageCount = 1;
                                            let size = "Unknown";

                                            if (step.result && step.result.includes("SUCCESS")) {
                                              size = "Available via CDN";
                                            }

                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? (step.tool === 'generate_pdf_from_db' ? "Generating database report" : "Generating PDF document")}
                                                status={step.status}                                              >
                                                <DocumentGenerationView
                                                  fileName={step.args?.title ? `${step.args.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : fileName}
                                                  pageCount={pageCount}
                                                  size={size}
                                                />
                                              </AgentStepAccordion>
                                            );
                                            return;
                                          }

                                          if (step.tool === 'search_knowledge_base') {
                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Searched Knowledge Base"}
                                                status={step.status}                                              >
                                                <KnowledgeBaseSearchView
                                                  results={[{
                                                    title: step.args?.query || "Search Query",
                                                    source: "Internal Knowledge Base"
                                                  }]}
                                                />
                                              </AgentStepAccordion>
                                            );
                                            return;
                                          }

                                          if (step.tool === 'upload_file_to_cdn') {
                                            let cdnUrl = "";
                                            if (step.result && step.result.includes("Public URL:")) {
                                              cdnUrl = step.result.split("Public URL:")[1].trim();
                                            }
                                            elements.push(
                                              <AgentStepAccordion
                                                key={step.id}
                                                title={specialStepTitle(step.tool, step.args, step.result, step.status) ?? "Upload file to CDN"}
                                                status={step.status}                                                icon={<UploadCloud className="h-4 w-4" />}
                                              >
                                                <CdnUploadView
                                                  fileName={step.args?.fileName || "upload.file"}
                                                  url={cdnUrl}
                                                  status={step.status}
                                                  error={step.error || (!cdnUrl ? step.result : undefined)}
                                                />
                                              </AgentStepAccordion>
                                            );
                                            return;
                                          }

                                          // Image the AI is looking at: shown right away (live), then its answer
                                          // Audio being turned into text: the file with a player right away, then the transcript
                                          if (step.tool === 'transcribe_audio') {
                                            elements.push(<AudioTranscribeStep key={step.id} args={step.args} result={step.result} status={step.status} />);
                                            return;
                                          }

                                          const isImageUpload = step.tool === 'upload_sandbox_file_to_cdn'
                                            && (/^image\//.test(String(step.args?.mimeType ?? '')) || /\.(png|jpe?g|gif|webp)$/i.test(String(step.args?.sandboxFilePath ?? '')));
                                          if (step.tool === 'analyze_image' || step.tool === 'view_image' || isImageUpload) {
                                            elements.push(
                                              <ImageReadStep
                                                key={step.id}
                                                tool={step.tool}
                                                args={step.args}
                                                result={step.result}
                                                status={step.status}
                                                text={isImageUpload
                                                  ? (step.status === 'loading' ? 'Uploading image...' : 'Uploaded image')
                                                  : (step.status === 'loading' ? 'Analyzing image...' : 'Analyzed image')}
                                              />
                                            );
                                            return;
                                          }

                                          // Generic fallback
                                          let dynamicText = `Successfully used ${step.tool.replace(/_/g, ' ')}`;
                                          let loadingText = `Using ${step.tool.replace(/_/g, ' ')}...`;

                                          if (step.tool === 'notion_connector' && step.args?.operation) {
                                            if (step.args.operation === 'search' && step.args.query) {
                                              dynamicText = `Searched Notion for "${step.args.query}"`;
                                              loadingText = `Searching Notion for "${step.args.query}"...`;
                                            } else {
                                              dynamicText = `Successfully used Notion to ${step.args.operation.replace(/_/g, ' ')}`;
                                              loadingText = `Using Notion to ${step.args.operation.replace(/_/g, ' ')}...`;
                                            }
                                          } else if (step.tool === 'google_workspace_connector' && step.args?.operation) {
                                            dynamicText = `Successfully used Google Workspace to ${step.args.operation.replace(/_/g, ' ')}`;
                                            loadingText = `Using Google Workspace to ${step.args.operation.replace(/_/g, ' ')}...`;
                                          } else if (step.tool === 'zoom_connector' && step.args?.operation) {
                                            dynamicText = `Successfully used Zoom to ${step.args.operation.replace(/_/g, ' ')}`;
                                            loadingText = `Using Zoom to ${step.args.operation.replace(/_/g, ' ')}...`;
                                          }

                                          // Say what the step actually did and found ("Found 5 classroom assignments: …")
                                          const described = describeStep(step.tool, step.args, step.result, step.status);
                                          elements.push(
                                            <ToolResultStep
                                              key={step.id}
                                              tool={step.tool}
                                              args={step.args}
                                              result={step.result}
                                              status={step.status}
                                              text={described ?? (step.status === 'success' ? dynamicText : loadingText)}
                                            />
                                          );
                                        }
                                      });

                                      flushThoughts();
                                      return elements;
                                    })()}
                                  </AgentStepper>
                                    );
                                    // Every step label keeps its shine until the whole reply is finished
                                    const stepperLive = <StepWorkingContext.Provider value={!workDone}>{stepper}</StepWorkingContext.Provider>;
                                    return toolSteps.length > 0 ? (
                                      <MasterWorkflowWrapper isFinished={workDone} durationMs={message.workedMs} stepCount={toolSteps.length}>
                                        {stepperLive}
                                      </MasterWorkflowWrapper>
                                    ) : stepperLive;
                                  })()}
                                </div>
                              )}

                              {/* Old thought accordion removed — CombinedReasoningBlock above stepper handles all thought display now */}
                              {message.content.includes("[IMAGE_GENERATION") ? (() => {
                                // One reply can mix text and images: the text before/after each image marker is shown too, so the AI can
                                // keep writing after an image (it used to show only the image and hide everything else).
                                const renderImageCard = (marker: string, partIndex: number) => {
                                const isQueued = marker.includes("[IMAGE_GENERATION_QUEUED");
                                const isError = marker.includes("[IMAGE_GENERATION_ERROR");
                                const isComplete = marker.includes("[IMAGE_GENERATION_COMPLETE");

                                let prompt = "Image generation";
                                let url = "";

                                if (isQueued || isError) {
                                  prompt = marker.match(/\[IMAGE_GENERATION(?:_QUEUED|_ERROR):\s*(.*?)\]/)?.[1] || prompt;
                                } else if (isComplete) {
                                  // Try pipe separator first (new format), then fall back to colon (old format)
                                  let match = marker.match(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*\|\s*(https?:\/\/.*?)\]/);
                                  if (!match) {
                                    // Old format: split on last https:// occurrence
                                    const oldMatch = marker.match(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*:\s*(https?:\/\/.*?)\]/);
                                    if (oldMatch) match = oldMatch;
                                  }
                                  if (match) {
                                    prompt = match[1];
                                    url = match[2];
                                  }
                                }

                                // Track whether this specific image has loaded in the browser
                                const imgKey = `img-loaded-${message.id}-${partIndex}`;
                                const isImgLoaded = (window as any)[imgKey] === true;

                                return (
                                  <div key={`img-${partIndex}`} className="mb-2 mt-1 w-full max-w-[320px]">
                                    <ImageGeneration
                                      status={isError ? "error" : (isComplete && isImgLoaded) ? "complete" : "generating"}
                                      size="fluid"
                                      showStatus={false}
                                      resolution=""
                                    >
                                      {isComplete && url && (
                                        <>
                                          {/* Hidden img to trigger browser load; once loaded, re-render shows the image */}
                                          {!isImgLoaded && (
                                            <img
                                              src={url}
                                              alt=""
                                              style={{ display: 'none' }}
                                              onLoad={() => {
                                                (window as any)[imgKey] = true;
                                                // Force a re-render by dispatching a tiny state update
                                                setMessages(prev => [...prev]);
                                              }}
                                              onError={() => {
                                                (window as any)[imgKey] = true;
                                                setMessages(prev => [...prev]);
                                              }}
                                            />
                                          )}
                                          {isImgLoaded && (
                                            <DocsImageViewer
                                              images={[{ id: `gen-${message.id}-${partIndex}`, src: url, alt: prompt }]}
                                              renderThumbnails={(images, openImage) => (
                                                <img
                                                  src={images[0].src}
                                                  alt={images[0].alt}
                                                  className="w-full h-full object-cover rounded-xl cursor-zoom-in hover:opacity-95 transition-opacity"
                                                  onClick={(e) => openImage(images[0], e)}
                                                />
                                              )}
                                            />
                                          )}
                                        </>
                                      )}
                                    </ImageGeneration>
                                  </div>
                                );
                                                              };
                                const parts = message.content.split(/(\[IMAGE_GENERATION_(?:QUEUED|ERROR|COMPLETE):[\s\S]*?\])/);
                                const lastTextIndex = parts.reduce((last, part, i) => (!part.startsWith("[IMAGE_GENERATION_") && part.trim() ? i : last), -1);
                                return (
                                  <>
                                    {parts.map((part, i) => part.startsWith("[IMAGE_GENERATION_") ? renderImageCard(part, i) : part.trim() ? (
                                      <AssistantMessageContent
                                        key={`txt-${i}`}
                                        content={part}
                                        sources={i === lastTextIndex ? message.sources : undefined}
                                        createdAt={message.createdAt}
                                        isTyping={message.typing && i === parts.length - 1}
                                        isHistorical={index < messages.length - 1}
                                        currentStepIndex={-1}
                                        onRetry={undefined}
                                        onApprovalAction={handleApprovalAction}
                                      />
                                    ) : null)}
                                  </>
                                );
                                })() : message.content.trim().startsWith("ai_quota_exceeded") ? (
                                <div className="mt-2 w-full flex justify-start">
                                  <InsufficientCreditsCard
                                    refreshDate={new Date(message.content.split("|")[1] || Date.now())}
                                    // "ai_quota_exceeded|<reset>|<model>": an expensive model's price was the reason
                                    modelName={MODEL_GROUPS.flatMap(g => g.models).find(m => m.id === message.content.trim().split("|")[2])?.name}
                                    onSwitchToAuto={() => {
                                      setSelectedModel(AUTO_MODEL_ID);
                                      setMessages(prev => prev.filter(m => m.id !== message.id));
                                    }}
                                    onDismiss={() => setMessages(prev => prev.filter(m => m.id !== message.id))}
                                    onUpgrade={() => {
                                      setAiHubInitialTab("upgrade");
                                      setIsAiHubOpen(true);
                                    }}
                                  />
                                </div>
                              ) : message.content.trim() === "ai_blocked" ? (
                                <div className="mt-2 w-full flex justify-start">
                                  <div className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 max-w-[400px]">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                      </svg>
                                      <h3 className="font-semibold text-red-500">Access Blocked</h3>
                                    </div>
                                    <p className="text-sm text-foreground/80">
                                      Your AI access has been suspended. Please contact our support team or email us at support@classgrid.in
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <AssistantMessageContent
                                  content={message.content}
                                  sources={message.sources}
                                  createdAt={message.createdAt}
                                  isTyping={message.typing}
                                  isHistorical={index < messages.length - 1}
                                  currentStepIndex={-1}
                                  onRetry={undefined}
                                  onApprovalAction={handleApprovalAction}
                                />
                              )}
                            </div>
                          )}
                          {/* Spotify: the finished results (songs, playlists, artists, albums, now playing), only when this answer used Spotify */}
                          {!isUser && !message.typing && (message.steps || []).some((s: any) => s.type === 'tool' && s.tool === 'spotify_connector') && (
                            <div className="pl-1 mt-3 max-w-[640px]"><SpotifyDisplay steps={(message.steps || []) as any[]} /></div>
                          )}
                          {/* Quiet memory save: shown only when the create_skill tool really ran and worked */}
                          {!isUser && !message.typing && (message.steps || []).some((s: any) => s.type === 'tool' && s.tool === 'create_skill' && s.status === 'success' && (s.args?.quiet === true || s.args?.quiet === 'true')) && (
                            <div className="pl-1 mt-2">
                              <button
                                type="button"
                                onClick={() => window.dispatchEvent(new CustomEvent('open-ai-hub', { detail: { tab: 'skills' } }))}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Check className="w-3 h-3" /> Memory updated
                              </button>
                            </div>
                          )}
                          {!isUser && !message.typing && message.content.length > 0 && !message.content.includes("```approval") && !/^\s*\[IMAGE_GENERATION_[^\]]*\]\s*$/.test(message.content) && !message.content.trim().startsWith("ai_quota_exceeded") && message.content.trim() !== "ai_blocked" && (
                            <div className="pl-1 mt-3">
                              <FilesChangedSummary steps={(message.steps || []) as any} checkpoint={message.checkpoint} sessionId={sessionId || undefined} />
                              <MessageActions content={message.content} messageId={message.id} onReply={() => setReplyToMessage(message)} time={pageContext?.path === "/c/studio" ? message.createdAt : undefined} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* â”€â”€ Attachments (Outside Bubble) â”€â”€ */}
                      {isUser && message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-col gap-2 items-end">

                          {/* Images using DocsImageViewer */}
                          {message.attachments.filter(a => a.mimeType.startsWith("image/")).length > 0 && (
                            <DocsImageViewer
                              images={message.attachments.filter(a => a.mimeType.startsWith("image/")).map((a, idx) => ({
                                id: `${a.name}-${idx}-${message.id}`,
                                src: a.url,
                                alt: a.name
                              }))}
                              renderThumbnails={(images, openImage) => (
                                <div className="flex flex-wrap gap-2 justify-end">
                                  {images.map((img) => (
                                    <button
                                      key={img.id}
                                      type="button"
                                      onClick={(e) => openImage(img, e)}
                                      title={img.alt}
                                      className={cn(
                                        "relative group overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 hover:border-emerald-500/50 transition-all shadow-sm cursor-pointer",
                                        images.length === 1 && !message.content ? "rounded-2xl rounded-tr-none h-auto w-[180px] sm:w-[220px]" : "rounded-xl h-20 w-20 sm:h-[88px] sm:w-[88px]"
                                      )}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={img.src}
                                        alt={img.alt}
                                        className={cn("absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-105", images.length === 1 && !message.content ? "relative object-contain" : "object-cover")}
                                      />
                                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 dark:group-hover:bg-white/10 transition-colors" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            />
                          )}

                          {/* All Non-Image Documents (Unified Sleek Card) */}
                          {isUser && message.attachments && message.attachments.filter(a => !a.mimeType.startsWith("image/")).length > 0 && (
                            <div className="flex flex-col gap-2 mt-2 w-full max-w-[400px]">
                              {message.attachments.filter(a => !a.mimeType.startsWith("image/")).map((att, i) => {
                                const extension = att.name.split('.').pop()?.toLowerCase();
                                let Icon = FileText;
                                let iconBgClass = "bg-slate-100/50 dark:bg-white/5";
                                let iconColorClass = "text-slate-500 dark:text-slate-400";
                                // Real file type (PPTX, TXT, MD...) instead of a generic "FILE" when the name has one
                                let fileTypeLabel = extension && /^[a-z0-9]{1,5}$/.test(extension) ? extension.toUpperCase() : "FILE";

                                if (extension === 'pdf' || att.mimeType === 'application/pdf') {
                                  Icon = FileText;
                                  iconBgClass = "bg-red-100/50 dark:bg-red-900/20";
                                  iconColorClass = "text-red-600 dark:text-red-400";
                                  fileTypeLabel = "PDF";
                                } else if (extension === 'xlsx' || extension === 'csv' || att.mimeType.includes('spreadsheet') || att.mimeType.includes('csv')) {
                                  Icon = FileSpreadsheet;
                                  iconBgClass = "bg-emerald-100/50 dark:bg-emerald-900/20";
                                  iconColorClass = "text-emerald-600 dark:text-emerald-400";
                                  fileTypeLabel = (extension || "FILE").toUpperCase();
                                } else if (extension === 'docx' || extension === 'doc' || att.mimeType.includes('document')) {
                                  Icon = FileIcon;
                                  iconBgClass = "bg-blue-100/50 dark:bg-blue-900/20";
                                  iconColorClass = "text-blue-600 dark:text-blue-400";
                                  fileTypeLabel = (extension || "DOCX").toUpperCase();
                                } else if (att.mimeType.startsWith("video/")) {
                                  Icon = Video;
                                  iconBgClass = "bg-blue-100/50 dark:bg-blue-900/20";
                                  iconColorClass = "text-blue-600 dark:text-blue-400";
                                  fileTypeLabel = "VIDEO";
                                } else if (att.mimeType.startsWith("audio/")) {
                                  Icon = Music;
                                  iconBgClass = "bg-purple-100/50 dark:bg-purple-900/20";
                                  iconColorClass = "text-purple-600 dark:text-purple-400";
                                  fileTypeLabel = "AUDIO";
                                }

                                if (att.name.startsWith("Pasted text")) {
                                  return (
                                    <div
                                      key={`${att.name}-${i}`}
                                      className="group relative inline-flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 shadow-sm min-w-[250px] max-w-[400px] transition-all cursor-pointer hover:bg-muted/60"
                                      onClick={() => att.content && setViewingPastedText({ title: att.name.replace(".txt", ""), content: att.content })}
                                    >
                                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                      </div>
                                      <div className="flex flex-col min-w-0 overflow-hidden text-left gap-0.5">
                                        <span className="text-[13px] font-medium text-foreground truncate leading-tight">
                                          {att.name}
                                        </span>
                                        <span className="text-[12px] text-muted-foreground truncate leading-tight">
                                          Document
                                        </span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={`${att.name}-${i}`}
                                    onClick={() => setPreviewFile({ name: att.name, src: att.url, mimeType: extension === 'pdf' ? 'application/pdf' : att.mimeType })}
                                    className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between p-4 shadow-sm dark:shadow-none w-full hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all duration-500 ease-in-out cursor-pointer group"
                                  >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                      <div className={cn("h-10 w-10 shrink-0 rounded-lg flex items-center justify-center", iconBgClass, iconColorClass)}>
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <div className="flex flex-col overflow-hidden text-left">
                                        <span className="text-[14px] font-medium text-slate-800 dark:text-[#eeeeee] truncate">
                                          {att.name}
                                        </span>
                                        <span className="text-[13px] text-slate-500 dark:text-[#8a8a8a] mt-0.5">
                                          Click to preview • {fileTypeLabel}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
            {gridJoinLines.after.map((j) => <GridJoinLine key={`join-${j.email}`} {...j} />)}
            {/* Share Grid: the agent is answering someone else (sending is blocked until it is done) */}
            {gridBlockedBy && <GridReplyingLine person={gridBlockedBy} />}

            {/* Rendering priority message right after the normal messages */}
            {priorityMessage && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-full mb-6 justify-end"
              >
                <div className="flex flex-col gap-1.5 min-w-0 items-end max-w-[75%]">
                  <div className="relative min-w-0 transition-all duration-700 rounded-[16px] px-[14px] py-[6px] bg-[#f1f1ef] dark:bg-[#2C2C2C] opacity-50 flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.7)] animate-pulse shrink-0" />
                    <p className="text-[16px] leading-[24px] break-words break-all whitespace-pre-wrap text-[#37352f] dark:text-[#F0EFED] cursor-text">
                      {priorityMessage.text || (priorityMessage.attachedFiles.length > 0 ? "Attached files..." : "")}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Phase 1 gap: Show CombinedReasoningBlock shimmer when thinking but no assistant message exists yet */}
            {thinking && (!messages.length || messages[messages.length - 1]?.role !== 'assistant') && (
              <div className="pl-1 mb-2">
                <CombinedReasoningBlock sentences={[]} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const panelInput = readOnly ? null : (
    <div className={cn(
      variant === "full-page" ? "px-1 sm:px-4 py-4 sm:pt-0 relative" : "px-4 py-4 relative",
      "flex flex-col gap-2"
    )}>

      <div className={cn(
        "relative",
        variant === "full-page"
          // Phones: solid page colour behind the input so messages scrolling under it don't show at its sides
          ? "absolute bottom-0 left-0 right-0 z-10 pointer-events-none max-sm:!bg-[#fafafa] max-sm:dark:!bg-black max-sm:pt-2"
          : variant === "overlay" ? "" : "border-t border-border"
      )}>
        <AnimatePresence>
          {showScrollButton && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute left-0 right-0 -top-12 flex justify-center z-20 pointer-events-auto"
            >
              <button
                type="button"
                onClick={scrollToBottom}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-background border border-border shadow-md text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={cn(variant === "full-page" && "relative max-w-[52rem] mx-auto w-full pointer-events-auto")}>

          {isTerminated ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-500">
              <p>This conversation has been terminated.</p>
              {countdown && (
                <p className="mt-1 text-xs text-red-400">
                  Access resumes in: <span className="font-mono font-bold">{countdown}</span>
                </p>
              )}
            </div>
          ) : (
            <>
              <AnimatePresence>
                {messageQueue.length > 0 && (
                  <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-start gap-2 w-full mb-2">
                    <motion.button
                      type="button"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onClick={() => setIsQueueVisible(!isQueueVisible)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-[13px] shadow-sm font-medium"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      {messageQueue.length} queued
                    </motion.button>
                    <AnimatePresence>
                      {isQueueVisible && (
                        <motion.div
                          initial={{ opacity: 0, height: 0, y: -10 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          exit={{ opacity: 0, height: 0, y: -10 }}
                          className="flex flex-col gap-0 w-full py-2 px-2 rounded-lg bg-background border border-border/40 max-h-[200px] overflow-y-auto chat-scrollbar origin-top"
                        >
                          <AnimatePresence>
                            {messageQueue.map((msg) => (
                              <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="group flex items-center justify-between gap-2 py-1.5 px-2 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-default transition-colors shrink-0"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                                  <span className="text-[13px] truncate">
                                    {msg.text || (msg.attachedFiles.length > 0 ? "Attached files..." : "Pending...")}
                                  </span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMessageQueue(prev => prev.filter(m => m.id !== msg.id));
                                      setPriorityMessage(msg);
                                    }}
                                    className="text-[12px] cursor-pointer px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                  >
                                    Send
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMessageQueue(prev => prev.filter(m => m.id !== msg.id))}
                                    className="cursor-pointer p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    title="Cancel"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
              {endedView && (
                <>
                  <ChatEndedCard reason={endedView.reason} onNewChat={handleEndedNewChat} onFeedback={() => setEndedFeedbackOpen(true)} />
                  {endedFeedbackOpen && (
                    <AiFeedbackModal isOpen={endedFeedbackOpen} onClose={() => setEndedFeedbackOpen(false)} onSubmit={submitEndedFeedback} isSubmitting={endedFeedbackSubmitting} />
                  )}
                </>
              )}
              <form onSubmit={handleSubmit} className={cn("space-y-2", endedView && "hidden")}>
                <div className={cn(
                  variant === "overlay" ? "w-full" : "sm:w-[80%]",
                  "group relative w-full mx-auto shadow-sm rounded-2xl border border-border !bg-white dark:!bg-[#0f0f0f] focus-within:border-black/80 dark:focus-within:border-white/50 focus-within:ring-1 focus-within:ring-black/80 dark:focus-within:ring-white/50 transition-all duration-300",
                  isIncognito && "border-dashed border-slate-300 dark:border-[#3a3a3a]"
                )}>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  {pageContext?.path?.startsWith("/docs") && pageContext.path !== lastSentDocsPath && (
                    <div className="px-3 pt-3 pb-0">
                      <div className="group relative inline-flex items-center gap-2.5 rounded-[10px] border border-border/80 bg-muted/40 px-3 py-2 pr-8 shadow-sm max-w-[95%]">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex flex-col min-w-0 overflow-hidden text-left gap-0.5">
                          <span className="text-[12px] font-semibold text-foreground truncate leading-tight">
                            {pageContext.title || "Introduction"}
                          </span>
                          <span className="text-[10px] text-muted-foreground/80 truncate leading-tight">
                            https://classgrid.in{pageContext.path}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLastSentDocsPath(pageContext.path!)}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 focus:text-foreground"
                          title="Remove page context"
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove context</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Attached file chips and Pasted Text Chip */}
                  {(attachedFiles.length > 0 || pastedTexts.length > 0) && (
                    <div className="px-3 pt-3 pb-0 flex flex-wrap gap-1.5">
                      {pastedTexts.map((pt, idx) => (
                        <div
                          key={`pasted-${idx}`}
                          className="group relative inline-flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 shadow-sm max-w-[220px] transition-all cursor-pointer hover:bg-muted/60"
                          title="Too long to show in text field"
                          onClick={() => setEditingMode(idx)}
                        >
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                            <FileText className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex flex-col min-w-0 overflow-hidden text-left gap-0.5">
                            <span className="text-[13px] font-medium text-foreground truncate leading-tight">
                              Pasted text {pastedTexts.length > 1 ? idx + 1 : ""}
                            </span>
                            <span className="text-[12px] text-muted-foreground truncate leading-tight">
                              Pasted text
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPastedTexts(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-colors z-10 cursor-pointer"
                            title="Remove pasted text"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {attachedFiles.map((att) => {
                        const Icon = getFileIcon(att.type);
                        const isImage = att.type.startsWith("image/");
                        return (
                          <div
                            key={att.id}
                            className={cn(
                              "group relative inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 pr-8 shadow-sm max-w-[200px] transition-all",
                              att.status === "error" ? "border-red-500/50 bg-red-500/10" : "border-border/80 bg-muted/40",
                              att.status === "uploading" ? "opacity-70 animate-pulse" : "opacity-100"
                            )}
                          >
                            {isImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={att.url || (att.file ? URL.createObjectURL(att.file) : "")}
                                alt={att.name}
                                className="h-6 w-6 rounded object-cover shrink-0"
                              />
                            ) : (
                              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <div className="flex flex-col min-w-0 overflow-hidden text-left gap-0">
                              <span className="text-[11px] font-medium text-foreground truncate leading-tight">
                                {att.name}
                              </span>
                              {att.status === "uploading" ? (
                                <div className="h-1.5 w-full max-w-[80px] bg-muted-foreground/20 rounded-full overflow-hidden mt-1 mb-0.5">
                                  <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: "85%" }}
                                    transition={{ duration: 2.5, ease: "easeOut" }}
                                    className="h-full bg-emerald-500 rounded-full"
                                  />
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/70 leading-tight">
                                  {att.status === "error" ? "Failed" : formatFileSize(att.size)}
                                </span>
                              )}
                            </div>

                            {/* Allow previewing the file immediately after successful upload */}
                            {att.status === "done" && att.url && (
                              <button
                                type="button"
                                onClick={() => setPreviewFile({ name: att.name, src: att.url!, mimeType: att.type })}
                                className="absolute inset-0 w-full h-full cursor-pointer z-10"
                                title="Preview file"
                              />
                            )}

                            <button
                              type="button"
                              onClick={() => removeAttachedFile(att.id)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors z-20 cursor-pointer"
                              title={`Remove ${att.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="absolute top-3 right-3 z-10">
                    {input.trim().split(/\s+/).filter(w => w.length > 0).length >= 90 && (
                      <button
                        type="button"
                        onClick={() => setIsExpandedBox(!isExpandedBox)}
                        className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer opacity-0 focus-within:opacity-100 group-hover:opacity-100"
                        title={isExpandedBox ? "Collapse input" : "Expand input"}
                      >
                        {isExpandedBox ? (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 14h6v6" />
                            <path d="M20 10h-6V4" />
                            <path d="M14 10l7-7" />
                            <path d="M3 21l7-7" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 10h-6V4" />
                            <path d="M4 14h6v6" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>

                  {/* @ mention popover */}
                  <AnimatePresence>
                    {atMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-[100%] mb-2 left-0 w-full max-h-[350px] overflow-y-auto bg-popover rounded-2xl border border-border shadow-2xl z-50 flex flex-col p-1.5"
                      >
                        {(() => {
                          const filteredIntegrations = INTEGRATIONS_LIST.filter(item =>
                            item.name.toLowerCase().includes(atMenuQuery.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(atMenuQuery.toLowerCase()))
                          );
                          const baseItems = [
                            { id: "add-photos", name: "Add photos & files", description: "Upload from computer", icon: Paperclip, action: () => fileInputRef.current?.click() },
                            { id: "add-library", name: "Add from library", description: "Browse and search your files", icon: FileText, action: () => setShowFilesPanel(true) },
                            { id: "create-image", name: "Create image", description: "Visualize anything", icon: FileImage },
                            { id: "sketch", name: "Sketch", description: "Draw and attach an image", icon: FileImage },
                            { id: "web-search", name: "Web search", description: "Find real-time news and info", icon: Globe2 },
                            { id: "deep-research", name: "Deep research", description: "Get a detailed report", icon: Globe2 },
                          ].filter(item => item.name.toLowerCase().includes(atMenuQuery.toLowerCase()));
                          const menuItems = [...baseItems, ...filteredIntegrations];

                          return (
                            <>
                              {menuItems.map((item, index) => {
                                const isSelected = index === atMenuSelectedIndex;
                                const IconComponent = item.icon;
                                return (
                                  <button
                                    type="button"
                                    key={item.id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (item.action) {
                                        item.action();
                                      } else {
                                        const cursorPosition = (inputRef.current as any)?.selectionStart || input.length;
                                        const textBeforeCursor = input.slice(0, cursorPosition);
                                        const textAfterCursor = input.slice(cursorPosition);
                                        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                                        const newInput = textBeforeCursor.slice(0, lastAtIndex) + '@' + item.name + ' ' + textAfterCursor;
                                        setInput(newInput);
                                        setTimeout(() => (inputRef.current as any)?.focus(), 0);
                                      }
                                      setAtMenuOpen(false);
                                    }}
                                    className={cn(
                                      "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                                      isSelected ? "bg-accent" : "hover:bg-accent/50"
                                    )}
                                    onMouseEnter={() => setAtMenuSelectedIndex(index)}
                                  >
                                    {item.imgUrl ? (
                                      <img
                                        src={item.imgUrl}
                                        alt={item.name}
                                        className="w-5 h-5 object-contain"
                                        style={{ filter: item.invertInDarkMode ? 'var(--icon-invert, none)' : item.invertInLightMode ? 'var(--icon-invert-light, none)' : 'none' }}
                                      />
                                    ) : IconComponent ? (
                                      <IconComponent className="w-5 h-5 text-popover-foreground/70 shrink-0" />
                                    ) : (
                                      <div className="w-5 h-5 shrink-0" />
                                    )}
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-[14px] text-popover-foreground font-medium whitespace-nowrap">{item.name}</span>
                                      {item.description && (
                                        <span className="text-[14px] text-muted-foreground truncate">{item.description}</span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                              {menuItems.length === 0 && (
                                <div className="px-4 py-3 text-sm text-muted-foreground text-center">No results found</div>
                              )}
                            </>
                          );
                        })()}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {replyToMessage && (
                    <div 
                      className="flex items-center justify-between bg-muted/30 border border-border px-3 py-2 mx-3 mt-3 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        const el = document.getElementById(`msg-${replyToMessage.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.style.transition = 'background-color 0.3s ease';
                          el.style.backgroundColor = 'rgba(16, 185, 129, 0.2)';
                          setTimeout(() => el.style.backgroundColor = '', 1000);
                        }
                      }}
                    >
                      <div className="flex flex-col overflow-hidden max-w-[90%] border-l-2 border-foreground/30 pl-2 pointer-events-none">
                        <span className="font-semibold text-[11px] text-foreground mb-0.5 uppercase tracking-wider pointer-events-none">Replying to AI</span>
                        <span className="text-muted-foreground truncate whitespace-nowrap text-[13px] pointer-events-none">
                          {stripMarkdownForPreview(replyToMessage.content).substring(0, 100)}
                          {stripMarkdownForPreview(replyToMessage.content).length > 100 ? "..." : ""}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReplyToMessage(null);
                        }}
                        className="text-muted-foreground hover:text-foreground shrink-0 rounded-full hover:bg-muted p-1.5 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <RichChatInput
                    id="ask-ai-input"
                    name="askAiQuestion"
                    ref={inputRef as any}
                    disabled={isRecording || isTranscribing || !!chatEnded}
                    value={input}
                    onChange={(event) => {
                      const val = event.target.value;
                      setInput(val);
                      const wordCount = val.trim().split(/\s+/).filter(w => w.length > 0).length;
                      if (isExpandedBox && wordCount < 90) {
                        setIsExpandedBox(false);
                      }
                      if (val.length === 0) {
                        event.target.style.height = '';
                      } else if (!isExpandedBox || wordCount < 90) {
                        event.target.style.height = 'auto';
                        event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
                      }

                      // @ mention logic
                      const cursorPosition = event.target.selectionStart;
                      const textBeforeCursor = val.slice(0, cursorPosition);
                      const atMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
                      if (atMatch) {
                        setAtMenuOpen(true);
                        setAtMenuQuery(atMatch[1]);
                        setAtMenuSelectedIndex(0);
                      } else {
                        setAtMenuOpen(false);
                      }
                    }}
                    onPaste={handlePaste}
                    onKeyDown={(e) => {
                      if (atMenuOpen) {
                        const filteredIntegrations = INTEGRATIONS_LIST.filter(item =>
                          item.name.toLowerCase().includes(atMenuQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(atMenuQuery.toLowerCase()))
                        );
                        const baseItems = [
                          { id: "add-photos", name: "Add photos & files", description: "Upload from computer", icon: Paperclip, action: () => fileInputRef.current?.click() },
                          { id: "add-library", name: "Add from library", description: "Browse and search your files", icon: FileText, action: () => setShowFilesPanel(true) },
                          { id: "create-image", name: "Create image", description: "Visualize anything", icon: FileImage },
                          { id: "sketch", name: "Sketch", description: "Draw and attach an image", icon: FileImage },
                          { id: "web-search", name: "Web search", description: "Find real-time news and info", icon: Globe2 },
                          { id: "deep-research", name: "Deep research", description: "Get a detailed report", icon: Globe2 },
                        ].filter(item => item.name.toLowerCase().includes(atMenuQuery.toLowerCase()));
                        const menuItems = [...baseItems, ...filteredIntegrations];

                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setAtMenuSelectedIndex(prev => (prev + 1) % menuItems.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setAtMenuSelectedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const selectedItem = menuItems[atMenuSelectedIndex];
                          if (selectedItem) {
                            if (selectedItem.action) {
                              selectedItem.action();
                            } else {
                              const cursorPosition = (inputRef.current as any)?.selectionStart || input.length;
                              const textBeforeCursor = input.slice(0, cursorPosition);
                              const textAfterCursor = input.slice(cursorPosition);
                              const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                              const newInput = textBeforeCursor.slice(0, lastAtIndex) + '@' + selectedItem.name + ' ' + textAfterCursor;
                              setInput(newInput);
                              setTimeout(() => (inputRef.current as any)?.focus(), 0);
                            }
                          }
                          setAtMenuOpen(false);
                          return;
                        }
                        if (e.key === 'Escape') {
                          setAtMenuOpen(false);
                          return;
                        }
                      }

                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (canSubmit) {
                          submitInput();
                          setIsExpandedBox(false);
                          setAtMenuOpen(false);
                        }
                      }
                    }}
                    placeholder={attachedFiles.length > 0 ? "Add a message or send files..." : "Ask a question..."}
                    className={cn(
                      // mb-12 (not pb-12): the scrolling text area ends above the buttons, so long text never slides under them
                      "w-full resize-none bg-transparent mb-12 pb-1 pl-4 pr-4 text-[16px] sm:text-sm focus:outline-none overflow-y-auto chat-scrollbar leading-relaxed transition-all duration-300",
                      // The narrow side panel has the buttons below the text, so it keeps normal side spacing
                      variant === "overlay" ? "" : cn("sm:pl-24", showFilesPanel ? "sm:pr-32" : "sm:pr-60", "@max-[56rem]:!pl-4 @max-[56rem]:!pr-4"),
                      (isRecording || isTranscribing) ? "text-transparent placeholder:text-transparent" : "text-foreground",
                      isExpandedBox ? "min-h-[calc(60vh-3rem)] max-h-[calc(60vh-3rem)]" : "min-h-[40px] max-h-[132px]", // 3rem (mb-12) less than before: same box size
                      (pageContext?.path?.startsWith("/docs") || attachedFiles.length > 0) ? "pt-3" : "pt-4 rounded-2xl"
                    )}
                  />

                  {isRecording && (
                    <div className="absolute left-14 right-4 top-4 flex items-center pointer-events-none z-10">
                      <div className="w-2 h-2 bg-foreground rounded-full animate-pulse mr-3 shrink-0" />
                      <span className="text-sm font-mono mr-3 text-foreground shrink-0">
                        {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                      </span>
                      <LiveWaveform stream={micStream} />
                    </div>
                  )}

                  {/* Bottom Left action bar: paperclip and AI Hub */}
                  <div className="absolute bottom-3 left-4 flex items-center gap-1">
                    {!isGenerating && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={attachedFiles.length >= 6}
                        className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 transition-all cursor-pointer"
                        title={attachedFiles.length >= 6 ? "Max 6 files" : "Attach file (max 35MB)"}
                      >
                        <Paperclip className={cn("h-4 w-4 -rotate-45", isAnyFileUploading && "opacity-50")} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsAiHubOpen(true)}
                      className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
                      title="AI Hub"
                    >
                      <CustomSlidersIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Bottom Right action bar: send OR stop */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-0.5">
                    <ModelPicker value={selectedModel} onChange={setSelectedModel} disabled={isGenerating} />
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isTranscribing}
                      className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all ${isTranscribing ? "opacity-50 cursor-not-allowed text-foreground bg-muted" : "cursor-pointer " + (isRecording ? "text-foreground bg-muted hover:bg-muted/80" : "text-muted-foreground hover:text-foreground hover:bg-muted/80")}`}
                      title={isTranscribing ? "Transcribing..." : isRecording ? "Stop dictation" : "Dictate"}
                    >
                      {isTranscribing ? <Spinner className="h-4 w-4" /> : isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                    </button>
                    {isGenerating ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleStop}
                        className="h-8 rounded-full bg-foreground text-background hover:bg-foreground/90 px-3 text-[11px] font-medium shadow-sm transition-all active:scale-95"
                        title="Stop generating"
                      >
                        <Square className="mr-1.5 h-3 w-3 fill-current opacity-80" />
                        Stop
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        disabled={!canSubmit}
                        className="h-8 w-8 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-all shadow-sm"
                      >
                        <ArrowUp className="h-4 w-4" />
                        <span className="sr-only">Send question</span>
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes targetGlowPulse {
          0% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); }
          15% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.6); }
          70% { box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.6); }
          100% { box-shadow: 0 0 0 0px rgba(16, 185, 129, 0); }
        }
        .msg-target-glow:target {
          animation: targetGlowPulse 2.5s ease-in-out forwards;
        }
      `}</style>
      {/* ───────────────────────────────────────────────────────────────────────── 
          FULL-PAGE: ChatGPT-style centered layout
          ────────────────────────────────────────────────────────────────────────── */}
      {variant === "full-page" ? (
        // Incognito: a dark frame with the "Incognito" bar on top and the chat in a rounded panel (like claude.ai)
        // It covers the whole screen, sidebar included (z-45: above the sidebar, below menus and dialogs at z-50)
        <div className={isIncognito ? "fixed inset-0 z-[45] w-full h-[100dvh] bg-[#ffffff] dark:bg-[#0f0f0f] flex flex-col overflow-hidden" : "contents"}>
        <IncognitoTransition
          run={incognitoRun}
          onCovered={() => (incognitoRun?.kind === "enter" ? enterIncognitoNow() : leaveIncognitoNow())}
          onDone={() => setIncognitoRun(null)}
        />
        {isIncognito && <IncognitoBar onClose={exitIncognito} />}
        <div className={isIncognito
          ? "flex-1 min-h-0 mx-1.5 mb-1.5 sm:mx-2 sm:mb-2 rounded-2xl border border-slate-200 dark:border-[#262626] !bg-[#fafafa] dark:!bg-[#000000] flex flex-row overflow-hidden"
          : "w-full h-[100dvh] !bg-[#fafafa] dark:!bg-[#000000] flex flex-row overflow-hidden"}>
          <div className="flex-1 min-w-0 min-h-0 relative flex flex-col h-full overflow-hidden">
            {/* Sidebar toggle and Top Right Header Actions */}
            {studioMenu && messages.length > 0 && sessionId && !isIncognito && sessionId !== "schedule" && sessionId !== "library" && (
              <div className="absolute top-3 right-12 z-20 flex items-center gap-1 animate-in fade-in-0 duration-200">
                <StudioChatMenu
                  sessionId={sessionId}
                  isPinned={isPinned}
                  onTogglePin={handlePinToggle}
                  onDelete={() => setShowDeleteConfirm(true)}
                  messages={messages.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" }))}
                />
                <OpenInProjectButton sessionId={sessionId} />
                <StudioOverviewButton sessionId={sessionId} />
              </div>
            )}
            <div className={pageContext?.path === "/c/studio" ? "hidden" : "shrink-0 flex items-center justify-between px-3 sm:px-6 pt-3 h-14"}>
              {isIncognito || pageContext?.path === "/c/studio" ? <span /> : <SidebarTrigger />}

              {/* Ghost button on a new chat: start an incognito chat */}
              {emptyState && !isIncognito && !isLoadingChat && sessionId !== "schedule" && sessionId !== "library" && (
                <IncognitoButton onClick={startIncognito} />
              )}

              {messages.length > 0 && sessionId && !isIncognito && sessionId !== "schedule" && sessionId !== "library" && pageContext?.path !== "/c/studio" && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  {/* Questions list (the side list is hidden on smaller screens and phones) */}
                  <MobileTOCButton tocItems={tocItems} activeSection={activeSection} />
                  <button
                    type="button"
                    aria-label="Share Grid"
                    onClick={() => { setShowFilesPanel(false); setShowGridPanel((o) => !o); }}
                    className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ShareGridIcon className="h-4 w-4" />
                  </button>
                  {/* Direct Share Button */}
                  <button
                    onClick={handleDirectShare}
                    className="flex items-center gap-1.5 h-8 px-2.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[13px] font-medium transition-colors cursor-pointer"
                  >
                    <Share className="h-4 w-4" />
                    Share
                  </button>

                  {/* Three Dot Menu */}
                  {sessionId ? (
                    <StudioChatMenu
                      sessionId={sessionId}
                      isPinned={isPinned}
                      onTogglePin={handlePinToggle}
                      onDelete={() => setShowDeleteConfirm(true)}
                      onFilesInChat={() => setShowFilesPanel(true)}
                      messages={messages.map((m) => ({ role: m.role, content: typeof m.content === "string" ? m.content : "" }))}
                    />
                  ) : null}
                </div>
              )}
            </div>

            {sessionId === "schedule" ? (
              <div className="flex-1 overflow-y-auto">
                {detailId ? <ScheduleDetailPage id={detailId} /> : <SchedulePage />}
              </div>
            ) : sessionId === "library" ? (
              <div className="flex-1 overflow-y-auto">
                <LibraryPage />
              </div>
            ) : isLoadingChat ? (
              <>
                <div className="flex-1 overflow-y-scroll overscroll-contain scroll-smooth chat-scrollbar [scrollbar-gutter:stable]">
                  <div className="max-w-[48rem] mx-auto w-full px-4 py-8">
                    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                      <div className="flex justify-end">
                        <div className="w-[55%] space-y-2">
                          <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-[35%] rounded-lg bg-muted animate-pulse ml-auto" />
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="w-[75%] space-y-2.5">
                          <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-[90%] rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-[65%] rounded-lg bg-muted animate-pulse" />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <div className="w-[45%] space-y-2">
                          <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
                        </div>
                      </div>
                      <div className="flex justify-start">
                        <div className="w-[80%] space-y-2.5">
                          <div className="h-4 w-full rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-[95%] rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-[55%] rounded-lg bg-muted animate-pulse" />
                          <div className="h-4 w-[75%] rounded-lg bg-muted animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="shrink-0 !bg-[#fafafa] dark:!bg-[#000000] pt-2 sm:pt-0 pb-3 sm:pb-6 px-3 sm:px-4 md:px-8 max-w-4xl w-full mx-auto">
                  {panelInput}
                </div>
              </>
            ) : emptyState ? (
              /* â”€â”€ PostHog-style: everything in one centered block â”€â”€ */
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-4 md:px-8 pb-3 sm:pb-0">
                {/* Phones: greeting in the middle, input pinned to the bottom (like ChatGPT); desktop: one centered block */}
                <div className="max-w-[68rem] w-full flex flex-col items-center gap-6 flex-1 sm:flex-none">

                  {/* Logo on the left of the greeting, one line */}
                  {pageContext?.path !== "/c/studio" && (
                  <div className="flex items-center justify-center gap-3 mt-auto sm:mt-0">
                    <img src="/logo.png" alt="Classgrid" className="h-9 w-9 sm:h-[46px] sm:w-[46px] shrink-0 object-contain" />
                    {/* Fixed height so the input below never moves while the line types; pauses while the user types */}
                    <h2 style={{ fontFamily: "Newsreader, Georgia, serif" }} className="font-normal text-[1.75rem] sm:text-[2.25rem] leading-tight tracking-[-0.01em] text-[#141413] dark:text-[#faf9f5] min-h-[2.5rem]">
                      {isIncognito ? (
                        <motion.span
                          className="inline-block"
                          initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                        >
                          You’re incognito
                        </motion.span>
                      ) : <TypingGreeting name={user?.name} paused={input.trim().length > 0} />}
                    </h2>
                  </div>
                  )}

                  {/* Inline input form â€” not using panelInput */}
                  <div className="w-full max-w-[640px] mt-auto sm:mt-0">
                    {inputHeader && <div className="mb-2 flex">{inputHeader}</div>}
                    {isTerminated ? (
                      <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-500">
                        <p>This conversation has been terminated.</p>
                      </div>
                    ) : (
                      <>
                        <AnimatePresence>
                          {messageQueue.length > 0 && (
                            <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-start gap-2 w-full mb-2">
                              <motion.button
                                type="button"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => setIsQueueVisible(!isQueueVisible)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-[13px] shadow-sm font-medium"
                              >
                                <Layers className="h-3.5 w-3.5" />
                                {messageQueue.length} queued
                              </motion.button>
                              <AnimatePresence>
                                {isQueueVisible && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0, y: -10 }}
                                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                                    exit={{ opacity: 0, height: 0, y: -10 }}
                                    className="flex flex-col gap-0 w-full py-2 px-2 rounded-lg bg-background border border-border/40 max-h-[200px] overflow-y-auto chat-scrollbar origin-top"
                                  >
                                    <AnimatePresence>
                                      {messageQueue.map((msg) => (
                                        <motion.div
                                          key={msg.id}
                                          layout
                                          initial={{ opacity: 0, scale: 0.95 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          transition={{ duration: 0.2 }}
                                          className="group flex items-center justify-between gap-2 py-1.5 px-2 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground cursor-default transition-colors shrink-0"
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <CornerDownRight className="h-3.5 w-3.5 shrink-0" />
                                            <span className="text-[13px] truncate">
                                              {msg.text || (msg.attachedFiles.length > 0 ? "Attached files..." : "Pending...")}
                                            </span>
                                          </div>
                                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setMessageQueue(prev => prev.filter(m => m.id !== msg.id));
                                                setPriorityMessage(msg);
                                              }}
                                              className="text-[12px] cursor-pointer px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                            >
                                              Send
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setMessageQueue(prev => prev.filter(m => m.id !== msg.id))}
                                              className="cursor-pointer p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                              title="Cancel"
                                            >
                                              <X className="h-3.5 w-3.5" />
                                            </button>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </AnimatePresence>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {endedView && (
                          <>
                            <ChatEndedCard reason={endedView.reason} onNewChat={handleEndedNewChat} onFeedback={() => setEndedFeedbackOpen(true)} />
                            {endedFeedbackOpen && (
                              <AiFeedbackModal isOpen={endedFeedbackOpen} onClose={() => setEndedFeedbackOpen(false)} onSubmit={submitEndedFeedback} isSubmitting={endedFeedbackSubmitting} />
                            )}
                          </>
                        )}
                        <form onSubmit={handleSubmit} className={cn("space-y-2", endedView && "hidden")}>
                          <div className={cn(
                            "group relative w-full shadow-sm rounded-2xl border border-border !bg-white dark:!bg-[#0f0f0f] focus-within:border-black/80 dark:focus-within:border-white/50 focus-within:ring-1 focus-within:ring-black/80 dark:focus-within:ring-white/50 transition-all duration-300",
                            isIncognito && "border-dashed border-slate-300 dark:border-[#3a3a3a]"
                          )}>
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept={ACCEPTED_FILE_TYPES}
                              onChange={handleFileSelect}
                              className="hidden"
                            />
                            {(attachedFiles.length > 0 || pastedTexts.length > 0) && (
                              <div className="px-3 pt-3 pb-0 flex flex-wrap gap-1.5">
                                {pastedTexts.map((pt, idx) => (
                                  <div
                                    key={`pasted-inline-${idx}`}
                                    className="group relative inline-flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 shadow-sm max-w-[220px] transition-all cursor-pointer hover:bg-muted/60"
                                    title="Too long to show in text field"
                                    onClick={() => setEditingMode(idx)}
                                  >
                                    <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                      <FileText className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div className="flex flex-col min-w-0 overflow-hidden text-left gap-0.5">
                                      <span className="text-[13px] font-medium text-foreground truncate leading-tight">
                                        Pasted text {pastedTexts.length > 1 ? idx + 1 : ""}
                                      </span>
                                      <span className="text-[12px] text-muted-foreground truncate leading-tight">
                                        Pasted text
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setPastedTexts(prev => prev.filter((_, i) => i !== idx));
                                      }}
                                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-colors z-10 cursor-pointer"
                                      title="Remove pasted text"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                {attachedFiles.map((att) => {
                                  const Icon = getFileIcon(att.type);
                                  const isImage = att.type.startsWith("image/");
                                  return (
                                    <div
                                      key={att.id}
                                      className={cn(
                                        "group relative inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 pr-8 shadow-sm max-w-[200px] transition-all",
                                        att.status === "error" ? "border-red-500/50 bg-red-500/10" : "border-border/80 bg-muted/40",
                                        att.status === "uploading" ? "opacity-70 animate-pulse" : "opacity-100"
                                      )}
                                    >
                                      {isImage ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                          src={att.url || (att.file ? URL.createObjectURL(att.file) : "")}
                                          alt={att.name}
                                          className="h-6 w-6 rounded object-cover shrink-0"
                                        />
                                      ) : (
                                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                      )}
                                      <div className="flex flex-col min-w-0 overflow-hidden text-left gap-0">
                                        <span className="text-[11px] font-medium text-foreground truncate leading-tight">
                                          {att.name}
                                        </span>
                                        {att.status === "uploading" ? (
                                          <div className="h-1.5 w-full max-w-[80px] bg-muted-foreground/20 rounded-full overflow-hidden mt-1 mb-0.5">
                                            <motion.div
                                              initial={{ width: "0%" }}
                                              animate={{ width: "85%" }}
                                              transition={{ duration: 2.5, ease: "easeOut" }}
                                              className="h-full bg-emerald-500 rounded-full"
                                            />
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground/70 leading-tight">
                                            {att.status === "error" ? "Failed" : formatFileSize(att.size)}
                                          </span>
                                        )}
                                      </div>

                                      {/* Allow previewing the file immediately after successful upload */}
                                      {att.status === "done" && att.url && (
                                        <button
                                          type="button"
                                          onClick={() => setPreviewFile({ name: att.name, src: att.url!, mimeType: att.type })}
                                          className="absolute inset-0 w-full h-full cursor-pointer z-10"
                                          title="Preview file"
                                        />
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => removeAttachedFile(att.id)}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors z-20 cursor-pointer"
                                        title={`Remove ${att.name}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="absolute top-3 right-3 z-10">
                              {input.trim().split(/\s+/).filter(w => w.length > 0).length >= 90 && (
                                <button
                                  type="button"
                                  onClick={() => setIsExpandedBox(!isExpandedBox)}
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer opacity-0 focus-within:opacity-100 group-hover:opacity-100"
                                  title={isExpandedBox ? "Collapse input" : "Expand input"}
                                >
                                  {isExpandedBox ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M4 14h6v6" />
                                      <path d="M20 10h-6V4" />
                                      <path d="M14 10l7-7" />
                                      <path d="M3 21l7-7" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M20 10h-6V4" />
                                      <path d="M4 14h6v6" />
                                    </svg>
                                  )}
                                </button>
                              )}
                            </div>

                            {/* @ mention popover */}
                            <AnimatePresence>
                              {atMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute top-[100%] mt-2 left-0 w-full max-h-[160px] overflow-y-auto bg-popover rounded-2xl border border-border shadow-2xl z-50 flex flex-col p-1.5 custom-scrollbar"
                                >
                                  {(() => {
                                    const filteredIntegrations = INTEGRATIONS_LIST.filter(item =>
                                      item.name.toLowerCase().includes(atMenuQuery.toLowerCase()) ||
                                      (item.description && item.description.toLowerCase().includes(atMenuQuery.toLowerCase()))
                                    );
                                    const baseItems = [
                                      { id: "add-photos", name: "Add photos & files", description: "Upload from computer", icon: Paperclip, action: () => fileInputRef.current?.click() },
                                      { id: "add-library", name: "Add from library", description: "Browse and search your files", icon: FileText, action: () => setShowFilesPanel(true) },
                                      { id: "create-image", name: "Create image", description: "Visualize anything", icon: FileImage },
                                      { id: "sketch", name: "Sketch", description: "Draw and attach an image", icon: FileImage },
                                      { id: "web-search", name: "Web search", description: "Find real-time news and info", icon: Globe2 },
                                      { id: "deep-research", name: "Deep research", description: "Get a detailed report", icon: Globe2 },
                                    ].filter(item => item.name.toLowerCase().includes(atMenuQuery.toLowerCase()));
                                    const menuItems = [...baseItems, ...filteredIntegrations];

                                    return (
                                      <>
                                        {menuItems.map((item, index) => {
                                          const isSelected = index === atMenuSelectedIndex;
                                          const IconComponent = item.icon;
                                          return (
                                            <button
                                              type="button"
                                              key={item.id}
                                              onClick={(e) => {
                                                e.preventDefault();
                                                if (item.action) {
                                                  item.action();
                                                } else {
                                                  const cursorPosition = (inputRef.current as any)?.selectionStart || input.length;
                                                  const textBeforeCursor = input.slice(0, cursorPosition);
                                                  const textAfterCursor = input.slice(cursorPosition);
                                                  const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                                                  const newInput = textBeforeCursor.slice(0, lastAtIndex) + '@' + item.name + ' ' + textAfterCursor;
                                                  setInput(newInput);
                                                  setTimeout(() => (inputRef.current as any)?.focus(), 0);
                                                }
                                                setAtMenuOpen(false);
                                              }}
                                              className={cn(
                                                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                                                isSelected ? "bg-accent" : "hover:bg-accent/50"
                                              )}
                                              onMouseEnter={() => setAtMenuSelectedIndex(index)}
                                            >
                                              {item.imgUrl ? (
                                                <img
                                                  src={item.imgUrl}
                                                  alt={item.name}
                                                  className="w-5 h-5 object-contain"
                                                  style={{ filter: item.invertInDarkMode ? 'var(--icon-invert, none)' : item.invertInLightMode ? 'var(--icon-invert-light, none)' : 'none' }}
                                                />
                                              ) : IconComponent ? (
                                                <IconComponent className="w-5 h-5 text-popover-foreground/70 shrink-0" />
                                              ) : (
                                                <div className="w-5 h-5 shrink-0" />
                                              )}
                                              <div className="flex items-center gap-2 truncate">
                                                <span className="text-[14px] text-popover-foreground font-medium whitespace-nowrap">{item.name}</span>
                                                {item.description && (
                                                  <span className="text-[14px] text-muted-foreground truncate">{item.description}</span>
                                                )}
                                              </div>
                                            </button>
                                          );
                                        })}
                                        {menuItems.length === 0 && (
                                          <div className="px-4 py-3 text-sm text-muted-foreground text-center">No results found</div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <RichChatInput
                              id="ask-ai-input"
                              name="askAiQuestion"
                              ref={inputRef as any}
                              disabled={isRecording || isTranscribing}
                              value={input}
                              onChange={(event) => {
                                const val = event.target.value;
                                setInput(val);
                                const wordCount = val.trim().split(/\s+/).filter(w => w.length > 0).length;
                                if (isExpandedBox && wordCount < 90) {
                                  setIsExpandedBox(false);
                                }
                                if (val.length === 0) {
                                  event.target.style.height = '';
                                } else if (!isExpandedBox || wordCount < 90) {
                                  event.target.style.height = 'auto';
                                  event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
                                }

                                // @ mention logic
                                const cursorPosition = event.target.selectionStart;
                                const textBeforeCursor = val.slice(0, cursorPosition);
                                const atMatch = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
                                if (atMatch) {
                                  setAtMenuOpen(true);
                                  setAtMenuQuery(atMatch[1]);
                                  setAtMenuSelectedIndex(0);
                                } else {
                                  setAtMenuOpen(false);
                                }
                              }}
                              onPaste={handlePaste}
                              onKeyDown={(e) => {
                                if (atMenuOpen) {
                                  const filteredIntegrations = INTEGRATIONS_LIST.filter(item =>
                                    item.name.toLowerCase().includes(atMenuQuery.toLowerCase()) ||
                                    (item.description && item.description.toLowerCase().includes(atMenuQuery.toLowerCase()))
                                  );
                                  const baseItems = [
                                    { id: "add-photos", name: "Add photos & files", description: "Upload from computer", icon: Paperclip, action: () => fileInputRef.current?.click() },
                                    { id: "add-library", name: "Add from library", description: "Browse and search your files", icon: FileText, action: () => setShowFilesPanel(true) },
                                    { id: "create-image", name: "Create image", description: "Visualize anything", icon: FileImage },
                                    { id: "sketch", name: "Sketch", description: "Draw and attach an image", icon: FileImage },
                                    { id: "web-search", name: "Web search", description: "Find real-time news and info", icon: Globe2 },
                                    { id: "deep-research", name: "Deep research", description: "Get a detailed report", icon: Globe2 },
                                  ].filter(item => item.name.toLowerCase().includes(atMenuQuery.toLowerCase()));
                                  const menuItems = [...baseItems, ...filteredIntegrations];

                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setAtMenuSelectedIndex(prev => (prev + 1) % menuItems.length);
                                    return;
                                  }
                                  if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setAtMenuSelectedIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
                                    return;
                                  }
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const selectedItem = menuItems[atMenuSelectedIndex];
                                    if (selectedItem) {
                                      if (selectedItem.action) {
                                        selectedItem.action();
                                      } else {
                                        const cursorPosition = (inputRef.current as any)?.selectionStart || input.length;
                                        const textBeforeCursor = input.slice(0, cursorPosition);
                                        const textAfterCursor = input.slice(cursorPosition);
                                        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
                                        const newInput = textBeforeCursor.slice(0, lastAtIndex) + '@' + selectedItem.name + ' ' + textAfterCursor;
                                        setInput(newInput);
                                        setTimeout(() => (inputRef.current as any)?.focus(), 0);
                                      }
                                    }
                                    setAtMenuOpen(false);
                                    return;
                                  }
                                  if (e.key === 'Escape') {
                                    setAtMenuOpen(false);
                                    return;
                                  }
                                }

                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  if (canSubmit) {
                                    submitInput();
                                    setIsExpandedBox(false);
                                    setAtMenuOpen(false);
                                  }
                                }
                              }}
                              placeholder="Ask anything, analyse a file, or schedule a task…"
                              className={cn(
                                "w-full resize-none bg-transparent mb-12 pb-1 pl-4 pr-4 sm:pl-24 pt-4 rounded-2xl text-[16px] sm:text-sm focus:outline-none overflow-y-auto chat-scrollbar leading-relaxed transition-all duration-300",
                                showFilesPanel ? "sm:pr-32" : "sm:pr-60",
                                "@max-[56rem]:!pl-4 @max-[56rem]:!pr-4", // a narrow chat column (Studio Mode) drops the wide side spaces
                                (isRecording || isTranscribing) ? "text-transparent placeholder:text-transparent" : "text-foreground",
                                isExpandedBox ? "min-h-[calc(60vh-3rem)] max-h-[calc(60vh-3rem)]" : "min-h-[40px] max-h-[132px]"
                              )}
                            />

                            {isRecording && (
                              <div className="absolute left-14 right-4 top-4 flex items-center pointer-events-none z-10">
                                <div className="w-2 h-2 bg-foreground rounded-full animate-pulse mr-3 shrink-0" />
                                <span className="text-sm font-mono mr-3 text-foreground shrink-0">
                                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                                </span>
                                <LiveWaveform stream={micStream} />
                              </div>
                            )}

                            {/* Bottom left: paperclip */}
                            <div className="absolute bottom-3 left-4 flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={attachedFiles.length >= 6}
                                className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 transition-all cursor-pointer"
                                title={attachedFiles.length >= 6 ? "Max 6 files" : "Attach file (max 35MB)"}
                              >
                                <Paperclip className="h-4 w-4 -rotate-45" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAiHubOpen(true)}
                                className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all cursor-pointer"
                                title="AI Hub"
                              >
                                <CustomSlidersIcon className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Bottom right: send */}
                            <div className="absolute bottom-3 right-3 flex items-center gap-0.5">
                              <ModelPicker value={selectedModel} onChange={setSelectedModel} />
                              <button
                                type="button"
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={isTranscribing}
                                className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all ${isTranscribing ? "opacity-50 cursor-not-allowed text-foreground bg-muted" : "cursor-pointer " + (isRecording ? "text-foreground bg-muted hover:bg-muted/80" : "text-muted-foreground hover:text-foreground hover:bg-muted/80")}`}
                                title={isTranscribing ? "Transcribing..." : isRecording ? "Stop dictation" : "Dictate"}
                              >
                                {isTranscribing ? <Spinner className="h-4 w-4" /> : isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
                              </button>
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                disabled={!canSubmit}
                                className="h-8 w-8 shrink-0 rounded-full bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-all shadow-sm"
                              >
                                <ArrowUp className="h-4 w-4" />
                                <span className="sr-only">Send question</span>
                              </Button>
                            </div>
                          </div>
                        </form>
                      </>
                    )}
                    {isIncognito && (
                      <p className="mt-5 text-center text-[13.5px] leading-relaxed text-slate-500 dark:text-[#8a8a8a]">
                        Incognito chats are not saved to your history or search.<br className="hidden sm:block" /> They stay in this browser until you close them.
                      </p>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              /* â”€â”€ Active conversation: messages scroll, input pinned at bottom â”€â”€ */
              <>
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-scroll overscroll-contain scroll-smooth chat-scrollbar [scrollbar-gutter:stable]"
                >
                  {panelChat}
                </div>
                <div className="shrink-0 !bg-[#fafafa] dark:!bg-[#000000] pt-2 sm:pt-0 pb-3 sm:pb-6 px-3 sm:px-4 md:px-8 max-w-4xl w-full mx-auto">
                  {panelInput}
                </div>
              </>
            )}
          </div>
          {/* Files / Workspace Panel integrated into page layout */}
          <AnimatePresence>
            {showFilesPanel && (
              <WorkspacePanel
                isOpen={showFilesPanel}
                onClose={() => setShowFilesPanel(false)}
                chatFiles={chatFiles}
                setPreviewFile={setPreviewFile}
                hasPlan={hasPlan}
                hasSandboxFiles={hasSandboxFiles}
                isStreaming={submitting}
                liveSiteUrl={liveSiteUrl}
                sandboxFiles={sandboxFiles}
                currentHtml={latestHtml}
                currentCss={latestCss}
                currentJs={latestJs}
                planNode={planNode}
                planSteps={planSteps}
                completedPlanSteps={completedPlanSteps}
                planStepStatus={planStepStatus}
              />
            )}
            {showGridPanel && !showFilesPanel && gridSessionId && (
              <ShareGridPanel key="share-grid" sessionId={gridSessionId} myEmail={gridMyEmail} onClose={() => setShowGridPanel(false)} />
            )}
          </AnimatePresence>
          {/* Right-side TOC showing user questions */}
          {tocItems.length > 0 && !showFilesPanel && !showGridPanel && pageContext?.path !== "/c/studio" && <ScrollSpyTOC tocItems={tocItems} activeSection={activeSection} />}
          {pageContext?.path === "/c/studio" && <QuestionDots tocItems={tocItems} activeSection={activeSection} />}
        </div>
        </div>
      ) : null}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          DESKTOP: Side Panel Layout
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {variant === "in-flow" ? (
        <div
          className={cn(
            "hidden sm:block shrink-0 overflow-hidden sticky top-0 h-[100dvh]",
            "transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            prefersReducedMotion && "!duration-0",
            open ? "w-[400px]" : "w-0"
          )}
        >
          <aside
            className="h-[100dvh] w-[400px] flex flex-col border-l border-border bg-background"
            aria-hidden={!open}
          >
            {panelHeader}
            {panelChat}
            {panelInput}
          </aside>
        </div>
      ) : null}

      {variant === "overlay" ? (
        <AnimatePresence>
          {!isMobile && open && (
            <motion.aside
              aria-hidden={!open}
              className="fixed inset-y-0 right-0 z-[120] w-[400px] flex flex-col border-l border-border !bg-[#fafafa] dark:!bg-[#000000] hidden sm:flex"
              style={overlayWidth ? { width: overlayWidth } : undefined}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={prefersReducedMotion ? { duration: 0 } : panelTransition}
            >
              {onOverlayWidthChange && <OverlayDragHandle onChange={onOverlayWidthChange} onResizingChange={onOverlayResizingChange} />}
              {panelHeader}
              {panelChat}
              {panelInput}
            </motion.aside>
          )}
        </AnimatePresence>
      ) : null}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          MOBILE: Fixed bottom-sheet (unchanged from production)
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <AnimatePresence>
        {open && isMobile && variant !== "full-page" ? (
          <motion.button
            key="ask-ai-overlay"
            type="button"
            aria-label="Close Ask AI panel"
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[110] bg-background/70 backdrop-blur-sm sm:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          />
        ) : null}
      </AnimatePresence>

      {/* The full-page chat has its own phone layout; this sheet is only for the small Ask AI panel */}
      {isMobile && variant !== "full-page" && (
        <motion.aside
          aria-hidden={!open}
          className={cn(
            "fixed z-[120] flex flex-col border-border bg-background shadow-2xl sm:hidden",
            "inset-x-0 bottom-0 h-[100dvh] w-full border-t",
            open ? "pointer-events-auto" : "pointer-events-none"
          )}
          initial={false}
          animate={
            open
              ? { y: 0, opacity: 1 }
              : { y: "100%", opacity: 0 }
          }
          transition={prefersReducedMotion ? { duration: 0 } : panelTransition}
        >
          {panelHeader}
          {panelChat}
          {panelInput}
        </motion.aside>
      )}

      {/* File Preview Modal */}
      {previewFile && !previewFile.mimeType?.startsWith("image/") && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* DocsImageViewer for standalone image previews (e.g. from the input chip) */}
      {previewFile && previewFile.mimeType?.startsWith("image/") && (
        <DocsImageViewer
          images={[{
            id: previewFile.name,
            src: typeof previewFile.src === 'string' ? previewFile.src : URL.createObjectURL(previewFile.src as Blob),
            alt: previewFile.name
          }]}
          defaultOpenIndex={0}
          renderThumbnails={() => null}
          onClose={() => setPreviewFile(null)}
        />
      )}
      <ExpandedInputModal
        isOpen={editingMode !== null}
        onClose={() => setEditingMode(null)}
        title={typeof editingMode === 'number' ? `Pasted text ${pastedTexts.length > 1 ? editingMode + 1 : ''}.txt` : 'Edit input'}
        value={typeof editingMode === 'number' ? (pastedTexts[editingMode] || "") : input}
        onChange={(val) => {
          if (typeof editingMode === 'number') {
            setPastedTexts(prev => prev.map((pt, i) => i === editingMode ? val : pt));
          } else {
            setInput(val);
          }
        }}
        onSave={() => setEditingMode(null)}
      />
      <ExpandedInputModal
        isOpen={viewingPastedText !== null}
        onClose={() => setViewingPastedText(null)}
        onSave={() => { }}
        value={viewingPastedText?.content || ""}
        title={viewingPastedText?.title || "Pasted text"}
        readOnly={true}
      />
      <DangerConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete chat"
        description="This will permanently delete this chat and all its messages. This action cannot be undone."
        warningMessage="This chat will be permanently deleted."
        actionLabel="Delete chat"
        isLoading={isDeletingChat}
        onConfirm={handleDeleteChat}
      />
      <AiHubModal
        isOpen={isAiHubOpen}
        onClose={() => setIsAiHubOpen(false)}
        initialTab={aiHubInitialTab}
        onSendPrompt={(text) => askQuestion(text, { hidden: true })}
      />
    </>
  );
}




