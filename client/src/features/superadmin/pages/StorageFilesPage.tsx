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
import { useSearchParams } from "react-router-dom";
import {
  Folder, FileText, Image as ImageIcon, Video, FileArchive,
  File as FileIcon, UploadCloud, FolderPlus, FolderInput, FolderOpen, MoreHorizontal, Download,
  Trash2, Edit2, Link as LinkIcon, Search, Columns, X,
  ChevronRight, List, Check, Maximize
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

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
} from "@/components/marketing_ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/marketing_ui/dialog";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";

import {
  useStorageObjects,
  useCreateFolder,
  useDeleteObject,
  useDeleteObjects,
  useRenameObject,
  storageKeys
} from "../queries/useStorage";
import { storageApi, type ListObjectsResponse } from "../services/storageApi";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  getSocket,
  joinSuperadminStorage,
  leaveSuperadminStorage
} from "@/lib/socketClient";
import {
  storageMenuCard,
  storageMenuDangerItem,
  storageMenuIcon,
  storageMenuItem,
  storageMenuSeparator,
} from "../components/storage/storageMenuStyles";

import FilePreviewModal, { type FilePreviewSource } from "@/app/support/components/FilePreviewModal";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
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

/** One row of a folder listing (a folder or a file). */
interface StorageItem {
  id: string;
  isFolder: boolean;
  key: string;
  name: string;
  size: number | null;
  type: string;
  lastModified?: string | null;
  createdAt?: string | null;
  cdnUrl: string;
}

function toStorageItems(data?: ListObjectsResponse): StorageItem[] {
  return [
    ...(data?.folders || []).map((folder) => ({
      id: folder.prefix,
      isFolder: true,
      key: folder.prefix,
      name: folder.name,
      size: null,
      type: "Folder",
      lastModified: null,
      createdAt: null,
      cdnUrl: "",
    })),
    ...(data?.files || []).map((file) => ({
      id: file.key,
      isFolder: false,
      key: file.key,
      name: file.name,
      size: file.size,
      type: file.contentType,
      lastModified: file.lastModified,
      createdAt: file.createdAt,
      cdnUrl: file.cdnUrl,
    })),
  ];
}

/** "a/b/" or "a/b" -> ["", "a/", "a/b/"], the open columns for that folder. */
function prefixToOpenFolders(prefix: string): string[] {
  const result = [""];
  let current = "";
  for (const part of prefix.split("/").filter(Boolean)) {
    current += part + "/";
    result.push(current);
  }
  return result;
}

/** The folder a key lives in: "a/b/c.png" -> "a/b/", "a/b/" -> "a/". */
function parentPrefixOf(key: string) {
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.substring(0, slash + 1) : "";
}

/** ".png" for "photo.png", "" for folders and names without an extension. */
function extensionOf(name: string, isFolder: boolean) {
  if (isFolder) return "";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.substring(dot) : "";
}

function baseNameOf(name: string, isFolder: boolean) {
  const extension = extensionOf(name, isFolder);
  return extension ? name.substring(0, name.length - extension.length) : name;
}

function encodeKey(key: string) {
  return key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

/** Points a CDN URL at a renamed key, keeping the CDN base (host and any base path) as it is. */
function swapCdnKey(cdnUrl: string, oldKey: string, newKey: string) {
  if (!cdnUrl) return cdnUrl;
  const encodedOld = encodeKey(oldKey);
  return cdnUrl.endsWith(encodedOld)
    ? cdnUrl.substring(0, cdnUrl.length - encodedOld.length) + encodeKey(newKey)
    : cdnUrl;
}

async function downloadObject(key: string, name: string, cdnUrl?: string) {
  const toastId = "storage-download";
  try {
    toast.loading("Preparing download", { id: toastId });
    const data = await storageApi.getPresignedUrl(key);
    const link = document.createElement("a");
    link.href = data.downloadUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Download started", { id: toastId });
  } catch {
    if (cdnUrl) {
      toast.dismiss(toastId);
      window.open(cdnUrl, "_blank", "noopener,noreferrer");
    } else {
      toast.error("Could not start the download", { id: toastId });
    }
  }
}

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("URL copied");
  } catch {
    toast.error("Could not copy the URL");
  }
}

// Upload state shown inline in the columns and in the floating progress box
export interface UploadingFile {
  id: string;
  file: File;
  name: string;
  prefix: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error' | 'cancelled';
}

interface ItemActions {
  onRename: (item: StorageItem) => void;
  onMove: (item: StorageItem) => void;
  onDelete: (key: string) => void;
}

