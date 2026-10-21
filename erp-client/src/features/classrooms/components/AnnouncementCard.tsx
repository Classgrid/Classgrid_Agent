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
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ClassroomContent } from '../types/classroom.types';
import { classroomApi } from '../services/classroomApi';
import { Button } from '@/components/marketing_ui/button';

interface AnnouncementCardProps {
  announcement: ClassroomContent;
  teacher: {
    name: string;
    profilePicture?: string;
  };
  userRole?: 'faculty' | 'student';
  classroomId?: string;
}

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement, teacher, userRole, classroomId }) => {
  const [isNotifying, setIsNotifying] = useState(false);
  const [hasNotified, setHasNotified] = useState(false);
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formattedDate = announcement.created_at 
    ? formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })
    : 'Just now';

  const handleNotify = async () => {
    if (!classroomId) return;
    if (window.confirm("Send notification about this announcement to all students?")) {
      setIsNotifying(true);
      try {
        await classroomApi.sendNotification(classroomId, {
          title: "New Announcement",
          message: announcement.title || "Check the stream for a new announcement.",
          type: "announcement"
        });
        toast.success("Notification sent to students");
        setHasNotified(true);
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to send notification");
      } finally {
        setIsNotifying(false);
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 border-l-4 border-l-indigo-500 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 text-left relative group">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {teacher?.profilePicture ? (
          <img 
            src={teacher.profilePicture} 
            alt={teacher.name || 'Teacher'} 
            className="h-10 w-10 rounded-full object-cover border border-gray-200 shadow-sm"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border border-indigo-200 shadow-sm">
            {getInitials(teacher?.name)}
          </div>
        )}
        <div>
          <h4 className="font-bold text-gray-900">{teacher?.name || 'Unknown Teacher'}</h4>
          <p className="text-xs text-gray-500">{formattedDate}</p>
        </div>
      </div>

      {/* Body */}
      <div className="pl-[52px]">
        {announcement.title && (
          <h3 className="font-bold text-xl text-gray-900 mb-2">{announcement.title}</h3>
        )}
        <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
          {announcement.message || announcement.description || ''}
        </div>
        
        {/* Faculty Controls */}
        {userRole === 'faculty' && classroomId && (
          <div className="mt-4 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNotify}
              disabled={isNotifying || hasNotified}
              className="text-xs h-8 px-3 flex items-center gap-1.5"
            >
              {isNotifying ? (
                <Loader2 size={14} className="animate-spin" />
              ) : hasNotified ? (
                <CheckCircle2 size={14} className="text-green-500" />
              ) : (
                <Bell size={14} className="text-gray-500" />
              )}
              {isNotifying ? 'Sending...' : hasNotified ? 'Notified' : 'Notify Students'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
