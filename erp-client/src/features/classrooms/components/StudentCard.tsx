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
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { ClassroomMember } from '../types/classroom.types';
import { classroomApi } from '../services/classroomApi';
import { useQueryClient } from '@tanstack/react-query';

interface StudentCardProps {
  member: ClassroomMember;
  userRole: 'faculty' | 'student';
  classroomId?: string;
}

export const StudentCard: React.FC<StudentCardProps> = ({ member, userRole, classroomId }) => {
  const queryClient = useQueryClient();
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const handleRemove = async () => {
    if (!classroomId) {
      toast.error('Classroom ID missing');
      return;
    }
    if (window.confirm(`Are you sure you want to remove ${member.student.name} from the classroom?`)) {
      try {
        await classroomApi.removeMember(classroomId, member.student._id);
        toast.success(`Student removed successfully`);
        queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId, 'members'] });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to remove student');
      }
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      
      {/* Avatar */}
      <div className="shrink-0">
        {member.student.profilePicture ? (
          <img 
            src={member.student.profilePicture} 
            alt={member.student.name} 
            className="h-10 w-10 rounded-full object-cover border border-gray-100 shadow-sm"
          />
        ) : (
          <div className="h-10 w-10 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center border border-indigo-200 shadow-sm">
            {getInitials(member.student.name)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-gray-900 truncate">{member.student.name || 'Unknown Student'}</h4>
        <p className="text-sm text-gray-500 truncate">
          {member.student.prn ? `${member.student.prn} • ` : ''}{member.student.email}
        </p>
      </div>

      {/* Faculty Controls */}
      {userRole === 'faculty' && (
        <div className="shrink-0 pl-2">
          <button 
            onClick={handleRemove}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Remove Student"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
