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

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { FileText, File, MoreHorizontal, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { ClassroomContent } from '../types/classroom.types';
import { PDFViewerModal } from './PDFViewerModal';
import { classroomApi } from '../services/classroomApi';
import { useQueryClient } from '@tanstack/react-query';

interface MaterialCardProps {
  material: ClassroomContent;
  userRole: 'faculty' | 'student';
  classroomId?: string;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({ material, userRole, classroomId }) => {
  const queryClient = useQueryClient();
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const isPdf = material.file_url?.toLowerCase().endsWith('.pdf');
  
  const formattedDate = material.created_at 
    ? formatDistanceToNow(new Date(material.created_at), { addSuffix: true })
    : 'Unknown date';

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!classroomId || !material._id) {
      toast.error('Missing required info for deletion');
      return;
    }
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        await classroomApi.deleteContent(classroomId, 'material', material._id);
        toast.success('Material deleted successfully');
        queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId, 'content', 'material'] });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete material');
      }
    }
  };

  const handleSummarize = () => {
    if (isPdf) {
      setIsPdfViewerOpen(true);
      toast.success('Opened PDF viewer. Click AI Summarize in the top right!');
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isPdf) {
      e.preventDefault();
      setIsPdfViewerOpen(true);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 transition-all flex flex-col h-full overflow-hidden relative group">
      
      {/* Header Actions */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        {userRole === 'faculty' && (
          <button 
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
            title="Delete Material"
          >
            <MoreHorizontal size={20} />
          </button>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg shrink-0 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
            {isPdf ? <FileText size={24} /> : <File size={24} />}
          </div>
          
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-bold text-lg text-gray-900 truncate" title={material.title}>
              {material.title || 'Untitled Document'}
            </h3>
            <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
          </div>
        </div>
        
        {material.description && (
          <p className="text-sm text-gray-600 mt-4 line-clamp-2">
            {material.description}
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-gray-100 bg-gray-50 p-3 flex items-center justify-end gap-2">
        {isPdf && (
          <button 
            onClick={handleSummarize}
            className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
          >
            <Sparkles size={14} />
            Summarize
          </button>
        )}
        <a 
          href={material.file_url} 
          target="_blank" 
          rel="noopener noreferrer"
          onClick={handleCardClick}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors"
        >
          <Download size={14} />
          Download
        </a>
      </div>

      {/* PDF Viewer Modal */}
      {isPdf && (
        <PDFViewerModal 
          isOpen={isPdfViewerOpen} 
          onClose={() => setIsPdfViewerOpen(false)} 
          material={material} 
          classroomId={classroomId}
        />
      )}
    </div>
  );
};
