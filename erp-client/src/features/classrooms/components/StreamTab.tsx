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

import React, { useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useClassroomContent } from '../queries/useClassroomContent';
import { EmptyState } from './EmptyState';
import { Spinner } from '@/components/marketing_ui/spinner';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { ClassroomContent } from '../types/classroom.types';
import { AnnouncementCard } from './AnnouncementCard';
import { PostAnnouncementForm } from './PostAnnouncementForm';
import { getSupabaseClient } from '@/lib/supabaseClient';

interface StreamTabProps {
  classroomId: string | undefined;
  userRole: 'faculty' | 'student';
  teacher?: {
    name: string;
    profilePicture?: string;
  };
}

export const StreamTab: React.FC<StreamTabProps> = ({ classroomId, userRole, teacher }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useClassroomContent(classroomId, 'announcement');
  const announcements: ClassroomContent[] = data?.data || [];

  useEffect(() => {
    if (!classroomId) return;
    const sb = getSupabaseClient();
    if (!sb) return;

    const channel = sb
      .channel(`classroom_${classroomId}_announcements`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'classroom_content',
          filter: `classroom_id=eq.${classroomId}`,
        },
        (payload) => {
          // If a new content item is inserted and it's an announcement, refresh the query
          if (payload.new && payload.new.type === 'announcement') {
            queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId, 'content', 'announcement'] });
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [classroomId, queryClient]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <div className="pl-[52px]">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {userRole === 'faculty' && classroomId && (
        <PostAnnouncementForm classroomId={classroomId} teacher={teacher} />
      )}

      {announcements.length === 0 ? (
        <EmptyState 
          icon={MessageSquare}
          title="No announcements yet"
          description="When you post an announcement, it will appear here."
        />
      ) : (
        <div className="space-y-6">
          {announcements.map((announcement) => (
            <AnnouncementCard 
              key={announcement.id || announcement._id}
              announcement={announcement}
              teacher={teacher || { name: 'Faculty Member' }}
              userRole={userRole}
              classroomId={classroomId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
