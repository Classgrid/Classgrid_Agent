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

import React from 'react';
import { Users, Clock } from 'lucide-react';
import { Button } from '@/components/marketing_ui/button';
import { Skeleton } from '@/components/marketing_ui/skeleton';

export interface BaseClassroom {
  _id: string;
  name: string;
  subject?: string;
  coverImage?: string;
  memberCount?: number;
  pendingRequests?: number;
  membershipStatus?: string;
  teacher?: {
    name: string;
    profilePicture?: string;
  };
}

interface ClassroomCardProps {
  classroom: BaseClassroom;
  isTeacher?: boolean;
  actionType: 'enter' | 'join' | 'requested';
  onActionClick?: (e: React.MouseEvent) => void;
  isLoadingAction?: boolean;
}

const GRADIENTS = [
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-purple-500 to-pink-600",
  "from-cyan-500 to-blue-600",
];

export const ClassroomCard: React.FC<ClassroomCardProps> = ({
  classroom,
  isTeacher,
  actionType,
  onActionClick,
  isLoadingAction
}) => {
  const gradient = GRADIENTS[classroom.name.length % GRADIENTS.length];

  return (
    <div className="group relative flex flex-col h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Cover Image / Gradient */}
      <div className={`h-28 w-full bg-gradient-to-r ${gradient} relative`}>
        {classroom.coverImage && (
          <img 
            src={classroom.coverImage} 
            alt="Classroom Cover" 
            className="absolute inset-0 h-full w-full object-cover mix-blend-overlay opacity-60" 
          />
        )}
        <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:bg-black/0"></div>
        
        {/* Teacher Avatar Overlay */}
        {!isTeacher && (
          <div className="absolute -bottom-5 right-4 z-10">
            {classroom.teacher?.profilePicture ? (
              <img 
                src={classroom.teacher.profilePicture} 
                alt={classroom.teacher.name} 
                className="h-12 w-12 rounded-full object-cover border-4 border-white shadow-sm"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-lg font-bold text-indigo-600 border-4 border-white shadow-sm">
                {classroom.teacher?.name?.charAt(0) || '?'}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-1 pr-12">
          <h3 className="font-bold text-lg text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
            {classroom.name}
          </h3>
        </div>
        
        <p className="text-sm text-gray-500 line-clamp-1 mb-4">
          {classroom.subject || "General Subject"}
        </p>

        {/* Stats / Teacher Name */}
        <div className="mt-auto mb-4 flex items-center gap-4 text-sm text-gray-500">
          {isTeacher ? (
            <>
              <span className="flex items-center gap-1.5" title="Enrolled Students">
                <Users size={16} className="text-gray-400" />
                <span className="font-medium text-gray-700">{classroom.memberCount || 0}</span>
              </span>
              {!!classroom.pendingRequests && (
                <span className="flex items-center gap-1.5 text-amber-500 font-medium" title="Pending Requests">
                  <Clock size={16} />
                  {classroom.pendingRequests} pending
                </span>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-gray-700 truncate">
              {classroom.teacher?.name || "Unknown Faculty"}
            </span>
          )}
        </div>

        {/* Action Button */}
        {actionType === 'enter' && (
          <Button 
            className="w-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-100 font-medium shadow-none"
            onClick={onActionClick}
          >
            Enter Classroom
          </Button>
        )}
        
        {actionType === 'join' && (
          <Button 
            className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm"
            onClick={onActionClick}
            disabled={isLoadingAction}
          >
            Request to Join
          </Button>
        )}

        {actionType === 'requested' && (
          <Button 
            variant="outline"
            className="w-full text-gray-500 cursor-not-allowed bg-gray-50 border-gray-200"
            disabled
          >
            <Clock size={14} className="mr-2" />
            Requested
          </Button>
        )}
      </div>
    </div>
  );
};

export const ClassroomCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="flex flex-1 flex-col p-5">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        <div className="mt-auto mb-4 flex items-center gap-4">
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
};
