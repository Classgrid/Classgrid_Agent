// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
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

/**
 * SharedChatPage — Premium public read-only viewer for shared AI chat transcripts.
 * URL: share.classgrid.in/shared/:shareId
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { MermaidViewer } from "@/components/ai/components/MermaidViewer";
import { CopyBlockClient } from "@/components/ai/components/CopyBlockClient";
import { CodeBlockClient } from "@/components/ai/components/CodeBlockClient";
import { Info, Lightbulb, MessageSquareWarning, AlertTriangle, OctagonAlert } from "lucide-react";
import hljs from "highlight.js";
import 'highlight.js/styles/atom-one-dark.css';
import { fetchWithRescue } from "@/lib/rescue";

interface SharedMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

interface SharedChat {
  title: string;
  sharedBy: string;
  sharedByEmail?: string;
  sharedByAvatar?: string;
  messages: SharedMessage[];
  createdAt: string;
}

/* ── Removed Fake Logo Component ── */

const preprocessLaTeX = (content: string) => {
  if (!content) return "";
  content = content.replace(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*\|\s*(https?:\/\/[^\]]+)\]/g, '![$1]($2)');
  content = content.replace(/\[IMAGE_GENERATION_COMPLETE:\s*([\s\S]*?)\s*:\s*(https?:\/\/[^\]]+)\]/g, '![$1]($2)');
  return content
    .replace(/\\\[/g, () => '$$')
    .replace(/\\\]/g, () => '$$')
    .replace(/\\\(/g, () => '$')
    .replace(/\\\)/g, () => '$');
};

const formatApprovalCard = (content: string) => {
  if (!content) return "";

  const replacer = (match: string, jsonString: string) => {
    try {
      const data = JSON.parse(jsonString.trim());
      if (data.variant === 'questions' && Array.isArray(data.questions)) {
        let formattedText = `**${data.title || 'Questions'}**\n\n`;
        data.questions.forEach((q: any, idx: number) => {
          formattedText += `**${idx + 1}. ${q.prompt}**\n`;
          if (Array.isArray(q.options)) {
            q.options.forEach((opt: string, oIdx: number) => {
              formattedText += `${String.fromCharCode(97 + oIdx)}) ${opt}\n`;
            });
          }
          formattedText += '\n';
        });
        return formattedText.trim();
      } else if (data.variant === 'poll' && data.question) {
        let formattedText = `**Poll: ${data.question}**\n\n`;
        if (Array.isArray(data.options)) {
          data.options.forEach((opt: string) => {
            formattedText += `- ${opt}\n`;
          });
        }
        return formattedText.trim();
      } else {
        return "";
      }
    } catch (e) {
      return "";
    }
  };

  let processed = content.replace(/\[APPR_CARD\]([\s\S]*?)\[\/APPR_CARD\]/gi, replacer);
  processed = processed.replace(/```(?:appr|approval|APPR|APPROVAL)\s*\n([\s\S]*?)```/gi, replacer);
  return processed.trim();
};

