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

import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { classroomApi } from '../services/classroomApi';
import { Spinner } from '@/components/marketing_ui/spinner';

interface ClassroomCoverUploadProps {
  classroomId: string;
  currentCoverImage?: string;
}

export const ClassroomCoverUpload: React.FC<ClassroomCoverUploadProps> = ({ 
  classroomId, 
  currentCoverImage 
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('coverImage', file);
      
      return await classroomApi.uploadCover(classroomId, formData);
    },
    onSuccess: () => {
      toast.success('Cover image updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] }); // Refresh dashboard lists
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to upload cover image');
      setPreviewUrl(null); // Revert preview on failure
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Set preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Trigger upload
    mutation.mutate(file);
  };

  const handleContainerClick = () => {
    if (!mutation.isPending) {
      fileInputRef.current?.click();
    }
  };

  // Determine what image to show
  const displayImage = previewUrl || currentCoverImage;

  return (
    <div className="mb-6 space-y-2">
      <label className="text-sm font-medium text-gray-700">Classroom Cover Banner</label>
      <div 
        onClick={handleContainerClick}
        className={`relative aspect-[3/1] w-full rounded-xl border-2 border-dashed overflow-hidden flex flex-col items-center justify-center transition-colors cursor-pointer group
          ${mutation.isPending ? 'border-gray-200 bg-gray-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30'}`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
          disabled={mutation.isPending}
        />

        {displayImage ? (
          <>
            <img 
              src={displayImage} 
              alt="Classroom Cover" 
              className={`w-full h-full object-cover transition-opacity ${mutation.isPending ? 'opacity-50' : 'opacity-100 group-hover:opacity-90'}`}
            />
            {/* Overlay hover effect when image exists */}
            {!mutation.isPending && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="bg-white/90 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  <UploadCloud size={16} />
                  Change Banner
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-gray-500">
            <div className="p-3 bg-gray-100 rounded-full mb-3 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
              <ImageIcon size={24} />
            </div>
            <p className="text-sm font-medium text-gray-900">Click to upload a custom cover banner</p>
            <p className="text-xs text-gray-500 mt-1">Recommended size: 1200 x 400px (JPG, PNG)</p>
          </div>
        )}

        {/* Loading Overlay */}
        {mutation.isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center flex-col gap-2">
            <Spinner className="h-8 w-8 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700 bg-white/80 px-2 py-1 rounded">Uploading...</span>
          </div>
        )}
      </div>
    </div>
  );
};
