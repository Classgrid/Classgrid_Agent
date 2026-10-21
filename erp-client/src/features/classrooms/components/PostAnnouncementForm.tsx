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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { classroomApi } from '../services/classroomApi';
import { Button } from '@/components/marketing_ui/button';
import { Send } from 'lucide-react';

interface PostAnnouncementFormProps {
  classroomId: string;
  teacher?: {
    name: string;
    profilePicture?: string;
  };
}

export const PostAnnouncementForm: React.FC<PostAnnouncementFormProps> = ({ classroomId, teacher }) => {
  const [message, setMessage] = useState('');
  const queryClient = useQueryClient();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const mutation = useMutation({
    mutationFn: (text: string) => classroomApi.addContent(classroomId, 'announcement', { message: text }),
    onSuccess: () => {
      setMessage('');
      toast.success('Announcement posted successfully!');
      queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId, 'content', 'announcement'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to post announcement.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    mutation.mutate(message);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {teacher?.profilePicture ? (
          <img 
            src={teacher.profilePicture} 
            alt={teacher.name || 'Teacher'} 
            className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200 shrink-0">
            {getInitials(teacher?.name)}
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={mutation.isPending}
            placeholder="Announce something to your class..."
            className="w-full min-h-[100px] resize-y rounded-lg border border-gray-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-50 transition-shadow"
          />
          <div className="flex justify-end mt-4">
            <Button 
              type="submit" 
              disabled={mutation.isPending || !message.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all active:scale-95 flex items-center gap-2"
            >
              {mutation.isPending ? (
                'Posting...'
              ) : (
                <>
                  <Send size={16} />
                  Post
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
