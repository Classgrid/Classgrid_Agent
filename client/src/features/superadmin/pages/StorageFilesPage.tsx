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

import React, { useState } from "react";
import {
  Folder, FileText, Image as ImageIcon, Video, FileArchive,
  File as FileIcon, UploadCloud, FolderPlus, MoreHorizontal, Download,
  Trash2, Edit2, Link as LinkIcon, Search, RefreshCw, Columns, X,
  ChevronRight, List, Check, Maximize
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

import { motion } from "framer-motion";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Badge } from "@/components/marketing_ui/badge";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "@/components/marketing_ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/marketing_ui/dialog";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { Spinner } from "@/components/marketing_ui/spinner";

import {
  useStorageObjects,
  useUploadFile,
  useCreateFolder,
  useDeleteObject,
  useDeleteObjects,
  useRenameObject,
  storageKeys
} from "../queries/useStorage";
import { storageApi } from "../services/storageApi";
import { useQueryClient } from "@tanstack/react-query";
import {
  getSocket,
  joinSuperadminStorage,
  leaveSuperadminStorage
} from "@/lib/socketClient";

import FilePreviewModal, { type FilePreviewSource } from "@/app/support/components/FilePreviewModal";

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type?: string) {
  const size = 18;
  const baseWrapper = "flex items-center justify-center rounded-lg p-2 shrink-0 border shadow-sm";
  if (!type) return <div className={`${baseWrapper} bg-muted/50 border-border/50 text-muted-foreground`}><FileIcon size={size} /></div>;
  if (type === "Folder") return <div className={`${baseWrapper} bg-yellow-500/10 border-yellow-500/20 text-yellow-600`}><Folder size={size} className="fill-yellow-500/20" /></div>;
  if (type.startsWith("image/")) return <div className={`${baseWrapper} bg-blue-500/10 border-blue-500/20 text-blue-600`}><ImageIcon size={size} /></div>;
  if (type.startsWith("video/")) return <div className={`${baseWrapper} bg-purple-500/10 border-purple-500/20 text-purple-600`}><Video size={size} /></div>;
  if (type.includes("pdf")) return <div className={`${baseWrapper} bg-red-500/10 border-red-500/20 text-red-600`}><FileText size={size} /></div>;
  if (type.includes("zip") || type.includes("tar") || type.includes("rar")) return <div className={`${baseWrapper} bg-orange-500/10 border-orange-500/20 text-orange-600`}><FileArchive size={size} /></div>;
  return <div className={`${baseWrapper} bg-muted/50 border-border/50 text-muted-foreground`}><FileIcon size={size} /></div>;
}

// Global upload state to share between the page and columns
export interface UploadingFile {
  id: string;
  file: File;
  name: string;
  prefix: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  xhr?: XMLHttpRequest; // For cancellation, although fetch/axios cancellation is usually AbortController. We'll just fake cancellation for UI purposes if needed, or implement it if API supports it.
}

