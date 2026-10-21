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
import { Users, Search, ChevronRight } from 'lucide-react';
import { useClassroomMembers } from '../queries/useClassroomMembers';
import { ClassroomMember } from '../types/classroom.types';
import { EmptyState } from './EmptyState';
import { Spinner } from '@/components/marketing_ui/spinner';
import { Input } from '@/components/marketing_ui/input';
import { StudentCard } from './StudentCard';
import { JoinRequestsPanel } from './JoinRequestsPanel';

interface StudentsTabProps {
  classroomId: string | undefined;
  userRole: 'faculty' | 'student';
}

export const StudentsTab: React.FC<StudentsTabProps> = ({ classroomId, userRole }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isRequestsExpanded, setIsRequestsExpanded] = useState(false);
  const { data, isLoading } = useClassroomMembers(classroomId);
  
  const allMembers: ClassroomMember[] = data?.members || [];
  
  const pendingRequests = allMembers.filter(m => m.status === 'pending');
  const approvedMembers = allMembers.filter(m => m.status === 'approved');
  
  const filteredStudents = approvedMembers.filter(m => {
    const nameMatch = m.student?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = m.student?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return nameMatch || emailMatch;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-12">
      
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-10 bg-[#FAFAFA] pt-4 pb-6 mb-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <Search size={18} />
          </div>
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students by name or email..."
            className="w-full pl-10 h-11 bg-white border-gray-200 focus:border-indigo-500 rounded-xl"
          />
        </div>
      </div>

      {/* Pending Requests (Faculty Only) */}
      {userRole === 'faculty' && pendingRequests.length > 0 && (
        isRequestsExpanded ? (
          <JoinRequestsPanel requests={pendingRequests} classroomId={classroomId!} />
        ) : (
          <div 
            onClick={() => setIsRequestsExpanded(true)}
            className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors shadow-sm"
          >
            <div>
              <h3 className="font-bold text-amber-900">Pending Requests</h3>
              <p className="text-sm text-amber-700">{pendingRequests.length} students waiting for approval</p>
            </div>
            <div className="text-amber-500">
              <ChevronRight size={20} />
            </div>
          </div>
        )
      )}

      {/* Student Roster */}
      {approvedMembers.length === 0 ? (
        <EmptyState 
          icon={Users}
          title="No students yet"
          description="Approved students will appear here."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm font-medium text-gray-500 mb-2 px-2">
            <span>{filteredStudents.length} Students</span>
          </div>
          
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
              No students found matching "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((member) => (
                <StudentCard 
                  key={member._id} 
                  member={member} 
                  userRole={userRole} 
                  classroomId={classroomId}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
