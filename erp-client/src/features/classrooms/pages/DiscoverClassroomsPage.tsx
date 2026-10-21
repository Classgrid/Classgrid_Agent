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

import React, { useState, useEffect } from 'react';
import { Search, Compass, Users } from 'lucide-react';
import { Input } from '@/components/marketing_ui/input';
import { Button } from '@/components/marketing_ui/button';
import { Spinner } from '@/components/marketing_ui/spinner';
import { toast } from 'sonner';

import { useDiscoverClassrooms } from '../queries/useDiscoverClassrooms';
import { useJoinClassroom } from '../queries/useJoinClassroom';
import { ClassroomCard, ClassroomCardSkeleton } from '../components/ClassroomCard';

export function DiscoverClassroomsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const { data: discoverData, isLoading } = useDiscoverClassrooms({ search: searchQuery });
  const classrooms = discoverData?.data || [];
  
  const joinClassroom = useJoinClassroom();

  const handleRequestJoin = (id: string, isCodeRequired: boolean = false) => {
    if (isCodeRequired) {
      toast.info("This classroom requires a code to join. Please ask the teacher.");
      return;
    }
    setRequestedIds(prev => new Set(prev).add(id));
    joinClassroom.mutate({ classroomId: id }, {
      onSuccess: () => {
        toast.success("Join request sent successfully!");
      },
      onError: (err: any) => {
        setRequestedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        toast.error(err.response?.data?.message || "Failed to send request");
      }
    });
  };

  const gradients = [
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-purple-500 to-pink-600",
    "from-cyan-500 to-blue-600",
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Compass size={24} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Discover Classrooms</h1>
        </div>
        <p className="text-gray-500 text-lg">Find and join public classrooms across the network.</p>
      </div>

      {/* Search */}
      <div className="mb-8 relative max-w-2xl">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          <Search size={20} />
        </div>
        <Input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by subject, teacher, or classroom name..."
          className="w-full pl-10 h-14 text-lg bg-white border-gray-200 focus:border-indigo-500 rounded-xl shadow-sm"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <ClassroomCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classrooms.map((classroom) => {
            const isRequested = requestedIds.has(classroom._id) || classroom.membershipStatus === 'pending';
            const isMember = classroom.membershipStatus === 'approved';

            if (isMember) return null;

            return (
              <ClassroomCard 
                key={classroom._id}
                classroom={classroom as any}
                isTeacher={false}
                actionType={isRequested ? 'requested' : 'join'}
                onActionClick={() => !isRequested && handleRequestJoin(classroom._id, false)}
                isLoadingAction={joinClassroom.isPending}
              />
            );
          })}
          
          {classrooms.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No classrooms found</h3>
              <p>We couldn't find any public classrooms matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
