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
import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Search, FileImage, FileVideo, FileText, FileAudio, File as FileIcon, FileQuestion, MessageSquare, Download, Trash2, MoreVertical, X, Filter, SortDesc, Loader2, CalendarIcon, Music } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/marketing_ui/popover';
import { Calendar } from '@/components/marketing_ui/nikhil_calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Button } from '@/components/marketing_ui/button';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { NikhilTimeCalendar } from '@/components/marketing_ui/nikhil_time_calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/marketing_ui/dropdown-menu';
import { DangerConfirmDialog } from '@/components/marketing_ui/danger-confirm-dialog';
import { getSocket } from '@/lib/socketClient';
import { fetchWithRescue } from "@/lib/rescue";
import FilePreviewModal from './FilePreviewModal';
import { DocsImageViewer } from './DocsImageViewer';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

interface LibraryFile {
  _id: string;
  original_name: string;
  cdn_url: string;
  mime_type: string;
  file_type: 'image' | 'video' | 'pdf' | 'pptx' | 'doc' | 'audio' | 'other';
  size_bytes: number;
  source: 'uploaded' | 'generated';
  thumbnail_url?: string;
  created_at: string;
}

interface Quota {
  used_bytes: number;
  max_bytes: number;
  percentage: number;
}

export function LibraryPage() {
  const [files, setFiles] = useState<LibraryFile[]>([]);
  const [quota, setQuota] = useState<Quota>({ used_bytes: 0, max_bytes: 629145600, percentage: 0 });
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'image' | 'video' | 'pdf' | 'doc' | 'audio'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'largest'>('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFileToPreview, setSelectedFileToPreview] = useState<LibraryFile | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const navigate = useNavigate();
  const location = useLocation();
  const pathParts = location.pathname.split('/');
  const agentIndex = pathParts.indexOf('agent');
  const baseAgentPath = agentIndex !== -1
    ? pathParts.slice(0, agentIndex + 1).join('/')
    : location.pathname;

  const endpointPrefix = typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env.VITE_API_URL || "https://api.classgrid.in")
    : "";

  const fetchLibrary = useCallback(async () => {
    try {
      setIsLoading(true);
      let url = `${endpointPrefix}/api/ai/library?sort=${sort}`;
      if (activeTab !== 'all') {
        url += `&type=${activeTab}`;
      }
      const res = await fetchWithRescue(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.quota) {
          const percentage = Math.min(100, (data.quota.used_bytes / data.quota.max_bytes) * 100);
          setQuota({ ...data.quota, percentage });
        }
      }
    } catch (err) {
      console.error('Failed to fetch library', err);
    } finally {
      setIsLoading(false);
    }
  }, [endpointPrefix, sort, activeTab]);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    const handleLibraryUpdate = () => {
      fetchLibrary();
    };

    socket.on('ai_library_updated', handleLibraryUpdate);
    return () => {
      socket.off('ai_library_updated', handleLibraryUpdate);
    };
  }, [fetchLibrary]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    if (quota.used_bytes + file.size > quota.max_bytes) {
      toast.error("Storage quota exceeded. Please delete some files first.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10); // Fake progress to show UI
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/library/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (res.ok) {
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          fetchLibrary();
        }, 500);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to upload file");
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (err) {
      console.error("Upload error", err);
      setIsUploading(false);
      setUploadProgress(0);
      toast.error("An error occurred during upload.");
    }
  }, [endpointPrefix, quota, fetchLibrary]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetchWithRescue(`${endpointPrefix}/api/ai/library/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.quota) {
          const percentage = Math.min(100, (data.quota.used_bytes / data.quota.max_bytes) * 100);
          setQuota({ ...data.quota, percentage });
        }
        setFiles(files.filter(f => f._id !== id));
        toast.success("File deleted");
      } else {
        toast.error("Failed to delete file.");
      }
    } catch (err) {
      console.error("Delete error", err);
      toast.error("Failed to delete file.");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleAskAI = (fileUrl: string, fileName: string) => {
    sessionStorage.setItem("agent:attach_file_url", fileUrl);
    sessionStorage.setItem("agent:attach_file_name", fileName);
    navigate(baseAgentPath);
    window.dispatchEvent(new Event("agent:new-chat"));
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const filteredFiles = files.filter(f => {
    const matchesSearch = f.original_name.toLowerCase().includes(search.toLowerCase());
    const matchesDate = dateFilter ? f.created_at.startsWith(format(dateFilter, "yyyy-MM-dd")) : true;
    return matchesSearch && matchesDate;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <FileImage className="w-8 h-8 text-blue-500" />;
      case 'video': return <FileVideo className="w-8 h-8 text-purple-500" />;
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc': return <FileIcon className="w-8 h-8 text-blue-600" />;
      case 'pptx': return <FileIcon className="w-8 h-8 text-orange-500" />;
      case 'audio': return <FileAudio className="w-8 h-8 text-emerald-500" />;
      default: return <FileQuestion className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground overflow-y-auto">
      {/* Header */}
      <div className="px-6 pt-2 pb-6 border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur z-40">
        <div className="max-w-6xl mx-auto w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Library</h1>
            <p className="text-muted-foreground text-sm">Manage your uploaded and AI-generated files.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search files..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 bg-accent/50 hover:bg-accent focus:bg-accent rounded-full border border-border/50 focus:outline-none focus:ring-1 focus:ring-ring w-[240px] text-sm transition-colors"
              />
            </div>
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              <button className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-full font-medium text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
                <Upload className="w-4 h-4" />
                Upload File
              </button>
            </div>
          </div>
        </div>

        {/* Quota Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <span className="text-sm font-medium">Storage Usage</span>
            <span className="text-xs text-muted-foreground">
              {formatBytes(quota.used_bytes)} / {formatBytes(quota.max_bytes)}
            </span>
          </div>
          <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${quota.percentage > 80 ? 'bg-red-500' : 'bg-foreground'}`}
              style={{ width: `${quota.percentage}%` }}
            />
          </div>
          {quota.percentage > 80 && (
            <p className="text-xs text-red-500 mt-1">Storage is almost full. Delete some files to free up space.</p>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="p-3 bg-accent/50 rounded-xl border border-border/50 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium">Uploading...</span>
                <span className="text-xs">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-accent rounded-full overflow-hidden">
                <div className="h-full bg-foreground transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          </div>
        )}
        {/* Filters & Sort */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            {['all', 'image', 'video', 'pdf', 'doc', 'audio'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-foreground text-background' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {tab === 'all' ? 'All Files' : tab + 's'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Date:</span>
              <div className="flex items-center gap-1">
                <NikhilTimeCalendar
                  value={dateFilter}
                  onChange={setDateFilter}
                  placeholder="Pick a date"
                  className="h-9 w-[150px] bg-accent/50 hover:bg-accent border-border/50"
                  showTime={false}
                />
                {dateFilter && (
                  <Button variant="ghost" size="icon" onClick={() => setDateFilter(undefined)} className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Sort by:</span>
              <Select value={sort} onValueChange={(val: any) => setSort(val)}>
                <SelectTrigger className="w-[140px] h-9 bg-accent/50 hover:bg-accent border-border/50">
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="largest">Largest first</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Main Content */}
      <div className="flex-1 p-6 pt-6 max-w-6xl mx-auto w-full">

        {/* Grid */}
        {isLoading ? (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="flex flex-col gap-2 break-inside-avoid w-full">
                <Skeleton className={`w-full rounded-2xl ${i % 3 === 0 ? 'h-64' : i % 2 === 0 ? 'h-48' : 'h-32'}`} />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mb-4">
              <FileIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No files found</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {search ? "We couldn't find any files matching your search." : "You haven't uploaded any files yet. Drag and drop a file anywhere or click the upload button to get started."}
            </p>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 gap-4 space-y-4">
            {filteredFiles.map(file => (
              <div 
                key={file._id} 
                className="group relative bg-accent/20 border border-border/50 rounded-2xl overflow-hidden hover:border-border transition-colors flex flex-col shadow-sm break-inside-avoid w-full cursor-pointer"
                onClick={() => setSelectedFileToPreview(file)}
              >
                {/* Preview Area */}
                {(() => {
                  const ext = file.original_name.split('.').pop()?.toLowerCase() || '';
                  const isAudio = file.file_type === 'audio' || file.mime_type?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
                  const isVideo = file.file_type === 'video' || file.mime_type?.startsWith('video/') || ['mp4', 'webm', 'mov'].includes(ext);
                  const isPdf = file.file_type === 'pdf' || file.mime_type === 'application/pdf' || ext === 'pdf';
                  const isImage = file.file_type === 'image' || file.mime_type?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                  
                  return (
                    <div className={`w-full bg-accent/30 flex items-center justify-center relative overflow-hidden ${isImage ? '' : isAudio ? 'p-4' : 'aspect-square'}`}>
                      {isImage ? (
                        <img src={file.cdn_url} alt={file.original_name} className="w-full h-auto object-cover block" />
                      ) : isVideo ? (
                        <video 
                          src={file.cdn_url} 
                          className="w-full h-full object-cover" 
                          muted 
                          preload="metadata"
                          onMouseEnter={(e) => { try { (e.target as HTMLVideoElement).play(); } catch {} }}
                          onMouseLeave={(e) => { try { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; } catch {} }}
                        />
                      ) : isPdf ? (
                        <div className="w-full h-full relative">
                          <iframe 
                            src={`${file.cdn_url}#toolbar=0&navpanes=0&scrollbar=0`} 
                            className="w-full h-full pointer-events-none" 
                            title={file.original_name}
                            style={{ border: 'none' }}
                          />
                          <div className="absolute bottom-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">PDF</div>
                        </div>
                      ) : isAudio ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
                          <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-border/50 bg-muted/50 flex items-center justify-center transition-transform group-hover:scale-105">
                            {(file as any).thumbnail_url ? (
                              <img src={(file as any).thumbnail_url} alt="Cover" className="w-full h-full object-cover" />
                            ) : (
                              <Music className="w-8 h-8 text-muted-foreground/70" />
                            )}
                          </div>
                          <audio 
                            src={file.cdn_url} 
                            controls 
                            preload="metadata" 
                            className="w-full h-8 opacity-80"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          {getFileIcon(file.file_type)}
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-accent px-2 py-0.5 rounded">
                            {ext.toUpperCase() || 'FILE'}
                          </span>
                        </div>
                      )}
                      
                      {/* Source Badge */}
                      {file.source === 'generated' && (
                        <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm z-10">
                          AI Generated
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Info Area */}
                <div className="p-3 bg-background border-t border-border/50 flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate mb-1" title={file.original_name}>
                      {file.original_name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatBytes(file.size_bytes)}</span>
                      <span>•</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button onClick={(e) => e.stopPropagation()} className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-accent transition-colors -mt-1 -mr-1">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAskAI(file.cdn_url, file.original_name); }} className="cursor-pointer">
                        <MessageSquare className="w-4 h-4 mr-2" /> Ask Agent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(file.cdn_url, '_blank'); }} className="cursor-pointer">
                        <Download className="w-4 h-4 mr-2" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(file._id); }} 
                        className="text-red-500 focus:text-red-500 focus:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DangerConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Delete File"
        description="Are you sure you want to permanently delete this file? This action cannot be undone."
        warningMessage="This file will be permanently removed from your library and storage quota."
        actionLabel="Delete"
        isLoading={isDeleting}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
        }}
      />

      {/* File Previews */}
      {selectedFileToPreview && selectedFileToPreview.file_type !== 'image' && (
        <FilePreviewModal
          file={{
            name: selectedFileToPreview.original_name,
            src: selectedFileToPreview.cdn_url,
            mimeType: selectedFileToPreview.mime_type
          }}
          onClose={() => setSelectedFileToPreview(null)}
          onDelete={() => {
            setDeleteId(selectedFileToPreview._id);
            setSelectedFileToPreview(null);
          }}
        />
      )}

      {selectedFileToPreview && selectedFileToPreview.file_type === 'image' && (
        <DocsImageViewer
          images={[{
            id: selectedFileToPreview._id,
            src: selectedFileToPreview.cdn_url,
            alt: selectedFileToPreview.original_name
          }]}
          defaultOpenIndex={0}
          onClose={() => setSelectedFileToPreview(null)}
          renderThumbnails={() => null} // Thumbnails are rendered inline in the grid
        />
      )}
    </div>
  );
}