/* ── Single Message Row ── */
function MessageRow({ msg, isUser }: { msg: SharedMessage; isUser: boolean }) {
  if (isUser) {
    // Vercel style User Message: right-aligned dark bubble
    return (
      <div className="shared-msg-row user-row">
        <div className="user-bubble">
          {msg.content}
        </div>
      </div>
    );
  }

  // Vercel style Assistant Message: plain text left-aligned
  return (
    <div className="shared-msg-row assistant-row">
      <div className="assistant-content overflow-visible break-words max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={{
            pre({ children }: any) {
              return <>{children}</>;
            },
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-(\w+)/.exec(className || "");
              const language = match ? match[1] : "";
              
              if (!inline && language === "mermaid") {
                return <MermaidViewer chart={String(children).replace(/\n$/, "")} />;
              }

              if (!inline && ["prompt", "email", "message", "copy"].includes(language)) {
                return <CopyBlockClient text={String(children).replace(/\n$/, "")} label={language} />;
              }

              if (!inline) {
                return (
                  <div className="w-full pb-2 overflow-hidden not-prose">
                    <CodeBlockClient
                      language={language}
                      rawCode={String(children).replace(/\n$/, "")}
                      html={`<pre class="text-[13px] py-4 px-4 !m-0 flex flex-col"><code class="font-mono hljs">${
                        language && hljs.getLanguage(language)
                          ? hljs.highlight(String(children).replace(/\n$/, ""), { language }).value
                          : String(children).replace(/\n$/, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                      }</code></pre>`}
                    />
                  </div>
                );
              }

              return (
                <code className="bg-slate-100 dark:bg-white/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md text-[13px] font-mono break-words" {...props}>
                  {children}
                </code>
              );
            },
            table({ children, ...props }) {
              return (
                <div className="w-full pb-2 overflow-x-auto my-4">
                  <div className="rounded-md border border-slate-200 dark:border-white/10 min-w-[500px]">
                    <table className="w-full text-sm" {...props}>{children}</table>
                  </div>
                </div>
              );
            },
            thead({ children, ...props }) {
              return <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10" {...props}>{children}</thead>;
            },
            tbody({ children, ...props }) {
              return <tbody className="divide-y divide-slate-200 dark:divide-white/10" {...props}>{children}</tbody>;
            },
            tr({ children, ...props }) {
              return <tr className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors" {...props}>{children}</tr>;
            },
            th({ children, ...props }) {
              return <th className="h-10 px-4 text-left align-middle font-semibold text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/10 last:border-r-0" {...props}>{children}</th>;
            },
            td({ children, ...props }) {
              return <td className="p-4 align-middle text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-white/10 last:border-r-0" {...props}>{children}</td>;
            },
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
            a({ href, children, ...props }) {
              return (
                <a href={href} target="_blank" rel="noreferrer" className="shared-link" {...props}>
                  {children}
                </a>
              );
            },
          }}
        >
          {preprocessLaTeX(msg.content)}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export function SharedChatPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [chat, setChat] = useState<SharedChat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

  useEffect(() => {
    if (!shareId) return;

    fetchWithRescue(`${apiUrl}/api/ai/shared/${shareId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Chat not found");
        return res.json();
      })
      .then((data) => setChat(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [shareId, apiUrl]);

  if (loading) {
    return (
      <div className="shared-page">
        <div className="shared-loading">
          <div className="shared-spinner" />
        </div>
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="shared-page">
        <div className="shared-error">
          <h2>Chat not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="shared-page">
      {/* Outer page is pure black #000 */}

      {/* ── Header (Real logo) ── */}
      <header className="shared-header">
        <a href="https://classgrid.in" className="shared-logo-link" target="_blank" rel="noopener noreferrer">
          <img src="/logo.png" alt="Classgrid" className="shared-logo-icon" />
          <span className="shared-logo-text">Classgrid</span>
        </a>
      </header>

      {/* ── Center Column Wrapper ── */}
      <div className="shared-center-wrapper">
        
        {/* Author Block (Stacked: "Shared by" -> Photo -> Name -> Email) */}
        <div className="changelog-author-block">
          <span className="shared-by-text-prefix">Shared by</span>
          {chat.sharedByAvatar ? (
            <img src={chat.sharedByAvatar} alt={chat.sharedBy} className="author-avatar" />
          ) : (
            <div className="author-avatar fallback">
              {chat.sharedBy.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
          )}
          <div className="author-text-col">
            <span className="author-name">{chat.sharedBy}</span>
            {chat.sharedByEmail && <span className="author-email">{chat.sharedByEmail}</span>}
          </div>
        </div>

        {/* ── Inner Content (Context Card & Messages) ── */}
        <div className="shared-content-inner">
          
          {/* Chat Messages */}
        <div className="shared-messages">
          {chat.messages.map((msg, i) => {
            const cleanContent = formatApprovalCard(msg.content || "");
            if (!cleanContent) return null;
            return <MessageRow key={i} msg={{ ...msg, content: cleanContent }} isUser={msg.role === "user"} />;
          })}
        </div>

      </div>

    </div>

      <style>{`
        /* ── Page Shell ── */
        .shared-page {
          min-height: 100vh;
          background: #000000; /* Pure black outer */
          color: #ededed;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
        }

        /* ── Header ── */
        .shared-header {
          padding: 24px 24px 0 24px;
        }

        .shared-logo-link {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: #ededed;
          transition: opacity 0.2s;
        }

        .shared-logo-link:hover {
          opacity: 0.7;
        }

        .shared-logo-icon {
          width: 24px;
          height: 24px;
          object-fit: contain;
        }

        .shared-logo-text {
          font-size: 15px;
          font-weight: 600;
        }

        /* ── Center Wrapper ── */
        .shared-center-wrapper {
          margin: 0 auto;
          width: 100%;
          max-width: 650px;
          display: flex;
          flex-direction: column;
          padding: 16px;
        }

        /* ── Inner Content ── */
        .shared-content-inner {
          width: 100%;
          background: #0a0a0a;
          min-height: calc(100vh - 120px);
          padding: 48px 40px;
          border-left: 1px solid rgba(255, 255, 255, 0.04);
          border-right: 1px solid rgba(255, 255, 255, 0.04);
          display: flex;
          flex-direction: column;
        }

        /* ── Changelog-Style Author Block ── */
        .changelog-author-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 32px;
          text-align: center;
        }

        .shared-by-text-prefix {
          color: #888;
          font-size: 14px;
          font-weight: 400;
          margin-bottom: 4px;
        }

        .author-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }

        .author-avatar.fallback {
          background: #333;
          color: #ededed;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
        }

        .author-text-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .author-name {
          color: #ededed;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.2;
        }

        .author-email {
          color: #888;
          font-size: 13px;
          line-height: 1.2;
        }

        /* ── Messages ── */
        .shared-messages {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .shared-msg-row {
          display: flex;
          width: 100%;
        }

        /* User Message (Right Aligned Bubble) */
        .user-row {
          justify-content: flex-end;
        }

        .user-bubble {
          background: #2a2a2a;
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 24px;
          font-weight: 400;
          letter-spacing: normal;
          color: #ededed;
          max-width: 80%;
          word-wrap: break-word;
        }

        /* Assistant Message (Left Aligned Plain Text) */
        .assistant-row {
          justify-content: flex-start;
        }

        .assistant-content {
          font-size: 14px;
          line-height: 24px;
          font-weight: 400;
          letter-spacing: normal;
          color: #ededed;
          width: 100%;
          max-width: 95%;
        }

        .assistant-content p {
          margin-bottom: 12px;
        }

        .assistant-content p:last-child {
          margin-bottom: 0;
        }

        /* Markdown lists, blockquotes, etc. */
        .assistant-content ul {
          list-style-type: disc;
          padding-left: 20px;
          margin-bottom: 12px;
        }

        .assistant-content ol {
          list-style-type: decimal;
          padding-left: 20px;
          margin-bottom: 12px;
        }

        .assistant-content li {
          margin-bottom: 4px;
        }
        
        .assistant-content li:last-child {
          margin-bottom: 0;
        }

        .assistant-content strong {
          font-weight: 600;
          color: #fff;
        }
        
        .assistant-content em {
          font-style: italic;
        }
        
        .assistant-content blockquote {
          border-left: 3px solid #333;
          padding-left: 16px;
          margin: 12px 0;
          color: #888;
        }

        /* Headings inline/tight */
        .assistant-content h1, 
        .assistant-content h2, 
        .assistant-content h3, 
        .assistant-content h4 {
          font-size: 14px;
          font-weight: 600;
          margin: 16px 0 4px;
          color: #fff;
        }

        /* Lists */
        .assistant-content ul, 
        .assistant-content ol {
          margin: 0 0 10px 20px;
          padding: 0;
        }

        .assistant-content li {
          margin-bottom: 4px;
        }

        /* Code blocks (subtle, no huge borders) */
        .shared-code-block {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          overflow-x: auto;
          margin: 8px 0;
          font-family: 'JetBrains Mono', monospace;
          
          /* Match Link Share Alert sizing */
          width: 100%;
          max-width: 100%;
          padding: 10px 12px;
          font-size: 14px;
        }

        .shared-inline-code {
          background: rgba(255, 255, 255, 0.1);
          padding: 2px 4px;
          border-radius: 4px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }

        /* Links */
        .shared-link {
          color: #10b981;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* Loading & Error */
        .shared-loading, .shared-error {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        
        .shared-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: #10b981;
          border-radius: 50%;
          animation: shared-spin 0.8s linear infinite;
        }

        @keyframes shared-spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .shared-content-inner {
            padding: 32px 20px;
            border-left: none;
            border-right: none;
          }
        }

        /* ── Hover Effects ── */
        .shared-link:hover {
          text-decoration: underline;
        }

        /* ─────────────────────────────────────────────────────────
         *  LIGHT MODE OVERRIDES
         * ───────────────────────────────────────────────────────── */
        @media (prefers-color-scheme: light) {
          .shared-page {
            background: #fafafa;
            color: #171717;
          }
          
          .shared-logo-link {
            color: #171717;
          }
          
          .shared-content-inner {
            background: #ffffff;
            border-left: 1px solid #eaeaea;
            border-right: 1px solid #eaeaea;
          }
          
          .shared-by-text-prefix {
            color: #666666;
          }
          
          .author-name {
            color: #171717;
          }
          
          .author-email {
            color: #666666;
          }
          
          .user-bubble {
            background: #000000;
            color: #ffffff;
          }
          
          .assistant-content {
            color: #171717;
          }
          
          .assistant-content h1, 
          .assistant-content h2, 
          .assistant-content h3, 
          .assistant-content h4,
          .assistant-content strong {
            color: #171717;
          }
          
          .assistant-content blockquote {
            border-left: 3px solid #eaeaea;
            color: #666666;
          }
          
          .shared-code-block {
            background: #fafafa;
            border: 1px solid #eaeaea;
          }
          
          .shared-inline-code {
            background: rgba(0, 0, 0, 0.05);
          }
          
          .shared-link {
            color: #0070f3;
          }
        }
      `}</style>
    </div>
  );
}
