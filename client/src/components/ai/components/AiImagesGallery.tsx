// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Download, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchWithRescue } from "@/lib/rescue";
import { AiHubImageViewer } from "./AiHubImageViewer";
import { DocsViewerImage } from "./DocsImageViewer";

interface GeneratedImage {
  id: string;
  prompt: string;
  url: string;
  createdAt: string;
  sessionId: string;
}

interface AiImagesGalleryProps {
  backendUrl: string;
}

export function AiImagesGallery({ backendUrl }: AiImagesGalleryProps) {
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const res = await fetchWithRescue(`${backendUrl}/api/ai/my-images`, {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Failed to fetch images");
        }
        const data = await res.json();
        setImages(data.images || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [backendUrl]);

  const handleDeleteImage = async (id: string, isAutoDelete = false) => {
    try {
      setImages(prev => prev.filter(img => img.id !== id));
      await fetchWithRescue(`${backendUrl}/api/ai/my-images/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!isAutoDelete) {
        toast.success("Image deleted successfully");
      }
    } catch (err) {
      console.error("Failed to delete image:", err);
      if (!isAutoDelete) {
        toast.error("Failed to delete image");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div>
          <div className="h-6 w-32 bg-muted rounded-md mb-4 animate-pulse"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="aspect-square rounded-xl bg-muted animate-pulse border border-border/20"></div>
                <div className="px-1 flex flex-col items-center">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse mt-1"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-destructive">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <ImageIcon className="w-12 h-12 mb-4 opacity-50" />
        <p>You haven't generated any images yet.</p>
        <p className="text-sm opacity-70">Try asking the AI to "Create an image of..."</p>
      </div>
    );
  }

  // Group images by month
  const groupedImages = images.reduce((acc, img) => {
    const month = format(parseISO(img.createdAt), "MMMM yyyy");
    if (!acc[month]) acc[month] = [];
    acc[month].push(img);
    return acc;
  }, {} as Record<string, GeneratedImage[]>);

  // Convert to DocsViewer format
  const allViewerImages: DocsViewerImage[] = images.map((img) => ({
    id: img.id,
    src: img.url,
    alt: img.prompt,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <AiHubImageViewer
        images={allViewerImages}
        onDelete={handleDeleteImage}
        renderThumbnails={(viewerImages, openImage) => (
          <div className="space-y-10">
            {Object.entries(groupedImages).map(([month, monthImages]) => (
              <div key={month}>
                <h4 className="text-lg font-semibold text-foreground mb-4 sticky top-0 bg-background/95 backdrop-blur py-2 z-10 border-b border-border/50">
                  {month}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {monthImages.map((img) => {
                    const viewerImg = viewerImages.find((v) => v.id === img.id)!;
                    return (
                      <div key={img.id} className="flex flex-col gap-2">
                        <div
                          className="group relative aspect-square rounded-xl overflow-hidden bg-muted cursor-pointer border border-border/50 hover:border-emerald-500/50 transition-colors"
                          onClick={(e) => openImage(viewerImg, e)}
                        >
                          <img
                            src={img.url}
                            alt="" // Empty alt to prevent massive prompt text if broken
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            onError={(e) => {
                              // If image fails to load, hide it and show a fallback
                              e.currentTarget.style.display = 'none';
                              const parent = e.currentTarget.parentElement;
                              if (parent) {
                                parent.classList.add('flex', 'items-center', 'justify-center', 'bg-muted');
                                parent.innerHTML = '<div class="text-center p-4"><p class="text-xs text-muted-foreground font-medium">Image Expired</p><p class="text-[10px] text-muted-foreground/60 mt-1">This link is no longer active</p></div>';
                                
                                // Auto delete expired image
                                handleDeleteImage(img.id, true);
                              }
                            }}
                          />
                        </div>
                        <div className="px-1 text-center">
                          <p className="text-xs font-medium text-muted-foreground mt-1">
                            {format(parseISO(img.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      />
    </div>
  );
}