const FilePreviewPane = ({ activeFile, onClose, onDelete, onRename, onFullScreen }: { activeFile: any, onClose: () => void, onDelete: () => void, onRename?: () => void, onFullScreen: () => void }) => {
  if (!activeFile) return null;
  return (
    <div className="w-[320px] sm:w-[350px] shrink-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-2">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm">File Preview</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-24 space-y-6">
        {/* Preview Box */}
        <div className="w-full aspect-square bg-muted/30 rounded-lg border border-border flex items-center justify-center overflow-hidden">
          {activeFile.type?.startsWith("image/") ? (
            <img src={activeFile.cdnUrl} alt={activeFile.name} className="max-w-full max-h-full object-contain" />
          ) : activeFile.type?.startsWith("video/") ? (
            <video src={activeFile.cdnUrl} controls className="max-w-full max-h-full" />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <FileIcon className="h-16 w-16 mb-2 opacity-50" />
              <span className="text-sm font-medium">No preview available</span>
            </div>
          )}
        </div>
        
        {/* Details */}
        <div className="space-y-4 border border-border/60 bg-muted/20 rounded-xl p-4">
          <div>
            <h3 className="font-semibold text-base break-all">{activeFile.name}</h3>
            <p className="text-sm text-muted-foreground">{activeFile.type || "Unknown"} - {formatBytes(activeFile.size || 0)}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Added on</p>
            <p className="text-sm">{activeFile.createdAt ? new Date(activeFile.createdAt).toLocaleString() : "-"}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Last modified</p>
            <p className="text-sm">{activeFile.lastModified ? new Date(activeFile.lastModified).toLocaleString() : "-"}</p>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" className="text-xs h-9 px-4" onClick={async () => {
              try {
                toast.loading("Starting download...", { id: "downloading" });
                const data = await storageApi.getPresignedUrl(activeFile.key);
                const link = document.createElement('a');
                link.href = data.downloadUrl;
                link.download = activeFile.name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Download complete", { id: "downloading" });
              } catch (e) {
                toast.dismiss("downloading");
                window.open(activeFile.cdnUrl, '_blank'); // fallback if blocked by CORS
              }
            }}>
              <Download className="mr-2 h-3.5 w-3.5" /> Download
            </Button>
            <Button variant="outline" className="text-xs h-9 px-4" onClick={onFullScreen}>
              <Maximize className="mr-2 h-3.5 w-3.5" /> Full Screen
            </Button>
            <Button variant="outline" className="text-xs h-9 px-4" onClick={() => {
              navigator.clipboard.writeText(activeFile.cdnUrl);
              toast.success("URL copied to clipboard");
            }}>
              <LinkIcon className="mr-2 h-3.5 w-3.5" /> Get URL
            </Button>
            {onRename && (
              <Button variant="outline" className="text-xs h-9 px-4" onClick={onRename}>
                <Edit2 className="mr-2 h-3.5 w-3.5" /> Rename
              </Button>
            )}
          </div>
          
          <div className="h-px bg-border w-full my-4" />
          
          <div>
            <Button variant="outline" className="text-xs h-9 px-4 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={onDelete}>
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete file
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StorageColumn = ({
  prefix,
  search,
  isLastColumn,
  selectedChildKey,
  selectedKeys,
  toggleSelection,
  onSelectFolder,
  onSelectFile,
  creatingFolderIn,
  setCreatingFolderIn,
  isCreatingFolderPending,
  handleCreateFolder,
  uploadingFiles,
  handleUploadClick,
  setFileToDelete,
  fileToRename,
  setFileToRename,
  newFileName,
  setNewFileName,
  handleRenameFile,
  isRenamingPending,
}: any) => {
  const { data, isLoading } = useStorageObjects(prefix, search);
  
  const items = [
    ...(data?.folders || []).map((folder: any) => ({
      isFolder: true,
      key: folder.prefix,
      name: folder.name,
      size: null,
      type: "Folder",
      lastModified: null,
      cdnUrl: ""
    })),
    ...(data?.files || []).map((file: any) => ({
      isFolder: false,
      key: file.key,
      name: file.name,
      size: file.size,
      type: file.contentType,
      lastModified: file.lastModified,
      createdAt: file.createdAt,
      cdnUrl: file.cdnUrl
    }))
  ];

  
  return (
    <div className="w-[280px] sm:w-[320px] shrink-0 border-r border-border flex flex-col bg-background/50 h-full group relative">
      {/* Sticky Column Header with Hover Actions */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 flex items-center justify-between border-b border-border shadow-sm">
        <span className="text-xs font-semibold text-muted-foreground truncate px-1">
          {prefix === "" ? "Root" : prefix.split('/').slice(-2, -1)[0]}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setCreatingFolderIn(prefix)} title="New Folder">
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground" onClick={() => handleUploadClick(prefix)} title="Upload Files">
            <UploadCloud className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {creatingFolderIn === prefix && (
          <div className="flex items-center gap-3 p-2 px-3 border-b border-border bg-primary/5">
            <div className="shrink-0 w-4 h-4" />
            <Folder size={16} className="text-yellow-500 fill-yellow-500/20 shrink-0" />
            <input 
              type="text"
              autoFocus
              defaultValue="Untitled folder"
              onFocus={(e) => e.target.select()}
              className="flex-1 bg-background border border-primary text-sm px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary h-6"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateFolder(e.currentTarget.value, prefix);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setCreatingFolderIn(null);
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== "Untitled folder") {
                  handleCreateFolder(e.target.value, prefix);
                } else {
                  setCreatingFolderIn(null);
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
              disabled={isCreatingFolderPending}
              onClick={() => {
                const inputElement = document.getElementById("inline-create-folder-input") as HTMLInputElement;
                if (inputElement) {
                  handleCreateFolder(inputElement.value);
                }
              }}
            >
              <Check size={14} />
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="p-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md bg-muted/60" />
            ))}
          </div>
        ) : items.length === 0 && (creatingFolderIn !== prefix) && uploadingFiles.filter((u: any) => u.prefix === prefix).length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Folder className="h-10 w-10 opacity-20" />
            <span className="text-sm">This folder is empty.</span>
            <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => handleUploadClick(prefix)}>
              <UploadCloud className="mr-2 h-3.5 w-3.5" /> Upload files
            </Button>
          </div>
        ) : (
          <>
            {/* INLINE UPLOADING FILES */}
            {uploadingFiles.filter((u: any) => u.prefix === prefix).map((u: any) => {
              // If it's completed and already fetched into the list, don't show the inline duplicate
              if (u.status === 'completed' && items.some((item: any) => item.name === u.name)) return null;
              
              return (
                <div 
                  key={u.id}
                  className="flex items-center justify-between p-2 px-3 rounded-md text-sm opacity-70"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="shrink-0 w-4 h-4" /> {/* Empty checkbox space */}
                    {getFileIcon(u.file.type)}
                    <span className="truncate">{u.name}</span>
                  </div>
                  <div className="shrink-0 flex items-center justify-center">
                    <Spinner className="text-muted-foreground" />
                  </div>
                </div>
              );
            })}
            
            {/* EXISTING FILES */}
            {items.map((item: any) => {
              if (item.isUpDir) return null;
            
            const isSelected = selectedKeys.has(item.key);
            const isActive = selectedChildKey === item.key; // Is this the folder/file that is currently clicked and opened to the right?

            return (
              <div 
                key={item.key}
                onClick={() => {
                  if (fileToRename?.key === item.key) return; // Prevent navigation while renaming
                  item.isFolder ? onSelectFolder(item.key) : onSelectFile(item);
                }}
                className={`flex items-center justify-between p-2 px-3 rounded-md cursor-pointer text-sm group ${isActive ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted/50'}`}
              >
                <div className="flex items-center gap-3 overflow-hidden flex-1">
                  <div onClick={(e) => { e.stopPropagation(); toggleSelection(e, item.key); }} className="shrink-0">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40 group-hover:border-foreground/40'}`}>
                      {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </div>
                  
                  {getFileIcon(item.isFolder ? "Folder" : item.type)}
                  
                  {fileToRename?.key === item.key ? (
                    <div className="flex items-center flex-1 min-w-0 max-w-full" onClick={e => e.stopPropagation()}>
                      <Input
                        className="h-7 text-sm py-0 px-2 rounded-[4px] bg-background border-primary min-w-[50px] w-full"
                        autoFocus
                        value={newFileName}
                        onChange={e => setNewFileName(e.target.value)}
                        onBlur={() => setFileToRename(null)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRenameFile();
                          if (e.key === 'Escape') setFileToRename(null);
                        }}
                        disabled={isRenamingPending}
                      />
                      {!item.isFolder && item.name.lastIndexOf('.') > 0 && (
                        <span className="text-muted-foreground ml-0.5 shrink-0">
                          {item.name.substring(item.name.lastIndexOf('.'))}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="truncate selection:bg-transparent">{item.name}</span>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        const event = new CustomEvent('rename-file', { detail: { key: item.key, name: item.name } });
                        window.dispatchEvent(event);
                      }}>
                        <Edit2 className="mr-2 h-4 w-4" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        const event = new CustomEvent('move-file', { detail: { key: item.key, name: item.name } });
                        window.dispatchEvent(event);
                      }}>
                        <FolderPlus className="mr-2 h-4 w-4" /> Move
                      </DropdownMenuItem>
                      {!item.isFolder && (
                        <>
                          <DropdownMenuItem onClick={() => {
                            navigator.clipboard.writeText(item.cdnUrl);
                            toast.success("URL copied to clipboard");
                          }}>
                            <LinkIcon className="mr-2 h-4 w-4" /> Get URL
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            const event = new CustomEvent('download-file', { detail: { key: item.key, name: item.name, cdnUrl: item.cdnUrl } });
                            window.dispatchEvent(event);
                          }}>
                            <Download className="mr-2 h-4 w-4" /> Download
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                        const event = new CustomEvent('delete-file', { detail: item.key });
                        window.dispatchEvent(event);
                      }}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {item.isFolder && (
                  <ChevronRight size={14} className={`shrink-0 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                )}
              </div>
            );
          })}
          </>
        )}
      </div>
    </div>
  );
};

export function StorageFilesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'columns' | 'list'>('columns');
  const [activeFile, setActiveFile] = useState<any | null>(null);

  const [creatingFolderIn, setCreatingFolderIn] = useState<string | null>(null);
  const [activeUploadPrefix, setActiveUploadPrefix] = useState<string>("");

  const [fileToRename, setFileToRename] = useState<{ key: string, name: string } | null>(null);
  const [newFileName, setNewFileName] = useState("");
  
  const [fileToMove, setFileToMove] = useState<{ key: string, name: string } | null>(null);
  const [moveDestinationPrefix, setMoveDestinationPrefix] = useState("");
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  
  const [isNavigateModalOpen, setIsNavigateModalOpen] = useState(false);
  const [navigatePath, setNavigatePath] = useState("");
  
  // Custom upload state
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const hasActiveUploadsRef = React.useRef<boolean>(false);
  const batchUploadInProgressRef = React.useRef<boolean>(false);

  // Drag-to-scroll state for Miller Columns
  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollLeftRef = React.useRef(0);

  // Miller Columns state
  const [openFolders, setOpenFolders] = useState<string[]>([""]); // "" is root
  
  // Full-screen file preview modal
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);

  // The effective prefix is the last opened folder
  const currentPrefix = openFolders[openFolders.length - 1];

  const queryClient = useQueryClient();
  const { data, isLoading, isFetching, refetch } = useStorageObjects(currentPrefix, debouncedSearch);
  const createFolderMutation = useCreateFolder();
  const deleteObjectMutation = useDeleteObject();
  const deleteObjectsMutation = useDeleteObjects();
  const renameObjectMutation = useRenameObject();
  const uploadFileMutation = useUploadFile();

  // Auto-scroll to the rightmost edge whenever a folder or file is opened
  React.useEffect(() => {
    // Request browser notification permission for background uploads
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (viewMode === 'columns' && scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            left: scrollContainerRef.current.scrollWidth,
            behavior: 'smooth'
          });
        }
      }, 50);
    }
  }, [openFolders.length, activeFile, viewMode]);

  React.useEffect(() => {
    hasActiveUploadsRef.current = uploadingFiles.some(file => file.status === 'uploading');
  }, [uploadingFiles]);

  React.useEffect(() => {
    const socket = getSocket();

    joinSuperadminStorage();

    const handleStorageUpdated = () => {
      if (renameObjectMutation.isPending || hasActiveUploadsRef.current || batchUploadInProgressRef.current) return;

      queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
      queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
    };

    socket?.on("storage_updated", handleStorageUpdated);

    return () => {
      socket?.off("storage_updated", handleStorageUpdated);
      leaveSuperadminStorage();
    };
  }, [queryClient, renameObjectMutation.isPending]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);

    const handleRenameFileEvent = (e: any) => {
      const { key, name } = e.detail;
      const isFolder = key.endsWith('/');
      const lastDotIndex = !isFolder && name.lastIndexOf('.') > 0 ? name.lastIndexOf('.') : -1;
      const baseName = lastDotIndex > 0 ? name.substring(0, lastDotIndex) : name;
      setFileToRename({ key, name });
      setNewFileName(baseName);
    };

    const handleMoveFileEvent = (e: any) => {
      setFileToMove({ key: e.detail.key, name: e.detail.name });
      setMoveDestinationPrefix(e.detail.key.substring(0, e.detail.key.lastIndexOf('/') + 1));
    };

    const handleDownloadFileEvent = async (e: any) => {
      const { key, name, cdnUrl } = e.detail;
      try {
        toast.loading("Starting download...", { id: "downloading" });
        const data = await storageApi.getPresignedUrl(key);
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Download complete", { id: "downloading" });
      } catch (error) {
        toast.dismiss("downloading");
        if (cdnUrl) window.open(cdnUrl, '_blank');
      }
    };

    const handleDeleteFileEvent = (e: any) => {
      setFileToDelete(e.detail);
    };

    window.addEventListener('rename-file', handleRenameFileEvent);
    window.addEventListener('move-file', handleMoveFileEvent);
    window.addEventListener('download-file', handleDownloadFileEvent);
    window.addEventListener('delete-file', handleDeleteFileEvent);

    return () => {
      clearTimeout(handler);
      window.removeEventListener('rename-file', handleRenameFileEvent);
      window.removeEventListener('move-file', handleMoveFileEvent);
      window.removeEventListener('download-file', handleDownloadFileEvent);
      window.removeEventListener('delete-file', handleDeleteFileEvent);
    };
  }, [searchInput]);

  const handleUploadClick = (prefix: string) => {
    setActiveUploadPrefix(prefix);
    fileInputRef.current?.click();
  };

    const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const files = Array.from(e.target.files);

      if (files.length > 25000) {
        toast.error("You can only upload a maximum of 25,000 files at once.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      const MAX_FILE_SIZE = 500 * 1024 * 1024 * 1024; // 500 GB
      const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE).map(f => {
        // Sanitize filename to replace spaces with underscores to avoid %20 in URLs
        const sanitizedName = f.name.replace(/\s+/g, '_');
        return sanitizedName === f.name ? f : new File([f], sanitizedName, { type: f.type, lastModified: f.lastModified });
      });
      const invalidFiles = files.filter(f => f.size > MAX_FILE_SIZE);

      if (invalidFiles.length > 0) {
        toast.error(`Skipped ${invalidFiles.length} file(s) that exceed the 500 GB limit.`);
      }

      if (validFiles.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      // Flag entire batch as in-progress to prevent socket events from wiping cache
      hasActiveUploadsRef.current = true;
      batchUploadInProgressRef.current = true;
      
      const newUploads = validFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        prefix: activeUploadPrefix,
        progress: 0,
        status: 'uploading' as const
      }));

      setUploadingFiles(prev => [...prev, ...newUploads]);
      
        let successCount = 0;
        let errorCount = 0;
        
        const MAX_RETRIES = 3;

        const uploadWithRetry = async (upload: typeof newUploads[0], attempt = 0): Promise<any> => {
          try {
            return await storageApi.uploadFile(upload.file, upload.prefix, (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, progress: Math.max(u.progress, percentCompleted) } : u));
              }
            });
          } catch (error) {
            if (attempt < MAX_RETRIES) {
              // We do NOT reset progress to 0 here to ensure the overall progress bar never moves backwards.
              // Exponential backoff: 1s, 2s, 4s
              const delay = Math.pow(2, attempt) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              return uploadWithRetry(upload, attempt + 1);
            }
            throw error;
          }
        };

        const processUpload = async (upload: typeof newUploads[0]) => {
          try {
            const result = await uploadWithRetry(upload);
            
            successCount++;
            
            // Instantly inject THIS file into the cache so it shows up without waiting for other files!
            const newFile = {
              key: result.key || `${upload.prefix}${upload.name}`,
              name: upload.name,
              size: result.size || upload.file.size,
              contentType: result.contentType || upload.file.type,
              lastModified: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              cdnUrl: result.cdnUrl || ""
            };
            
            const updateCache = (oldData: any) => {
              if (!oldData) return oldData;
              const existingKeys = new Set(oldData.files.map((f: any) => f.key));
              if (existingKeys.has(newFile.key)) {
                return {
                  ...oldData,
                  files: oldData.files.map((f: any) => f.key === newFile.key ? newFile : f)
                };
              }
              return {
                ...oldData,
                files: [...oldData.files, newFile].sort((a: any, b: any) => a.name.localeCompare(b.name))
              };
            };

            // Always update the cache for the current view (whether search is empty or not)
            queryClient.setQueryData(storageKeys.list(upload.prefix, debouncedSearch), updateCache);

            // Set to completed so it can be filtered out from inline display
            setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, progress: 100, status: 'completed' } : u));
            
            // Note: We DO NOT remove it from uploadingFiles here, otherwise the overall progress percentage will jump backwards!

          } catch (error) {
            errorCount++;
            setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'error' } : u));

          }
        };

        // Upload files in batches of 5 concurrently to drastically improve speed for bulk uploads
        const uploadInBatches = async () => {
          const BATCH_SIZE = 5;
          for (let i = 0; i < newUploads.length; i += BATCH_SIZE) {
            const batch = newUploads.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(upload => processUpload(upload)));
          }
        };

        uploadInBatches().then(() => {
          // Mark batch as complete so socket events can refetch again
          batchUploadInProgressRef.current = false;
          hasActiveUploadsRef.current = false;

          // Delay global invalidation to allow S3 eventual consistency to settle, preventing disappearing files
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
            queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
          }, 3000);
        
        // Single unified toast notification
        if (successCount > 0 && errorCount === 0) {
          toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}.`);
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(`Uploaded ${successCount} file(s), but ${errorCount} failed.`);
        } else if (errorCount > 0) {
          toast.error(`Failed to upload ${errorCount} file(s).`);
        }

        // Send browser push notification if supported and granted
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Classgrid Storage Upload', {
              body: successCount > 0 && errorCount === 0 
                ? `Successfully uploaded ${successCount} files.` 
                : (successCount > 0 ? `Uploaded ${successCount} files, ${errorCount} failed.` : `Failed to upload ${errorCount} files.`),
              icon: '/favicon.ico'
            });
          } catch (e) {
            // Some browsers require service workers for notifications, fallback gracefully
            console.error("Failed to send push notification", e);
          }
        }

        // Clear the upload toast after 3 seconds
        setTimeout(() => {
          setUploadingFiles([]);
        }, 3000);
      });
      
      // Clear input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };

  const handleNavigateToFolder = () => {
    if (!navigatePath) {
      setIsNavigateModalOpen(false);
      return;
    }
    
    // Convert a path like "assignments/math" into openFolders ["", "assignments/", "assignments/math/"]
    const parts = navigatePath.split("/").filter(Boolean);
    const newOpenFolders = [""];
    let current = "";
    
    parts.forEach(part => {
      current += part + "/";
      newOpenFolders.push(current);
    });
    
    setOpenFolders(newOpenFolders);
    setIsNavigateModalOpen(false);
    setNavigatePath("");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - scrollContainerRef.current.offsetLeft;
    scrollLeftRef.current = scrollContainerRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDraggingRef.current = false;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 1.5; // Scroll speed multiplier
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleCreateFolder = (folderName: string, targetPrefix: string) => {
    if (createFolderMutation.isPending) return;
    const newFolderName = folderName.trim().replace(/\s+/g, '_');
    if (!newFolderName) {
      setCreatingFolderIn(null);
      return;
    }

    const newPrefix = `${targetPrefix}${newFolderName}/`;

    // Instantly hide the input
    setCreatingFolderIn(null);

    // Always update the cache for the current view (whether search is empty or not)
    queryClient.setQueryData(storageKeys.list(targetPrefix, debouncedSearch), (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        folders: [
          ...oldData.folders,
          { name: newFolderName, prefix: newPrefix }
        ].sort((a: any, b: any) => a.name.localeCompare(b.name))
      };
    });

    createFolderMutation.mutate({ folderName: newFolderName, prefix: targetPrefix }, {
      onSuccess: () => {
        refetch();
        toast.success("Folder created");
      },
      onError: () => {
        refetch();
        toast.error("Failed to create folder");
      }
    });
  };

  const handleRenameSelection = () => {
    if (selectedKeys.size === 1) {
      const key = Array.from(selectedKeys)[0];
      const file = data?.files?.find(f => f.key === key);
      const folder = data?.folders?.find((f: any) => f.prefix === key);
      if (file) {
        const lastDotIndex = file.name.lastIndexOf('.') > 0 ? file.name.lastIndexOf('.') : -1;
        const baseName = lastDotIndex > 0 ? file.name.substring(0, lastDotIndex) : file.name;
        setFileToRename({ key: file.key, name: file.name });
        setNewFileName(baseName);
      } else if (folder) {
        setFileToRename({ key: folder.prefix, name: folder.name });
        setNewFileName(folder.name);
      }
    } else if (selectedKeys.size === 0 && activeFile) {
      // If no checkbox selected but a file is open in preview, rename that
      const lastDotIndex = activeFile.name.lastIndexOf('.') > 0 ? activeFile.name.lastIndexOf('.') : -1;
      const baseName = lastDotIndex > 0 ? activeFile.name.substring(0, lastDotIndex) : activeFile.name;
      setFileToRename({ key: activeFile.key, name: activeFile.name });
      setNewFileName(baseName);
    }
  };

  const handleRenameFile = (overrideName?: string) => {
    if (renameObjectMutation.isPending) return;
    const nameToUse = overrideName !== undefined ? overrideName : newFileName;
    
    if (!fileToRename || !nameToUse.trim()) {
      if (!nameToUse.trim()) setFileToRename(null);
      return;
    }

    const isFolder = fileToRename.key.endsWith('/');
    const lastDotIndex = !isFolder && fileToRename.name.lastIndexOf('.') > 0 ? fileToRename.name.lastIndexOf('.') : -1;
    const extension = lastDotIndex > 0 ? fileToRename.name.substring(lastDotIndex) : "";
    const finalName = nameToUse.trim() + extension;

    if (fileToRename.name === finalName) {
      setFileToRename(null);
      return;
    }

    let newKey = "";
    let parentPrefix = "";
    
    if (isFolder) {
      // For folders, key ends with '/'. E.g. 'folderA/' or 'folderA/folderB/'
      const withoutTrailingSlash = fileToRename.key.slice(0, -1);
      const lastSlashIndex = withoutTrailingSlash.lastIndexOf('/');
      if (lastSlashIndex >= 0) {
        parentPrefix = withoutTrailingSlash.substring(0, lastSlashIndex + 1);
      } else {
        parentPrefix = ""; // Root level folder
      }
      newKey = parentPrefix + finalName + '/';
    } else {
      const lastSlashIndex = fileToRename.key.lastIndexOf('/');
      if (lastSlashIndex >= 0) {
        parentPrefix = fileToRename.key.substring(0, lastSlashIndex + 1);
      } else {
        parentPrefix = "";
      }
      newKey = parentPrefix + finalName;
    }

    const nowIso = new Date().toISOString();

    const oldFileToRename = fileToRename;

    const generateNewCdnUrl = (oldUrl: string | undefined | null, newKey: string) => {
      if (!oldUrl) return oldUrl;
      try {
        const urlObj = new URL(oldUrl);
        const encodedNewKey = newKey.split('/').map(segment => encodeURIComponent(segment)).join('/');
        return `${urlObj.protocol}//${urlObj.host}/${encodedNewKey}`;
      } catch {
        return oldUrl;
      }
    };

    renameObjectMutation.mutate({ sourceKey: oldFileToRename.key, destinationKey: newKey }, {
      onMutate: async () => {
        // Cancel any outgoing refetches so they don't overwrite our optimistic update
        await queryClient.cancelQueries({ queryKey: storageKeys.list(parentPrefix) });
        if (debouncedSearch) {
          await queryClient.cancelQueries({ queryKey: storageKeys.list(parentPrefix, debouncedSearch) });
        }

        // Snapshot the previous value
        const previousData = queryClient.getQueryData(storageKeys.list(parentPrefix));
        const previousSearchData = debouncedSearch ? queryClient.getQueryData(storageKeys.list(parentPrefix, debouncedSearch)) : undefined;

        // Optimistically update to the new value
        const updateRenamedItem = (oldData: any) => {
          if (!oldData) return oldData;

          if (isFolder) {
            return {
              ...oldData,
              folders: oldData.folders.map((folder: any) => (
                folder.prefix === oldFileToRename.key
                  ? { ...folder, prefix: newKey, name: finalName }
                  : folder
              )).sort((a: any, b: any) => a.name.localeCompare(b.name)),
            };
          }

          return {
            ...oldData,
            files: oldData.files.map((file: any) => (
              file.key === oldFileToRename.key
                ? {
                    ...file,
                    key: newKey,
                    name: finalName,
                    lastModified: nowIso
                  }
                : file
            )).sort((a: any, b: any) => a.name.localeCompare(b.name)),
          };
        };

        // Always update the cache for the exact view the user is currently seeing
        queryClient.setQueryData(storageKeys.list(parentPrefix, debouncedSearch), updateRenamedItem);

        // Keep the active file open in the preview pane
        if (activeFile?.key === oldFileToRename.key) {
          setActiveFile({
            ...activeFile,
            key: newKey,
            name: finalName,
            lastModified: nowIso,
            cdnUrl: generateNewCdnUrl(activeFile.cdnUrl, newKey)
          });
        }

        // Keep the file checked if it was checked
        if (selectedKeys.has(oldFileToRename.key)) {
          setSelectedKeys(prev => {
            const next = new Set(prev);
            next.delete(oldFileToRename.key);
            next.add(newKey);
            return next;
          });
        }

        // Clear the renaming UI immediately
        setFileToRename(null);
        setNewFileName("");

        return { previousData, previousSearchData };
      },
      onError: (err, newTodo, context) => {
        // Rollback on failure
        if (context?.previousData) {
          queryClient.setQueryData(storageKeys.list(parentPrefix, debouncedSearch), context.previousData);
        }
      },
      onSettled: () => {
        // Always refetch after error or success to ensure sync
        queryClient.invalidateQueries({ queryKey: storageKeys.list(parentPrefix, debouncedSearch) });
      }
    });
  };

  const handleMoveFile = () => {
    if (!fileToMove) return;
    
    let destPrefix = moveDestinationPrefix.trim();
    if (destPrefix && !destPrefix.endsWith('/')) {
      destPrefix += '/';
    }
    
    const newKey = destPrefix + fileToMove.name;
    
    if (fileToMove.key === newKey) {
      setFileToMove(null);
      return;
    }

    renameObjectMutation.mutate({ sourceKey: fileToMove.key, destinationKey: newKey }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
        setFileToMove(null);
        setMoveDestinationPrefix("");
        if (activeFile?.key === fileToMove.key) {
          setActiveFile(null); 
        }
        refetch();
        toast.success("Moved successfully");
      }
    });
  };

  const handleDeleteFile = () => {
    if (!fileToDelete) return;
    deleteObjectMutation.mutate(fileToDelete, {
      onSuccess: () => {
        setFileToDelete(null);
        const newSet = new Set(selectedKeys);
        newSet.delete(fileToDelete);
        setSelectedKeys(newSet);
        if (activeFile?.key === fileToDelete) setActiveFile(null);
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedKeys.size === 0) return;
    const keysArray = Array.from(selectedKeys);
    deleteObjectsMutation.mutate(keysArray, {
      onSuccess: () => {
        setIsBulkDeleteModalOpen(false);
        setSelectedKeys(new Set());
        setActiveFile(null);
      }
    });
  };

  const copyToClipboard = (url: string, type: string = "URL") => {
    navigator.clipboard.writeText(url);
    toast.success(`${type} copied to clipboard`);
  };

  const toggleSelection = (e: React.MouseEvent, key: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedKeys);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setSelectedKeys(newSet);
  };

  const items = [
    ...(data?.folders || []).map(folder => ({
      isFolder: true,
      key: folder.prefix,
      name: folder.name,
      size: null,
      type: "Folder",
    })),
    ...(data?.files || []).map(file => ({
      isFolder: false,
      key: file.key,
      name: file.name,
      size: file.size,
      type: file.contentType,
      lastModified: file.lastModified,
      createdAt: file.createdAt,
      cdnUrl: file.cdnUrl
    }))
  ];

    const renderBreadcrumbs = () => {
      const parts = currentPrefix.split("/").filter(Boolean);
      let cumulative = "";
      
      return (
        <div className="flex items-center gap-1.5 text-sm font-medium flex-wrap max-w-full overflow-hidden shrink-0">
          <span 
            className={`${!currentPrefix ? "text-foreground" : "text-muted-foreground hover:text-foreground cursor-pointer transition-colors"}`}
            onClick={() => setOpenFolders([""])}
          >
            Root
          </span>
          {parts.map((part, idx) => {
            cumulative += part + "/";
            const isLast = idx === parts.length - 1;
            
            const newOpenFolders = [""];
            let temp = "";
            for (let i = 0; i <= idx; i++) {
              temp += parts[i] + "/";
              newOpenFolders.push(temp);
            }
            
            return (
              <React.Fragment key={cumulative}>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                <span
                  className={`truncate max-w-[150px] ${isLast ? "text-foreground" : "text-muted-foreground hover:text-foreground cursor-pointer transition-colors"}`}
                  onClick={isLast ? undefined : () => setOpenFolders(newOpenFolders)}
                  title={part}
                >
                  {part}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      );
    };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 w-full border-t border-border bg-card">
        <div className="flex items-center justify-between p-3 pl-14 border-b border-border bg-muted/20">
          
          <div className="flex items-center flex-1 mr-4 overflow-hidden">
            {renderBreadcrumbs()}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="relative w-[220px] mr-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 h-9 bg-background border-border shadow-sm text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 bg-background shadow-sm"
              disabled={selectedKeys.size !== 1 && !activeFile}
              onClick={handleRenameSelection}
              title="Rename selected file"
            >
              <Edit2 size={16} />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 bg-background shadow-sm"
                  title="View options"
                >
                  {viewMode === 'columns' ? <Columns size={16} /> : <List size={16} />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 shadow-xl">
                <DropdownMenuItem onClick={() => setViewMode('columns')} className="justify-between">
                  As columns
                  {viewMode === 'columns' && <Check size={16} className="text-emerald-500" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('list')} className="justify-between">
                  As list
                  {viewMode === 'list' && <Check size={16} className="text-emerald-500" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-5 w-px bg-border mx-1.5"></div>

            <Button
              variant="outline"
              className="h-9 bg-background shadow-sm text-sm font-medium"
              onClick={() => setCreatingFolderIn(currentPrefix)}
            >
              <FolderPlus className="mr-2 h-4 w-4" /> Create folder
            </Button>
            <Button
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-0 text-sm font-medium ml-0.5"
              onClick={() => handleUploadClick(currentPrefix)}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload files
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              multiple 
              onChange={handleFilesSelected}
            />
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          className={`flex flex-1 min-h-0 bg-background relative ${
            viewMode === 'columns' ? 'overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing pb-2' : 'overflow-hidden'
          }`}
          onMouseDown={viewMode === 'columns' ? handleMouseDown : undefined}
          onMouseLeave={viewMode === 'columns' ? handleMouseLeave : undefined}
          onMouseUp={viewMode === 'columns' ? handleMouseUp : undefined}
          onMouseMove={viewMode === 'columns' ? handleMouseMove : undefined}
        >

          {viewMode === 'columns' ? (
            <>
              {openFolders.map((prefix, i) => (
                <StorageColumn
                  key={prefix}
                  prefix={prefix}
                  search={i === openFolders.length - 1 ? debouncedSearch : ""}
                  isLastColumn={i === openFolders.length - 1}
                  selectedChildKey={openFolders[i + 1]}
                  selectedKeys={selectedKeys}
                  toggleSelection={toggleSelection}
                  onSelectFolder={(key: string) => {
                    setOpenFolders([...openFolders.slice(0, i + 1), key]);
                    setActiveFile(null);
                  }}
                  onSelectFile={(file: any) => {
                    setOpenFolders(openFolders.slice(0, i + 1));
                    setActiveFile(file);
                  }}
                  creatingFolderIn={creatingFolderIn}
                  setCreatingFolderIn={setCreatingFolderIn}
                  isCreatingFolderPending={createFolderMutation.isPending}
                  handleCreateFolder={handleCreateFolder}
                  uploadingFiles={uploadingFiles}
                  handleUploadClick={handleUploadClick}
                  setFileToDelete={setFileToDelete}
                  fileToRename={fileToRename}
                  setFileToRename={setFileToRename}
                  newFileName={newFileName}
                  setNewFileName={setNewFileName}
                  handleRenameFile={handleRenameFile}
                  isRenamingPending={renameObjectMutation.isPending}
                />
              ))}

              {/* RIGHT SIDE PREVIEW PANE OR EMPTY SPACE */}
              <div className="flex-1 bg-background flex relative">
                <FilePreviewPane 
                  activeFile={activeFile} 
                  onClose={() => setActiveFile(null)} 
                  onDelete={() => setFileToDelete(activeFile.key)}
                  onRename={() => {
                    setFileToRename(activeFile);
                    setNewFileName(activeFile.name);
                  }}
                  onFullScreen={() => setPreviewFile({ name: activeFile.name, src: activeFile.cdnUrl, mimeType: activeFile.type })}
                />
              </div>
            </>
          ) : (
            <div className="w-full h-full min-h-0 overflow-y-auto p-4 pb-24 bg-card custom-scrollbar">
              <DataTable
                columns={[
                  {
                    key: "select",
                    header: "",
                    width: "w-[5%] min-w-[40px]",
                    render: (_: any, row: any) => {
                      if (row.isUpDir) return null;
                      return (
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border bg-background"
                          checked={selectedKeys.has(row.key)}
                          onChange={(e) => toggleSelection(e as any, row.key)}
                        />
                      );
                    }
                  },
                  {
                    key: "name",
                    header: "Name",
                    accent: true,
                    width: "w-[45%]",
                    render: (_: any, row: any) => {
                      const isRenaming = fileToRename?.key === row.key;
                      return (
                        <div
                          className={`flex items-center gap-3 ${row.isFolder || row.isUpDir ? "cursor-pointer hover:underline font-medium" : ""} w-full`}
                          onClick={() => {
                            if (isRenaming) return;
                            if (row.isUpDir) {
                              // legacy list view up dir
                            } else if (row.isFolder) {
                              setOpenFolders([row.key]);
                            } else {
                              setActiveFile(row);
                            }
                          }}
                        >
                          {getFileIcon(row.type)}
                          {isRenaming ? (
                            <div className="flex items-center flex-1 min-w-0 max-w-[300px]" onClick={e => e.stopPropagation()}>
                              <Input
                                className="h-7 text-sm py-0 px-2 rounded-[4px] bg-background border-primary w-full"
                                autoFocus
                                value={newFileName}
                                onChange={e => setNewFileName(e.target.value)}
                                onBlur={() => setFileToRename(null)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleRenameFile();
                                  if (e.key === 'Escape') setFileToRename(null);
                                }}
                                disabled={renameObjectMutation.isPending}
                              />
                              {!row.isFolder && row.name.lastIndexOf('.') > 0 && (
                                <span className="text-muted-foreground ml-0.5 shrink-0">
                                  {row.name.substring(row.name.lastIndexOf('.'))}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="break-all flex-1" title={row.name}>{row.name}</span>
                          )}
                        </div>
                      );
                    }
                  },
                  {
                    key: "size",
                    header: "Size",
                    width: "w-[10%]",
                    render: (size: number) => size ? formatBytes(size) : "-"
                  },
                  {
                    key: "type",
                    header: "Type",
                    width: "w-[15%]",
                    render: (type: string, row: any) => {
                      if (row.isUpDir) return null;
                      if (type === "Folder") return <Badge variant="neutral" className="max-w-full">Dir</Badge>;
                      const fileExt = type?.split("/").pop()?.toUpperCase() || "FILE";
                      const content = <span className="block truncate max-w-full" title={fileExt}>{fileExt}</span>;
                      if (type?.startsWith("image/")) return <Badge variant="info" className="max-w-full">{content}</Badge>;
                      if (type?.startsWith("video/")) return <Badge variant="secondary" className="max-w-full">{content}</Badge>;
                      return <Badge variant="outline" className="max-w-full">{content}</Badge>;
                    }
                  },
                  {
                    key: "lastModified",
                    header: "Last Modified",
                    width: "w-[15%]",
                    render: (date: string) => date ? format(new Date(date), "MMM d, yyyy h:mm a") : "-"
                  },
                  {
                    key: "actions",
                    header: "",
                    width: "w-[10%] text-right pr-6",
                    render: (_: any, row: any) => {
                      if (row.isUpDir) return null;
                      return (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground mr-2 float-right">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => {
                                const event = new CustomEvent('rename-file', { detail: { key: row.key, name: row.name } });
                                window.dispatchEvent(event);
                              }}>
                                <Edit2 className="mr-2 h-4 w-4" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const event = new CustomEvent('move-file', { detail: { key: row.key, name: row.name } });
                                window.dispatchEvent(event);
                              }}>
                                <FolderPlus className="mr-2 h-4 w-4" /> Move
                              </DropdownMenuItem>
                              {!row.isFolder && (
                                <>
                                  <DropdownMenuItem onClick={() => copyToClipboard(row.cdnUrl, "URL")}>
                                    <LinkIcon className="mr-2 h-4 w-4" /> Get URL
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    const event = new CustomEvent('download-file', { detail: { key: row.key, name: row.name, cdnUrl: row.cdnUrl } });
                                    window.dispatchEvent(event);
                                  }}>
                                    <Download className="mr-2 h-4 w-4" /> Download
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => {
                                const event = new CustomEvent('delete-file', { detail: row.key });
                                window.dispatchEvent(event);
                              }}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      );
                    }
                  }
                ]}
                rows={items}
                isLoading={isLoading}
                emptyMessage="This folder is empty."
              />
            </div>
          )}
            
            {/* Sticky Bulk Action Bar for both views */}
            {selectedKeys.size > 0 && (
              <div className="absolute z-50 bottom-6 left-1/2 -translate-x-1/2 bg-card border border-border shadow-lg rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
                <span className="text-sm font-medium">
                  <span className="text-primary mr-1">{selectedKeys.size}</span> items selected
                </span>
                <div className="h-4 w-px bg-border"></div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedKeys(new Set())}>Cancel</Button>
                <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteModalOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </Button>
              </div>
            )}

          </div>
        </div>

        {/* Modals */}
        <Dialog open={isNavigateModalOpen} onOpenChange={setIsNavigateModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Navigate to folder</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Path</label>
                <Input
                  placeholder="e.g. assignments/math"
                  value={navigatePath}
                  onChange={(e) => setNavigatePath(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleNavigateToFolder();
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Enter a folder path within this bucket.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNavigateModalOpen(false)}>Cancel</Button>
              <Button onClick={handleNavigateToFolder} className="bg-emerald-600 hover:bg-emerald-700 text-white">Navigate</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      
      {/* Rename Dialog Removed - Using Inline Editing */}

      {/* Move File Modal */}
      <Dialog open={!!fileToMove} onOpenChange={(open) => !open && setFileToMove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move {fileToMove?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Destination Folder Path</p>
              <Input
                value={moveDestinationPrefix}
                onChange={(e) => setMoveDestinationPrefix(e.target.value)}
                placeholder="e.g., folder1/folder2/"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">Current path: {fileToMove?.key.substring(0, fileToMove?.key.lastIndexOf('/') + 1) || "Root"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToMove(null)}>Cancel</Button>
            <Button onClick={handleMoveFile} disabled={renameObjectMutation.isPending}>
              {renameObjectMutation.isPending && <Spinner className="mr-2" />}
              {renameObjectMutation.isPending ? "Moving..." : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DangerConfirmDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title="Delete File"
        description="Are you sure you want to delete this file? This action cannot be undone."
        warningMessage="This file will be permanently deleted from the servers."
        actionLabel="Delete"
        onConfirm={handleDeleteFile}
        isLoading={deleteObjectMutation.isPending}
      />

      <DangerConfirmDialog
        open={isBulkDeleteModalOpen}
        onOpenChange={setIsBulkDeleteModalOpen}
        title={`Delete ${selectedKeys.size} Files`}
        description={`Are you sure you want to permanently delete these ${selectedKeys.size} items? This action cannot be undone.`}
        warningMessage="These files will be permanently deleted from the servers."
        actionLabel="Bulk Delete"
        onConfirm={handleBulkDelete}
        isLoading={deleteObjectsMutation.isPending}
      />

      {/* Full-Screen File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Floating Upload Progress Toast */}
      {uploadingFiles.length > 0 && (
        <motion.div 
          drag
          dragMomentum={false}
          className="absolute top-4 right-4 z-50 w-[380px] bg-card border border-border shadow-xl rounded-md overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <div className="p-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3 text-sm font-medium">
              <Spinner className="text-muted-foreground" />
              Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? 's' : ''}...
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              {Math.round(uploadingFiles.reduce((acc, f) => acc + f.progress, 0) / uploadingFiles.length)}%
            </div>
          </div>
          
          <div className="h-1 bg-muted w-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 transition-all duration-300" 
              style={{ width: `${uploadingFiles.reduce((acc, f) => acc + f.progress, 0) / uploadingFiles.length}%` }} 
            />
          </div>
          
          <div className="p-3 bg-muted/20 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">You can drag this around and work in background</span>
            <Button variant="outline" size="sm" className="h-7 text-xs bg-background">Cancel</Button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
