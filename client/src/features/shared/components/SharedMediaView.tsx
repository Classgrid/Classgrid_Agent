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

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/marketing_ui/tabs";
import {  ImageIcon, FileText, Link2, ExternalLink, Download } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { Spinner } from "@/components/marketing_ui/spinner";
import FilePreviewModal from "@/app/support/components/FilePreviewModal";

interface SharedMediaViewProps {
  targetUserId?: string;
  threadId?: string;
}

export function SharedMediaView({ targetUserId, threadId }: SharedMediaViewProps) {
  const [viewingMedia, setViewingMedia] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["shared-media", targetUserId, threadId],
    queryFn: () => {
      if (threadId) {
        return apiClient.get(`/api/threads/${threadId}/shared-media`).then((r) => r.data);
      }
      return apiClient.get(`/api/threads/dm/${targetUserId}/shared-media`).then((r) => r.data);
    },
    enabled: !!targetUserId || !!threadId 
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full py-20 text-muted-foreground">
        <Spinner className=" mb-4" size={32} />
        <p>Loading shared files...</p>
      </div>
    );
  }

  const media = (data?.media || []).filter((item: any) => !item.file_type.startsWith('audio/'));
  const docs = data?.docs || [];
  const links = data?.links || [];

  return (
    <div className="flex flex-col w-full max-w-[1000px] mx-auto px-4 md:px-6 h-[calc(100vh-100px)] overflow-hidden">
      <Tabs defaultValue="media" className="w-full flex flex-col h-full">
        <TabsList className="w-full flex justify-start bg-transparent border-b border-border/50 rounded-none h-auto p-0 space-x-6">
          <TabsTrigger 
            value="media" 
            className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 pb-3 pt-2 px-1 text-[15px]"
          >
            Media
          </TabsTrigger>
          <TabsTrigger 
            value="docs" 
            className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 pb-3 pt-2 px-1 text-[15px]"
          >
            Docs
          </TabsTrigger>
          <TabsTrigger 
            value="links" 
            className="rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 pb-3 pt-2 px-1 text-[15px]"
          >
            Links
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto pt-6 pb-20 custom-scrollbar">
          <TabsContent value="media" className="mt-0 h-full">
            {media.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="font-semibold text-lg text-foreground mb-1">No media</p>
                <p className="text-muted-foreground text-sm mb-4">Media shared in this chat will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {media.map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => setViewingMedia(item)}
                    className="aspect-square relative group overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm cursor-pointer"
                  >
                    {item.file_type.startsWith('video/') ? (
                      <video src={item.file_url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                      <p className="text-white text-xs truncate font-medium">{item.sender_name}</p>
                      <p className="text-white/70 text-[10px]">{new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="docs" className="mt-0 h-full">
            {docs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="font-semibold text-lg text-foreground mb-1">No documents</p>
                <p className="text-muted-foreground text-sm">Documents shared in this chat will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {docs.map((item: any) => (
                  <div key={item.id} className="flex flex-col bg-card shadow-sm rounded-xl overflow-hidden border border-border/40 p-4 hover:bg-accent/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm">
                        <span>~ {item.sender_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-muted/30 rounded-lg p-3 border border-border/40">
                      <div className="w-10 h-10 shrink-0 bg-red-500/10 text-red-500 flex items-center justify-center rounded-lg">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate text-foreground">{item.file_name}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.file_type.split('/').pop()?.toUpperCase()} • {(item.file_size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center mt-3 pt-3 border-t border-border/40">
                      <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 flex justify-center items-center text-sm font-semibold text-emerald-500 hover:text-emerald-400 transition-colors py-1">
                        Open
                      </a>
                      <a href={item.file_url} download className="flex-1 flex justify-center items-center text-sm font-semibold text-emerald-500 hover:text-emerald-400 transition-colors py-1 border-l border-border/40">
                        Save as...
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="links" className="mt-0 h-full">
            {links.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="font-semibold text-lg text-foreground mb-1">No links</p>
                <p className="text-muted-foreground text-sm">Links shared in this chat will appear here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {links.map((item: any) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-4 rounded-xl border border-border/40 bg-card shadow-sm hover:bg-accent/30 transition-colors group">
                    <div className="w-10 h-10 shrink-0 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-full mt-1">
                      <Link2 size={20} className="group-hover:-rotate-45 transition-transform" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-blue-500 hover:underline truncate">{item.url}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{item.sender_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <ExternalLink size={16} className="text-muted-foreground opacity-50 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {!!viewingMedia && (
        <FilePreviewModal 
          file={{ 
            src: viewingMedia.file_url, 
            name: viewingMedia.file_name || "Media File", 
            mimeType: viewingMedia.file_type 
          }} 
          onClose={() => setViewingMedia(null)} 
        />
      )}
    </div>
  );
}
