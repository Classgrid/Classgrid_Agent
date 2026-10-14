// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Paperclip, X, File, Image as ImageIcon, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import FilePreviewModal, { FilePreviewSource } from "./FilePreviewModal";
import { DocsImageViewer, DocsViewerImage } from "./DocsImageViewer";

const MAX_FILES = 3;
const MAX_FILE_SIZE_MB = 5;

interface AiFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, files: globalThis.File[]) => void;
  isSubmitting?: boolean;
}

export function AiFeedbackModal({ isOpen, onClose, onSubmit, isSubmitting }: AiFeedbackModalProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<globalThis.File[]>([]);
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);

  // Keep track of Object URLs for images
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processSelectedFiles = (selectedFiles: globalThis.File[]) => {
    // Filter out duplicates (same name and size, or same source URL)
    const uniqueFiles = selectedFiles.filter(newFile =>
      !files.some(existingFile => {
        if (existingFile.name === newFile.name && existingFile.size === newFile.size) return true;
        
        const existingKey = (existingFile as any)._previewKey;
        const newKey = (newFile as any)._previewKey;
        if (existingKey && newKey && existingKey === newKey) return true;
        
        return false;
      })
    );

    if (uniqueFiles.length === 0) return;

    if (files.length + uniqueFiles.length > MAX_FILES) {
      toast.error(`You can only attach up to ${MAX_FILES} files.`);
      return;
    }

    const validFiles = uniqueFiles.filter(file => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        toast.error(`File type not supported. Please upload an image or PDF.`);
        return false;
      }
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > MAX_FILE_SIZE_MB) {
        toast.error(`File "${file.name}" exceeds the ${MAX_FILE_SIZE_MB}MB limit.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const newUrls = { ...imageUrls };
      validFiles.forEach(file => {
        if (file.type.startsWith("image/")) {
          const key = `${file.name}-${Date.now()}`;
          (file as any)._previewKey = key;
          newUrls[key] = URL.createObjectURL(file);
        }
      });
      setImageUrls(newUrls);
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    processSelectedFiles(Array.from(e.target.files));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    // 1. Files from OS
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
      return;
    }

    /*
    // 2. Image dragged from browser (e.g. blob: or r2 url)
    const html = e.dataTransfer.getData("text/html");
    const textData = e.dataTransfer.getData("text/plain");

    let imageUrl = "";
    if (html) {
      const match = html.match(/<img.*?src=["'](.*?)["']/);
      if (match && match[1]) imageUrl = match[1];
    }

    if (!imageUrl && textData) {
      if (textData.match(/\.(jpeg|jpg|gif|png|webp)/i) || textData.includes("blob:")) {
        // Extract the first valid URL, handling cases where the browser duplicates 'blob:http...'
        const match = textData.match(/(https?:\/\/[^\s]+|blob:https?:\/\/[^\s]+)/);
        if (match) {
          imageUrl = match[1];
          // If the URL contains multiple 'blob:' concatenated (browser bug), split it
          if (imageUrl.startsWith("blob:") && imageUrl.indexOf("blob:", 5) !== -1) {
            imageUrl = imageUrl.substring(0, imageUrl.indexOf("blob:", 5));
          }
        }
      }
    }

    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        let filename = imageUrl.split('/').pop()?.split('?')[0];
        if (!filename || filename.length > 50 || filename.startsWith('blob:')) {
          filename = `image-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        }
        const file = new File([blob], filename, { type: blob.type });
        (file as any)._previewKey = imageUrl;
        processSelectedFiles([file]);
      } catch (error) {
        console.error("Failed to load dropped image:", error);
        // Fallback: Just paste the URL if it failed to fetch, without throwing a toast
        setText(prev => prev + (prev ? " " : "") + imageUrl);
      }
    } else if (textData) {
      // If it's just regular text, append it
      setText(prev => prev + (prev ? " " : "") + textData);
    }
    */
  };


  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      // Cleanup object URL
      if (removed && (removed as any)._previewKey && imageUrls[(removed as any)._previewKey]) {
        URL.revokeObjectURL(imageUrls[(removed as any)._previewKey]);
        setImageUrls(current => {
          const updated = { ...current };
          delete updated[(removed as any)._previewKey];
          return updated;
        });
      }
      return newFiles;
    });
  };

  const handleSend = () => {
    if (!text.trim() && files.length === 0) {
      toast.error("Please provide some text or an attachment.");
      return;
    }
    onSubmit(text.trim(), files);
  };

  const handleOpenPreview = (file: globalThis.File) => {
    setPreviewFile({
      name: file.name,
      src: file,
      mimeType: file.type
    });
  };

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setText("");
      setFiles([]);
      setPreviewFile(null);
      // Clean up all object URLs
      Object.values(imageUrls).forEach(url => URL.revokeObjectURL(url));
      setImageUrls({});
    }
  }, [isOpen]);

  const imageUrlsRef = React.useRef(imageUrls);
  React.useEffect(() => {
    imageUrlsRef.current = imageUrls;
  }, [imageUrls]);

  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      Object.values(imageUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const imageFiles = files.map((f, i) => ({ file: f, index: i })).filter(x => x.file.type.startsWith("image/"));
  const otherFiles = files.map((f, i) => ({ file: f, index: i })).filter(x => !x.file.type.startsWith("image/"));

  const docsViewerImages: DocsViewerImage[] = imageFiles.map(x => ({
    id: (x.file as any)._previewKey || x.file.name,
    src: imageUrls[(x.file as any)._previewKey] || "",
    alt: x.file.name
  }));

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]" overlayClassName="supports-backdrop-filter:backdrop-blur-none !backdrop-blur-none !bg-black/40">
          <DialogHeader>
            <DialogTitle>Leave feedback</DialogTitle>
            <DialogDescription>
              Send our team your feedback for the AI generated content
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
            <span className="mt-0.5">💡</span>
            <span>
              <strong>Tip:</strong> Please attach a screenshot, paste a public link of the chat, or copy the AI response text so our team can see exactly what went wrong and fix it faster.
            </span>
          </div>

          <div className="grid gap-4 py-2">
            {/* Unified Input Box */}
            <div
              className={`flex flex-col border rounded-xl shadow-sm overflow-hidden transition-colors focus-within:border-foreground/30 ${isDragging ? 'border-foreground/50 bg-foreground/5 ring-1 ring-foreground/20' : 'border-border bg-background/50'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Attachments inside the input box (Moved to TOP) */}
              {imageFiles.length > 0 && (
                <div className="p-3 pb-0 flex flex-col gap-3 max-h-[150px] overflow-y-auto custom-scrollbar">

                  {/* Image Grid with DocsImageViewer */}
                  {docsViewerImages.length > 0 && (
                    <DocsImageViewer
                      images={docsViewerImages}
                      renderThumbnails={(imgs, openImage) => (
                        <div className="flex flex-wrap gap-3">
                          {imgs.map((img, idx) => {
                            const originalIndex = imageFiles[idx].index;
                            return (
                              <div key={img.id} className="relative group rounded-lg overflow-hidden h-24 w-auto flex-shrink-0">
                                <img
                                  src={img.src}
                                  alt={img.alt}
                                  className="h-full w-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={(e) => openImage(img, e)}
                                />
                                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    className="bg-black/60 hover:bg-black/80 text-white rounded-full p-1 backdrop-blur-sm transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFile(originalIndex);
                                    }}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    />
                  )}
                </div>
              )}

              <textarea
                placeholder="Tell us more..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                style={{ border: 'none', borderRadius: 0, boxShadow: 'none', outline: 'none' }}
                className="w-full flex-1 p-3 px-4 text-sm text-foreground placeholder:text-muted-foreground/50 min-h-[120px] max-h-[150px] overflow-y-auto resize-none outline-none focus:outline-none focus:ring-0 hover:border-none hover:outline-none hover:ring-0 hover:shadow-none hover:bg-transparent bg-transparent custom-scrollbar"
                disabled={isSubmitting}
              />

              {/* Other Files (Moved BELOW the Textarea) */}
              {otherFiles.length > 0 && (
                <div className="px-3 pb-3 flex flex-col gap-2 max-h-[150px] overflow-y-auto custom-scrollbar border-0 !border-none hover:border-none">
                  {otherFiles.map(({ file, index }) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 px-3 border border-border rounded-lg bg-card/50 hover:bg-card/80 transition-colors group"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1 overflow-hidden"
                        onClick={() => handleOpenPreview(file)}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted shrink-0 text-muted-foreground">
                          <File className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate text-foreground">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-background border border-border shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        disabled={isSubmitting}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center">
            <div>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                disabled={isSubmitting || files.length >= MAX_FILES}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || files.length >= MAX_FILES}
                title="Attach files (Max 3, 5MB each)"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="cursor-pointer" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="button" className="cursor-pointer min-w-[100px]" onClick={handleSend} disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Spinner />
                    <span>Sending...</span>
                  </div>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full screen file preview */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
