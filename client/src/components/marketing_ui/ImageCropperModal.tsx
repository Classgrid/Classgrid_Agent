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

import React, { useState, useRef } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./dialog";
import { Button } from "./button";
import { ProgressOverlay } from "./ProgressOverlay";

type ImageCropperModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => Promise<void> | void;
  aspectRatio?: number;
  title?: string;
  minWidth?: number;
  minHeight?: number;
  circularCrop?: boolean;
};

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropperModal({ 
  isOpen, 
  onClose, 
  imageSrc, 
  onCropComplete, 
  aspectRatio, 
  circularCrop = false,
  title = "Crop Image",
  minWidth,
  minHeight
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "complete">("idle");

  React.useEffect(() => {
    if (isOpen) {
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [isOpen, imageSrc]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspectRatio) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspectRatio));
    }
  }

  const handleSave = async () => {
    if (!completedCrop || !imgRef.current || completedCrop.width === 0 || completedCrop.height === 0) return;
    setUploadStatus("uploading");

    try {
      const image = imgRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("No 2d context");

      // Scale ratio to ensure highest quality export
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Ensure canvas matches the final cropped dimensions
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      ctx.imageSmoothingQuality = "high";

      const cropX = completedCrop.x * scaleX;
      const cropY = completedCrop.y * scaleY;
      const cropWidth = completedCrop.width * scaleX;
      const cropHeight = completedCrop.height * scaleY;

      ctx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      const isPng = imageSrc.startsWith("data:image/png");
      const exportFormat = isPng ? "image/png" : "image/jpeg";

      // Export as a high-quality Blob (preserves transparency if PNG)
      canvas.toBlob(
        async (blob) => {
          try {
            if (blob) {
              await onCropComplete(blob);
              setUploadStatus("complete");
              await new Promise(res => setTimeout(res, 600)); // Show 100% complete briefly
              setUploadStatus("idle");
              onClose();
            }
          } catch (err) {
            console.error("Error in onCropComplete callback:", err);
            setUploadStatus("error");
            setTimeout(() => {
              setUploadStatus("idle");
              onClose();
            }, 2000);
          }
        },
        exportFormat,
        1.0
      );
    } catch (error) {
      console.error("Cropping failed", error);
      setUploadStatus("error");
      setTimeout(() => {
        setUploadStatus("idle");
      }, 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center bg-black/5 rounded-md p-4 min-h-[300px]">
          {imageSrc ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              circularCrop={circularCrop}
              minWidth={minWidth}
              minHeight={minHeight}
            >
              <img
                ref={imgRef}
                crossOrigin="anonymous"
                alt="Crop preview"
                src={imageSrc}
                onLoad={onImageLoad}
                style={{ maxHeight: "60vh", objectFit: "contain" }}
              />
            </ReactCrop>
          ) : (
            <p className="text-muted-foreground">Loading image...</p>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={uploadStatus !== "idle"}
            className="border-white/[0.1] bg-white/[0.04] text-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)] transition-all duration-200 hover:bg-white/[0.08] hover:border-white/[0.2] hover:text-white hover:shadow-[0_0_14px_rgba(255,255,255,0.06)]"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={uploadStatus !== "idle" || !completedCrop || completedCrop.width === 0 || completedCrop.height === 0}>
            {uploadStatus !== "idle" ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
        <ProgressOverlay isOpen={uploadStatus !== "idle"} status={uploadStatus === "idle" ? "uploading" : uploadStatus} message="Uploading image..." />
      </DialogContent>
    </Dialog>
  );
}