/** The three-dot menu of a file or folder row (same look as the chat menu). */
function ItemActionsMenu({ item, actions, triggerClassName }: { item: StorageItem; actions: ItemActions; triggerClassName?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", triggerClassName)} aria-label={`Actions for ${item.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className={`w-[200px] ${storageMenuCard}`}>
        <DropdownMenuItem className={storageMenuItem} onClick={() => actions.onRename(item)}>
          <Edit2 className={storageMenuIcon} /> Rename
        </DropdownMenuItem>
        <DropdownMenuItem className={storageMenuItem} onClick={() => actions.onMove(item)}>
          <FolderInput className={storageMenuIcon} /> Move
        </DropdownMenuItem>
        {!item.isFolder && (
          <>
            <DropdownMenuItem className={storageMenuItem} onClick={() => void copyUrl(item.cdnUrl)}>
              <LinkIcon className={storageMenuIcon} /> Copy URL
            </DropdownMenuItem>
            <DropdownMenuItem className={storageMenuItem} onClick={() => void downloadObject(item.key, item.name, item.cdnUrl)}>
              <Download className={storageMenuIcon} /> Download
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator className={storageMenuSeparator} />
        <DropdownMenuItem className={`${storageMenuItem} ${storageMenuDangerItem}`} onClick={() => actions.onDelete(item.key)}>
          <Trash2 className="w-4 h-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const FilePreviewPane = ({ activeFile, onClose, onDelete, onRename, onFullScreen, className }: {
  activeFile: StorageItem | null;
  onClose: () => void;
  onDelete: () => void;
  onRename: () => void;
  onFullScreen: () => void;
  className?: string;
}) => {
  if (!activeFile) return null;
  return (
    <div className={cn("w-[320px] sm:w-[350px] shrink-0 border-l border-border bg-card flex flex-col h-full animate-in slide-in-from-right-2", className)}>
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-sm">File preview</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} aria-label="Close preview">
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
              <span className="text-sm font-medium">No preview for this file type</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-4 border border-border/60 bg-muted/20 rounded-xl p-4">
          <div>
            <h3 className="font-semibold text-base break-all">{activeFile.name}</h3>
            <p className="text-sm text-muted-foreground">{activeFile.type || "Unknown type"} - {formatBytes(activeFile.size || 0)}</p>
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
            <Button variant="outline" className="text-xs h-9 px-4" onClick={() => void downloadObject(activeFile.key, activeFile.name, activeFile.cdnUrl)}>
              <Download className="mr-2 h-3.5 w-3.5" /> Download
            </Button>
            <Button variant="outline" className="text-xs h-9 px-4" onClick={onFullScreen}>
              <Maximize className="mr-2 h-3.5 w-3.5" /> Full screen
            </Button>
            <Button variant="outline" className="text-xs h-9 px-4" onClick={() => void copyUrl(activeFile.cdnUrl)}>
              <LinkIcon className="mr-2 h-3.5 w-3.5" /> Copy URL
            </Button>
            <Button variant="outline" className="text-xs h-9 px-4" onClick={onRename}>
              <Edit2 className="mr-2 h-3.5 w-3.5" /> Rename
            </Button>
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

interface StorageColumnProps {
  prefix: string;
  search: string;
  selectedChildKey?: string;
  selectedKeys: Set<string>;
  toggleSelection: (e: React.MouseEvent, key: string) => void;
  onSelectFolder: (key: string) => void;
  onSelectFile: (file: StorageItem) => void;
  creatingFolderIn: string | null;
  setCreatingFolderIn: (prefix: string | null) => void;
  isCreatingFolderPending: boolean;
  handleCreateFolder: (folderName: string, targetPrefix: string) => void;
  uploadingFiles: UploadingFile[];
  handleUploadClick: (prefix: string) => void;
  fileToRename: { key: string; name: string } | null;
  setFileToRename: (value: { key: string; name: string } | null) => void;
  newFileName: string;
  setNewFileName: (value: string) => void;
  handleRenameFile: () => void;
  isRenamingPending: boolean;
  actions: ItemActions;
}

const StorageColumn = ({
  prefix,
  search,
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
  fileToRename,
  setFileToRename,
  newFileName,
  setNewFileName,
  handleRenameFile,
  isRenamingPending,
  actions,
}: StorageColumnProps) => {
  const { data, isLoading } = useStorageObjects(prefix, search);
  const folderInputRef = React.useRef<HTMLInputElement>(null);
  const items = toStorageItems(data);
  const columnUploads = uploadingFiles.filter((u) => u.prefix === prefix);

  return (
    <div className="group/col w-[280px] sm:w-[320px] shrink-0 border-r border-border flex flex-col bg-background/50 h-full relative">
      {/* Sticky column header with the folder's quick actions */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 flex items-center justify-between border-b border-border shadow-sm">
        <span className="text-xs font-semibold text-muted-foreground truncate px-1">
          {prefix === "" ? "Root" : prefix.split('/').slice(-2, -1)[0]}
        </span>
        <div className="flex items-center gap-1 md:opacity-0 md:group-hover/col:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground" onClick={() => setCreatingFolderIn(prefix)} title="New folder" aria-label="New folder">
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md text-muted-foreground hover:text-foreground" onClick={() => handleUploadClick(prefix)} title="Upload files" aria-label="Upload files">
            <UploadCloud className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {creatingFolderIn === prefix && (
          <div className="flex items-center gap-3 p-2 px-3 border-b border-border bg-muted/40">
            <div className="shrink-0 w-4 h-4" />
            <Folder size={16} className="text-yellow-500 fill-yellow-500/20 shrink-0" />
            <input
              ref={folderInputRef}
              type="text"
              autoFocus
              defaultValue="Untitled folder"
              aria-label="Folder name"
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 bg-background border border-border text-sm px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-foreground/30 h-6"
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
              className="h-6 w-6 shrink-0 text-foreground hover:bg-muted"
              disabled={isCreatingFolderPending}
              aria-label="Create folder"
              // Keep the focus in the name box, so its blur does not cancel the new folder before this click runs
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCreateFolder(folderInputRef.current?.value ?? "", prefix)}
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
        ) : items.length === 0 && creatingFolderIn !== prefix && columnUploads.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Folder className="h-10 w-10 opacity-20" />
            <span className="text-sm">{search ? "No files match this search." : "This folder is empty."}</span>
            {!search && (
              <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => handleUploadClick(prefix)}>
                <UploadCloud className="mr-2 h-3.5 w-3.5" /> Upload files
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Files still uploading into this folder */}
            {columnUploads.map((u) => {
              // Once it is in the listing, the inline copy is not needed
              if (u.status === 'completed' && items.some((item) => item.name === u.name)) return null;
              if (u.status === 'cancelled') return null;

              return (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2 px-3 rounded-md text-sm opacity-70"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="shrink-0 w-4 h-4" />
                    {getFileIcon(u.file.type)}
                    <span className="truncate">{u.name}</span>
                  </div>
                  <div className="shrink-0 flex items-center justify-center">
                    {u.status === 'error'
                      ? <span className="text-xs text-destructive">Failed</span>
                      : <Spinner className="text-muted-foreground" />}
                  </div>
                </div>
              );
            })}

            {items.map((item) => {
              const isSelected = selectedKeys.has(item.key);
              const isActive = selectedChildKey === item.key; // the folder or file opened to the right

              return (
                <div
                  key={item.key}
                  onClick={() => {
                    if (fileToRename?.key === item.key) return; // no navigation while renaming
                    if (item.isFolder) onSelectFolder(item.key);
                    else onSelectFile(item);
                  }}
                  className={cn(
                    "group/row flex items-center justify-between gap-1 p-2 px-3 rounded-md cursor-pointer text-sm",
                    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <div onClick={(e) => { e.stopPropagation(); toggleSelection(e, item.key); }} className="shrink-0">
                      <div className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 group-hover/row:border-foreground/40"
                      )}>
                        {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                      </div>
                    </div>

                    {getFileIcon(item.isFolder ? "Folder" : item.type)}

                    {fileToRename?.key === item.key ? (
                      <div className="flex items-center flex-1 min-w-0 max-w-full" onClick={e => e.stopPropagation()}>
                        <Input
                          className="h-7 text-sm py-0 px-2 rounded-[4px] bg-background border-border min-w-[50px] w-full"
                          autoFocus
                          value={newFileName}
                          aria-label="New name"
                          onChange={e => setNewFileName(e.target.value)}
                          onBlur={() => setFileToRename(null)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleRenameFile();
                            if (e.key === 'Escape') setFileToRename(null);
                          }}
                          disabled={isRenamingPending}
                        />
                        {extensionOf(item.name, item.isFolder) && (
                          <span className="text-muted-foreground ml-0.5 shrink-0">
                            {extensionOf(item.name, item.isFolder)}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="truncate selection:bg-transparent">{item.name}</span>
                    )}
                  </div>

                  <div
                    className="shrink-0 md:opacity-0 md:group-hover/row:opacity-100 has-[[aria-expanded=true]]:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ItemActionsMenu item={item} actions={actions} triggerClassName="h-6 w-6" />
                  </div>

                  {item.isFolder && (
                    <ChevronRight size={14} className={cn("shrink-0", isActive ? "opacity-100" : "opacity-0 group-hover/row:opacity-50")} />
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
  // "Locate in Files" (Storage Analytics) opens this page with ?prefix=<folder>&search=<file name>
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialLink] = useState(() => ({
    prefix: searchParams.get("prefix") || "",
    search: searchParams.get("search") || "",
  }));

  const [searchInput, setSearchInput] = useState(initialLink.search);
  const [debouncedSearch, setDebouncedSearch] = useState(initialLink.search);

  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'columns' | 'list'>('columns');
  const [activeFile, setActiveFile] = useState<StorageItem | null>(null);

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

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const hasActiveUploadsRef = React.useRef<boolean>(false);
  const batchUploadInProgressRef = React.useRef<boolean>(false);
  const uploadControllersRef = React.useRef<Map<string, AbortController>>(new Map());
  const uploadsCancelledRef = React.useRef<boolean>(false);

  // Drag-to-scroll state for the columns
  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const scrollLeftRef = React.useRef(0);

  // Open columns: "" is the root, then one entry per opened folder
  const [openFolders, setOpenFolders] = useState<string[]>(() => prefixToOpenFolders(initialLink.prefix));

  // Full-screen file preview
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);

  // The current folder is the last opened one
  const currentPrefix = openFolders[openFolders.length - 1] ?? "";

  const queryClient = useQueryClient();
  const { data, isLoading } = useStorageObjects(currentPrefix, debouncedSearch);
  const createFolderMutation = useCreateFolder();
  const deleteObjectMutation = useDeleteObject();
  const deleteObjectsMutation = useDeleteObjects();
  const renameObjectMutation = useRenameObject();

  // The link parameters are read once; take them off the address so a later reload starts clean
  React.useEffect(() => {
    if (searchParams.has("prefix") || searchParams.has("search")) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to the right edge whenever a folder or file is opened
  React.useEffect(() => {
    if (viewMode === 'columns' && scrollContainerRef.current) {
      const timer = window.setTimeout(() => {
        scrollContainerRef.current?.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth'
        });
      }, 50);
      return () => window.clearTimeout(timer);
    }
    return undefined;
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
      setDebouncedSearch(searchInput.trim());
    }, 500);
    return () => clearTimeout(handler);
  }, [searchInput]);

  /** The cached listings of a folder that are on screen (with and without the search). */
  const listCacheKeys = (prefix: string): QueryKey[] => {
    const keys: QueryKey[] = [storageKeys.list(prefix, "")];
    if (debouncedSearch) keys.push(storageKeys.list(prefix, debouncedSearch));
    return keys;
  };

  /** Closes the columns of folders that no longer exist (deleted or moved). */
  const closeRemovedFolders = (removedKeys: string[]) => {
    const removedFolders = removedKeys.filter((key) => key.endsWith("/"));
    if (removedFolders.length === 0) return;
    setOpenFolders((prev) => {
      const index = prev.findIndex((prefix) => removedFolders.some((folder) => prefix.startsWith(folder)));
      return index > 0 ? prev.slice(0, index) : prev;
    });
  };

  const handleUploadClick = (prefix: string) => {
    // Asked on a click, so the browser can show its prompt; used for the "upload finished" notice
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    setActiveUploadPrefix(prefix);
    fileInputRef.current?.click();
  };

  const handleCancelUploads = () => {
    uploadsCancelledRef.current = true;
    uploadControllersRef.current.forEach((controller) => controller.abort());
    uploadControllersRef.current.clear();
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (files.length > 25000) {
      toast.error("You can upload at most 25,000 files at once.");
      return;
    }

    const MAX_FILE_SIZE = 500 * 1024 * 1024 * 1024; // 500 GB, the server limit
    const validFiles = files.filter(f => f.size <= MAX_FILE_SIZE).map(f => {
      // Spaces become underscores so the file URLs have no %20
      const sanitizedName = f.name.replace(/\s+/g, '_');
      return sanitizedName === f.name ? f : new File([f], sanitizedName, { type: f.type, lastModified: f.lastModified });
    });
    const skipped = files.length - validFiles.length;
    if (skipped > 0) {
      toast.error(`Skipped ${skipped} file${skipped === 1 ? "" : "s"} above the 500 GB limit.`);
    }
    if (validFiles.length === 0) return;

    // The whole batch counts as in progress, so socket events do not wipe the cache mid-upload
    hasActiveUploadsRef.current = true;
    batchUploadInProgressRef.current = true;
    uploadsCancelledRef.current = false;
    const searchAtStart = debouncedSearch;

    const newUploads: UploadingFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 10),
      file,
      name: file.name,
      prefix: activeUploadPrefix,
      progress: 0,
      status: 'uploading' as const
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    let successCount = 0;
    let errorCount = 0;
    let cancelledCount = 0;
    const MAX_RETRIES = 3;

    const uploadWithRetry = async (upload: UploadingFile, attempt = 0): Promise<Awaited<ReturnType<typeof storageApi.uploadFile>>> => {
      const controller = new AbortController();
      uploadControllersRef.current.set(upload.id, controller);
      try {
        return await storageApi.uploadFile(upload.file, upload.prefix, (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, progress: Math.max(u.progress, percentCompleted) } : u));
          }
        }, controller.signal);
      } catch (error) {
        if (!uploadsCancelledRef.current && attempt < MAX_RETRIES) {
          // Progress is not reset, so the overall bar never moves backwards. Backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          if (!uploadsCancelledRef.current) return uploadWithRetry(upload, attempt + 1);
        }
        throw error;
      } finally {
        uploadControllersRef.current.delete(upload.id);
      }
    };

    const processUpload = async (upload: UploadingFile) => {
      if (uploadsCancelledRef.current) {
        cancelledCount++;
        setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'cancelled' } : u));
        return;
      }
      try {
        const result = await uploadWithRetry(upload);
        successCount++;

        // Show this file right away, without waiting for the rest of the batch
        const newFile = {
          key: result.key || `${upload.prefix}${upload.name}`,
          name: upload.name,
          size: result.size || upload.file.size,
          contentType: result.contentType || upload.file.type,
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          cdnUrl: result.cdnUrl || ""
        };
        const updateCache = (oldData: ListObjectsResponse | undefined) => {
          if (!oldData) return oldData;
          if (oldData.files.some((f) => f.key === newFile.key)) {
            return { ...oldData, files: oldData.files.map((f) => f.key === newFile.key ? newFile : f) };
          }
          return {
            ...oldData,
            files: [...oldData.files, newFile].sort((a, b) => a.name.localeCompare(b.name))
          };
        };
        const cacheKeys: QueryKey[] = [storageKeys.list(upload.prefix, "")];
        if (searchAtStart) cacheKeys.push(storageKeys.list(upload.prefix, searchAtStart));
        cacheKeys.forEach((key) => queryClient.setQueryData<ListObjectsResponse>(key, updateCache));

        // Kept in the list as completed, so the overall percentage does not jump back
        setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, progress: 100, status: 'completed' } : u));
      } catch {
        if (uploadsCancelledRef.current) {
          cancelledCount++;
          setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'cancelled' } : u));
        } else {
          errorCount++;
          setUploadingFiles(prev => prev.map(u => u.id === upload.id ? { ...u, status: 'error' } : u));
        }
      }
    };

    // 5 uploads at a time
    const uploadInBatches = async () => {
      const BATCH_SIZE = 5;
      for (let i = 0; i < newUploads.length; i += BATCH_SIZE) {
        const batch = newUploads.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(upload => processUpload(upload)));
      }
    };

    void uploadInBatches().then(() => {
      batchUploadInProgressRef.current = false;
      hasActiveUploadsRef.current = false;

      // A short wait lets S3 settle before the listings are fetched again
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
        queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
      }, 3000);

      const fileCount = (n: number) => `${n} file${n === 1 ? "" : "s"}`;
      let summary: string;
      if (cancelledCount > 0) {
        summary = successCount > 0
          ? `Upload cancelled. ${fileCount(successCount)} uploaded before that.`
          : "Upload cancelled.";
        toast.info(summary);
      } else if (successCount > 0 && errorCount === 0) {
        summary = `Uploaded ${fileCount(successCount)}.`;
        toast.success(summary);
      } else if (successCount > 0) {
        summary = `Uploaded ${fileCount(successCount)}, ${errorCount} failed.`;
        toast.warning(summary);
      } else {
        summary = `Could not upload ${fileCount(errorCount)}.`;
        toast.error(summary);
      }

      // Browser notice, for when the admin is on another tab
      if ('Notification' in window && Notification.permission === 'granted' && cancelledCount === 0) {
        try {
          new Notification('Classgrid storage upload', { body: summary, icon: '/favicon.ico' });
        } catch (error) {
          // Some browsers only allow notifications from a service worker
          console.error("Failed to show the upload notification", error);
        }
      }

      setTimeout(() => setUploadingFiles([]), 3000);
    });
  };

  const handleNavigateToFolder = () => {
    const path = navigatePath.trim().replace(/\\/g, "/");
    if (path) {
      setOpenFolders(prefixToOpenFolders(path));
      setActiveFile(null);
    }
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
    const walk = (x - startXRef.current) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleCreateFolder = (folderName: string, targetPrefix: string) => {
    if (createFolderMutation.isPending) return;
    const newFolderName = folderName.trim().replace(/\s+/g, '_');
    setCreatingFolderIn(null);
    if (!newFolderName) return;
    if (newFolderName.includes("/") || newFolderName.includes("\\")) {
      toast.error("A folder name cannot contain a slash.");
      return;
    }

    const newPrefix = `${targetPrefix}${newFolderName}/`;

    // Show the folder at once; the hook shows the success or error message
    listCacheKeys(targetPrefix).forEach((key) => {
      queryClient.setQueryData<ListObjectsResponse>(key, (oldData) => {
        if (!oldData || oldData.folders.some((f) => f.prefix === newPrefix)) return oldData;
        return {
          ...oldData,
          folders: [...oldData.folders, { name: newFolderName, prefix: newPrefix }]
            .sort((a, b) => a.name.localeCompare(b.name))
        };
      });
    });

    createFolderMutation.mutate({ folderName: newFolderName, prefix: targetPrefix }, {
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
      }
    });
  };

  const startRename = (key: string, name: string) => {
    const isFolder = key.endsWith("/");
    setFileToRename({ key, name });
    setNewFileName(baseNameOf(name, isFolder));
  };

  const handleRenameSelection = () => {
    if (selectedKeys.size === 1) {
      const key = Array.from(selectedKeys)[0];
      const item = toStorageItems(data).find((entry) => entry.key === key);
      if (item) startRename(item.key, item.name);
    } else if (selectedKeys.size === 0 && activeFile) {
      // Nothing ticked but a file is open in the preview: rename that one
      startRename(activeFile.key, activeFile.name);
    }
  };

  const handleRenameFile = () => {
    if (renameObjectMutation.isPending || !fileToRename) return;
    const typedName = newFileName.trim();
    if (!typedName) {
      setFileToRename(null);
      return;
    }
    if (typedName.includes("/") || typedName.includes("\\")) {
      toast.error("A name cannot contain a slash.");
      return;
    }

    const source = fileToRename;
    const isFolder = source.key.endsWith('/');
    const finalName = typedName + extensionOf(source.name, isFolder);

    if (source.name === finalName) {
      setFileToRename(null);
      return;
    }

    const parentPrefix = parentPrefixOf(source.key);
    const newKey = parentPrefix + finalName + (isFolder ? "/" : "");
    const nowIso = new Date().toISOString();

    // Show the new name at once and keep what was there, to put it back if the server says no
    const cacheKeys = listCacheKeys(parentPrefix);
    const snapshots = cacheKeys.map((key) => [key, queryClient.getQueryData<ListObjectsResponse>(key)] as const);
    const previousActiveFile = activeFile;
    const previousOpenFolders = openFolders;
    const previousSelectedKeys = selectedKeys;

    cacheKeys.forEach((key) => {
      queryClient.setQueryData<ListObjectsResponse>(key, (oldData) => {
        if (!oldData) return oldData;
        if (isFolder) {
          return {
            ...oldData,
            folders: oldData.folders
              .map((folder) => folder.prefix === source.key ? { ...folder, prefix: newKey, name: finalName } : folder)
              .sort((a, b) => a.name.localeCompare(b.name)),
          };
        }
        return {
          ...oldData,
          files: oldData.files
            .map((file) => file.key === source.key
              ? { ...file, key: newKey, name: finalName, lastModified: nowIso, cdnUrl: swapCdnKey(file.cdnUrl, source.key, newKey) }
              : file)
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      });
    });

    if (activeFile?.key === source.key) {
      setActiveFile({
        ...activeFile,
        key: newKey,
        name: finalName,
        lastModified: nowIso,
        cdnUrl: swapCdnKey(activeFile.cdnUrl, source.key, newKey),
      });
    }
    if (selectedKeys.has(source.key)) {
      setSelectedKeys(prev => {
        const next = new Set(prev);
        next.delete(source.key);
        next.add(newKey);
        return next;
      });
    }
    if (isFolder) {
      // Open columns inside the renamed folder follow the new name
      setOpenFolders(prev => prev.map((prefix) => prefix.startsWith(source.key) ? newKey + prefix.substring(source.key.length) : prefix));
    }
    setFileToRename(null);
    setNewFileName("");

    renameObjectMutation.mutate({ sourceKey: source.key, destinationKey: newKey, action: "rename" }, {
      onError: () => {
        snapshots.forEach(([key, snapshot]) => queryClient.setQueryData(key, snapshot));
        setActiveFile(previousActiveFile);
        setOpenFolders(previousOpenFolders);
        setSelectedKeys(previousSelectedKeys);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
      }
    });
  };

  const handleMoveFile = () => {
    if (!fileToMove || renameObjectMutation.isPending) return;

    const moved = fileToMove;
    const isFolder = moved.key.endsWith("/");
    let destPrefix = moveDestinationPrefix.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (destPrefix && !destPrefix.endsWith('/')) {
      destPrefix += '/';
    }

    // Folders keep their trailing slash, so their contents move with them
    const newKey = destPrefix + moved.name + (isFolder ? "/" : "");

    if (moved.key === newKey) {
      setFileToMove(null);
      return;
    }
    if (isFolder && newKey.startsWith(moved.key)) {
      toast.error("A folder cannot be moved into itself.");
      return;
    }

    renameObjectMutation.mutate({ sourceKey: moved.key, destinationKey: newKey, action: "move" }, {
      onSuccess: () => {
        setFileToMove(null);
        setMoveDestinationPrefix("");
        if (activeFile?.key === moved.key) setActiveFile(null);
        setSelectedKeys(prev => {
          const next = new Set(prev);
          next.delete(moved.key);
          return next;
        });
        closeRemovedFolders([moved.key]);
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
      }
    });
  };

  const handleDeleteFile = () => {
    if (!fileToDelete) return;
    const key = fileToDelete;
    deleteObjectMutation.mutate(key, {
      onSuccess: () => {
        setFileToDelete(null);
        setSelectedKeys(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        if (activeFile?.key === key) setActiveFile(null);
        closeRemovedFolders([key]);
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
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
        if (activeFile && keysArray.includes(activeFile.key)) setActiveFile(null);
        closeRemovedFolders(keysArray);
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
      }
    });
  };

  const toggleSelection = (e: React.MouseEvent | React.ChangeEvent, key: string) => {
    e.stopPropagation();
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const itemActions: ItemActions = {
    onRename: (item) => startRename(item.key, item.name),
    onMove: (item) => {
      setFileToMove({ key: item.key, name: item.name });
      setMoveDestinationPrefix(parentPrefixOf(item.key));
    },
    onDelete: (key) => setFileToDelete(key),
  };

  const previewPaneProps = activeFile ? {
    activeFile,
    onClose: () => setActiveFile(null),
    onDelete: () => setFileToDelete(activeFile.key),
    onRename: () => startRename(activeFile.key, activeFile.name),
    onFullScreen: () => setPreviewFile({ name: activeFile.name, src: activeFile.cdnUrl, mimeType: activeFile.type }),
  } : null;

  const items = toStorageItems(data);
  const deletingFolder = Boolean(fileToDelete?.endsWith("/"));
  const uploadProgress = uploadingFiles.length
    ? uploadingFiles.reduce((acc, f) => acc + f.progress, 0) / uploadingFiles.length
    : 0;
  const uploadsRunning = uploadingFiles.some((u) => u.status === 'uploading');

  const renderBreadcrumbs = () => {
    const parts = currentPrefix.split("/").filter(Boolean);

    return (
      <div className="flex items-center gap-1.5 text-sm font-medium flex-wrap max-w-full overflow-hidden">
        <button
          type="button"
          className={!currentPrefix ? "text-foreground" : "text-muted-foreground hover:text-foreground cursor-pointer transition-colors"}
          onClick={() => { setOpenFolders([""]); setActiveFile(null); }}
        >
          Root
        </button>
        {parts.map((part, idx) => {
          const isLast = idx === parts.length - 1;
          const target = prefixToOpenFolders(parts.slice(0, idx + 1).join("/"));

          return (
            <React.Fragment key={target[target.length - 1]}>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <button
                type="button"
                className={cn("truncate max-w-[150px]", isLast ? "text-foreground cursor-default" : "text-muted-foreground hover:text-foreground cursor-pointer transition-colors")}
                onClick={isLast ? undefined : () => { setOpenFolders(target); setActiveFile(null); }}
                title={part}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 w-full border-t border-border bg-card">
        {/* Toolbar. The left padding of the path row leaves room for the sidebar button (top left of this page) */}
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-border bg-muted/20 md:flex-row md:items-center md:justify-between">
          <div className="flex min-h-9 min-w-0 items-center pl-10 md:flex-1 md:mr-4">
            {renderBreadcrumbs()}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:flex-nowrap md:shrink-0">
            <div className="relative w-full md:w-[220px] md:mr-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search this folder"
                aria-label="Search this folder"
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
              title="Rename"
              aria-label="Rename"
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
                  aria-label="View options"
                >
                  {viewMode === 'columns' ? <Columns size={16} /> : <List size={16} />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6} className={`w-[200px] ${storageMenuCard}`}>
                <DropdownMenuItem onClick={() => setViewMode('columns')} className={`${storageMenuItem} justify-between`}>
                  <span className="flex items-center gap-3"><Columns className={storageMenuIcon} /> As columns</span>
                  {viewMode === 'columns' && <Check className="w-4 h-4 text-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('list')} className={`${storageMenuItem} justify-between`}>
                  <span className="flex items-center gap-3"><List className={storageMenuIcon} /> As list</span>
                  {viewMode === 'list' && <Check className="w-4 h-4 text-foreground" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator className={storageMenuSeparator} />
                <DropdownMenuItem onClick={() => setIsNavigateModalOpen(true)} className={storageMenuItem}>
                  <FolderOpen className={storageMenuIcon} /> Go to folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-5 w-px bg-border mx-1.5"></div>

            <Button
              variant="outline"
              className="h-9 px-3 sm:px-4 bg-background shadow-sm text-sm font-medium"
              onClick={() => setCreatingFolderIn(currentPrefix)}
              aria-label="Create folder"
            >
              <FolderPlus className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Create folder</span>
            </Button>
            <Button
              className="h-9 px-3 sm:px-4 text-sm font-medium ml-0.5"
              onClick={() => handleUploadClick(currentPrefix)}
              aria-label="Upload files"
            >
              <UploadCloud className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload files</span>
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
          className={cn(
            "flex flex-1 min-h-0 bg-background relative",
            viewMode === 'columns' ? 'overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing pb-2' : 'overflow-hidden'
          )}
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
                  selectedChildKey={openFolders[i + 1] ?? (i === openFolders.length - 1 ? activeFile?.key : undefined)}
                  selectedKeys={selectedKeys}
                  toggleSelection={toggleSelection}
                  onSelectFolder={(key: string) => {
                    setOpenFolders([...openFolders.slice(0, i + 1), key]);
                    setActiveFile(null);
                  }}
                  onSelectFile={(file: StorageItem) => {
                    setOpenFolders(openFolders.slice(0, i + 1));
                    setActiveFile(file);
                  }}
                  creatingFolderIn={creatingFolderIn}
                  setCreatingFolderIn={setCreatingFolderIn}
                  isCreatingFolderPending={createFolderMutation.isPending}
                  handleCreateFolder={handleCreateFolder}
                  uploadingFiles={uploadingFiles}
                  handleUploadClick={handleUploadClick}
                  fileToRename={fileToRename}
                  setFileToRename={setFileToRename}
                  newFileName={newFileName}
                  setNewFileName={setNewFileName}
                  handleRenameFile={handleRenameFile}
                  isRenamingPending={renameObjectMutation.isPending}
                  actions={itemActions}
                />
              ))}

              {/* Preview of the open file, or empty space */}
              <div className="flex-1 bg-background flex relative">
                {previewPaneProps && <FilePreviewPane {...previewPaneProps} />}
              </div>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1 h-full min-h-0 overflow-y-auto p-4 pb-24 bg-card custom-scrollbar">
                {creatingFolderIn === currentPrefix && (
                  <div className="mb-3 flex items-center gap-2 rounded-md border border-border bg-background p-2">
                    <Folder size={16} className="text-yellow-500 fill-yellow-500/20 shrink-0" />
                    <Input
                      autoFocus
                      defaultValue="Untitled folder"
                      aria-label="Folder name"
                      onFocus={(e) => e.target.select()}
                      className="h-8 flex-1 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCreateFolder(e.currentTarget.value, currentPrefix);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setCreatingFolderIn(null);
                        }
                      }}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== "Untitled folder") {
                          handleCreateFolder(e.target.value, currentPrefix);
                        } else {
                          setCreatingFolderIn(null);
                        }
                      }}
                    />
                  </div>
                )}
                {/* The table scrolls sideways inside its own box on narrow screens */}
                <div className="overflow-x-auto">
                  <DataTable
                    className={items.length ? "min-w-[640px]" : undefined}
                    columns={[
                      {
                        key: "select",
                        header: "",
                        width: "w-[5%] min-w-[40px]",
                        render: (_: unknown, row: StorageItem) => (
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border bg-background accent-foreground"
                            aria-label={`Select ${row.name}`}
                            checked={selectedKeys.has(row.key)}
                            onChange={(e) => toggleSelection(e, row.key)}
                          />
                        )
                      },
                      {
                        key: "name",
                        header: "Name",
                        accent: true,
                        width: "w-[45%]",
                        render: (_: unknown, row: StorageItem) => {
                          const isRenaming = fileToRename?.key === row.key;
                          return (
                            <div
                              className={cn("flex items-center gap-3 w-full cursor-pointer", row.isFolder ? "hover:underline font-medium" : "")}
                              onClick={() => {
                                if (isRenaming) return;
                                if (row.isFolder) {
                                  setOpenFolders(prefixToOpenFolders(row.key));
                                  setActiveFile(null);
                                } else {
                                  setActiveFile(row);
                                }
                              }}
                            >
                              {getFileIcon(row.type)}
                              {isRenaming ? (
                                <div className="flex items-center flex-1 min-w-0 max-w-[300px]" onClick={e => e.stopPropagation()}>
                                  <Input
                                    className="h-7 text-sm py-0 px-2 rounded-[4px] bg-background border-border w-full"
                                    autoFocus
                                    value={newFileName}
                                    aria-label="New name"
                                    onChange={e => setNewFileName(e.target.value)}
                                    onBlur={() => setFileToRename(null)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleRenameFile();
                                      if (e.key === 'Escape') setFileToRename(null);
                                    }}
                                    disabled={renameObjectMutation.isPending}
                                  />
                                  {extensionOf(row.name, row.isFolder) && (
                                    <span className="text-muted-foreground ml-0.5 shrink-0">
                                      {extensionOf(row.name, row.isFolder)}
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
                        render: (size: number | null) => size ? formatBytes(size) : "-"
                      },
                      {
                        key: "type",
                        header: "Type",
                        width: "w-[15%]",
                        render: (type: string) => {
                          if (type === "Folder") return <Badge variant="neutral" className="max-w-full">Folder</Badge>;
                          const fileExt = type?.split("/").pop()?.toUpperCase() || "FILE";
                          const content = <span className="block truncate max-w-full" title={fileExt}>{fileExt}</span>;
                          if (type?.startsWith("image/")) return <Badge variant="info" className="max-w-full">{content}</Badge>;
                          if (type?.startsWith("video/")) return <Badge variant="secondary" className="max-w-full">{content}</Badge>;
                          return <Badge variant="outline" className="max-w-full">{content}</Badge>;
                        }
                      },
                      {
                        key: "lastModified",
                        header: "Last modified",
                        width: "w-[15%]",
                        render: (date: string | null) => date ? format(new Date(date), "MMM d, yyyy h:mm a") : "-"
                      },
                      {
                        key: "actions",
                        header: "",
                        width: "w-[10%] text-right pr-6",
                        render: (_: unknown, row: StorageItem) => (
                          <div className="flex justify-end">
                            <ItemActionsMenu item={row} actions={itemActions} triggerClassName="h-8 w-8" />
                          </div>
                        )
                      }
                    ]}
                    rows={items}
                    isLoading={isLoading}
                    emptyMessage={debouncedSearch ? "No files match this search." : "This folder is empty."}
                  />
                </div>
              </div>
              {previewPaneProps && (
                <FilePreviewPane
                  {...previewPaneProps}
                  className="absolute inset-y-0 right-0 z-20 w-full max-w-[350px] shadow-xl md:static md:shadow-none"
                />
              )}
            </>
          )}

          {/* Selection bar, for both views */}
          {selectedKeys.size > 0 && (
            <div className="absolute z-30 bottom-6 left-1/2 -translate-x-1/2 max-w-[calc(100%-2rem)] whitespace-nowrap bg-card border border-border shadow-lg rounded-full px-4 sm:px-6 py-2.5 flex items-center gap-2 sm:gap-4 animate-in slide-in-from-bottom-5">
              <span className="text-sm font-medium">
                <span className="text-foreground mr-1">{selectedKeys.size}</span> selected
              </span>
              <div className="h-4 w-px bg-border"></div>
              <Button size="sm" variant="ghost" onClick={() => setSelectedKeys(new Set())}>Cancel</Button>
              <Button size="sm" variant="destructive" onClick={() => setIsBulkDeleteModalOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* Go to folder */}
      <Dialog open={isNavigateModalOpen} onOpenChange={setIsNavigateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Go to folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="storage-go-to-folder">Path</label>
              <Input
                id="storage-go-to-folder"
                placeholder="e.g. uploads/images"
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
              <p className="text-xs text-muted-foreground">A folder path in this bucket. Leave it empty to stay where you are.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNavigateModalOpen(false)}>Cancel</Button>
            <Button onClick={handleNavigateToFolder}>Go</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move */}
      <Dialog open={!!fileToMove} onOpenChange={(open) => !open && setFileToMove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="break-all">Move {fileToMove?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="storage-move-destination">Destination folder path</label>
              <Input
                id="storage-move-destination"
                value={moveDestinationPrefix}
                onChange={(e) => setMoveDestinationPrefix(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleMoveFile();
                  }
                }}
                placeholder="e.g. folder1/folder2/ (empty for the root)"
                autoFocus
              />
              <p className="text-xs text-muted-foreground break-all">Now in: {fileToMove ? (parentPrefixOf(fileToMove.key) || "Root") : ""}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToMove(null)}>Cancel</Button>
            <Button onClick={handleMoveFile} disabled={renameObjectMutation.isPending}>
              {renameObjectMutation.isPending && <Spinner className="mr-2" />}
              {renameObjectMutation.isPending ? "Moving" : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DangerConfirmDialog
        open={!!fileToDelete}
        onOpenChange={(open) => !open && setFileToDelete(null)}
        title={deletingFolder ? "Delete folder" : "Delete file"}
        description={deletingFolder
          ? "This folder and everything inside it will be deleted. This cannot be undone."
          : "This file will be deleted. This cannot be undone."}
        warningMessage={deletingFolder
          ? "Every file in this folder is removed from storage for good."
          : "The file is removed from storage for good."}
        actionLabel="Delete"
        onConfirm={handleDeleteFile}
        isLoading={deleteObjectMutation.isPending}
      />

      <DangerConfirmDialog
        open={isBulkDeleteModalOpen}
        onOpenChange={setIsBulkDeleteModalOpen}
        title={`Delete ${selectedKeys.size} item${selectedKeys.size === 1 ? "" : "s"}`}
        description={`The ${selectedKeys.size === 1 ? "selected item" : `${selectedKeys.size} selected items`} will be deleted, including everything inside selected folders. This cannot be undone.`}
        warningMessage="These files are removed from storage for good."
        actionLabel="Delete"
        onConfirm={handleBulkDelete}
        isLoading={deleteObjectsMutation.isPending}
      />

      {/* Full-screen file preview */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Floating upload progress box */}
      {uploadingFiles.length > 0 && (
        <motion.div
          drag
          dragMomentum={false}
          className="absolute top-4 left-4 right-4 sm:left-auto sm:w-[380px] z-50 bg-card border border-border shadow-xl rounded-md overflow-hidden cursor-grab active:cursor-grabbing"
        >
          <div className="p-4 flex items-center justify-between gap-3 border-b border-border/50">
            <div className="flex items-center gap-3 text-sm font-medium min-w-0">
              {uploadsRunning && <Spinner className="text-muted-foreground" />}
              <span className="truncate">
                {uploadsRunning
                  ? `Uploading ${uploadingFiles.length} file${uploadingFiles.length > 1 ? 's' : ''}`
                  : "Upload finished"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground font-medium tabular-nums">
              {Math.round(uploadProgress)}%
            </div>
          </div>

          <div className="h-1 bg-muted w-full overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>

          <div className="p-3 bg-muted/20 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">Drag this box anywhere. Uploads keep going while you work.</span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs bg-background shrink-0"
              disabled={!uploadsRunning}
              onClick={handleCancelUploads}
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

    </div>
  );
}
