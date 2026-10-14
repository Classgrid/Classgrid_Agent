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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, Sparkles, BookOpen, FileText, Mic, StopCircle } from 'lucide-react';
import { useCurrentUser } from '@/features/auth/queries/useCurrentUser';
import { Button } from '@/components/marketing_ui/button';
import { apiClient } from '@/lib/apiClient';
import { fetchWithRescue } from '@/lib/rescue';
import ReactMarkdown from 'react-markdown';
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { MermaidViewer } from "@/components/ai/components/MermaidViewer";
import { CopyBlockClient } from "@/components/ai/components/CopyBlockClient";

const preprocessLaTeX = (content: string) => {
  if (!content) return "";
  return content
    .replace(/\\\[/g, () => '$$')
    .replace(/\\\]/g, () => '$$')
    .replace(/\\\(/g, () => '$')
    .replace(/\\\)/g, () => '$');
};

interface ClassroomAITabProps {
  classroomId: string;
  classroomName: string;
  classroomSubject: string;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ClassroomAITab: React.FC<ClassroomAITabProps> = ({
  classroomId,
  classroomName,
  classroomSubject,
}) => {
  const { data: currentUser } = useCurrentUser();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: AIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      // Build conversation history for context
      const history = messages.map(m => ({
        sender: m.role === 'user' ? 'user' : 'ai',
        text: m.content,
      }));

      const formData = new FormData();
      formData.append('message', trimmed);
      formData.append('mode', 'chat');
      formData.append('classroomId', classroomId);
      formData.append('userName', currentUser?.name || 'Student');
      formData.append('userPrn', currentUser?.prn || '');
      formData.append('userRole', currentUser?.role || 'student');
      formData.append('userDept', currentUser?.department || '');
      formData.append('userOrg', currentUser?.orgName || '');
      formData.append('userId', currentUser?._id || '');
      formData.append('isFirstMessage', String(isFirstMessage));
      formData.append('history', JSON.stringify(history));

      const baseUrl = apiClient.defaults.baseURL || '';
      const response = await fetchWithRescue(`${baseUrl}/api/ai-study/stream`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Stream failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                  fullText += data.text;
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId ? { ...m, content: fullText } : m
                    )
                  );
                }
                if (data.error) {
                  fullText += `\n\n⚠️ ${data.error}`;
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === assistantId ? { ...m, content: fullText } : m
                    )
                  );
                }
              } catch {
                // skip non-JSON lines
              }
            }
          }
        }
      }

      setIsFirstMessage(false);
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.' }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    { label: 'Summarize latest material', icon: FileText, prompt: 'Summarize the latest uploaded material or PDF for me.' },
    { label: "What's my next lecture?", icon: BookOpen, prompt: "What's my next lecture or class today?" },
    { label: 'Study tips for weak areas', icon: Sparkles, prompt: 'Based on my performance, what should I focus on studying?' },
  ];

  const smartReplies = [
    "Can you explain that in simpler terms?",
    "Give me an example of this.",
    "What are the most important topics for the exam?",
    "List the key takeaways from the latest announcement."
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] max-w-4xl mx-auto">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 ? (
          /* Welcome State */
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Classgrid AI Assistant</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                I have full context of <strong>{classroomName}</strong> — materials, announcements, your schedule, and your performance data. Ask me anything!
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full pt-2">
              {quickPrompts.map((qp, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(qp.prompt);
                    inputRef.current?.focus();
                  }}
                  className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition-all text-left"
                >
                  <qp.icon size={18} className="text-gray-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-indigo-700 transition-colors">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message Bubbles */
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md border border-gray-200'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-gray max-w-none [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_pre]:bg-gray-800 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_code]:text-indigo-600 [&_code]:bg-indigo-50 [&_code]:px-1 [&_code]:rounded">
                    {msg.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || "");
                            const language = match ? match[1] : "";
                            
                            if (!inline && language === "mermaid") {
                              return <MermaidViewer chart={String(children).replace(/\n$/, "")} />;
                            }

                            if (!inline && ["prompt", "email", "message", "copy"].includes(language)) {
                              return <CopyBlockClient text={String(children).replace(/\n$/, "")} label={language} />;
                            }
                            
                            return <code className={className} {...props}>{children}</code>;
                          }
                        }}
                      >
                        {preprocessLaTeX(msg.content)}
                      </ReactMarkdown>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 relative">
        {/* Smart Reply Chips */}
        {messages.length > 0 && !input.trim() && !isLoading && (
          <div className="absolute -top-12 left-0 right-0 flex justify-center px-4 overflow-x-auto no-scrollbar pointer-events-none">
            <div className="flex gap-2 max-w-4xl mx-auto pointer-events-auto pb-2">
              {smartReplies.map((reply, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(reply);
                    inputRef.current?.focus();
                  }}
                  className="whitespace-nowrap px-4 py-1.5 rounded-full bg-white border border-indigo-100 text-sm text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2 duration-300"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2 max-w-4xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Ask about ${classroomSubject || classroomName}...`}
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:bg-white focus:outline-none transition-all disabled:opacity-50"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 p-0 flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Send className="w-4 h-4 text-white" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI responses are generated from your classroom data. Always verify important information.
        </p>
      </div>
    </div>
  );
};
