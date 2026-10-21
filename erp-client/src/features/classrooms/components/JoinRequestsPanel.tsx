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
import { Check, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { classroomApi } from '../services/classroomApi';
import { ClassroomMember } from '../types/classroom.types';
import { Button } from '@/components/marketing_ui/button';

interface JoinRequestsPanelProps {
  requests: ClassroomMember[];
  classroomId: string;
}

export const JoinRequestsPanel: React.FC<JoinRequestsPanelProps> = ({ requests, classroomId }) => {
  const queryClient = useQueryClient();

  const respondMutation = useMutation({
    mutationFn: ({ requestId, action }: { requestId: string; action: 'approved' | 'rejected' }) => 
      classroomApi.respondToRequest(classroomId, requestId, action),
    onSuccess: (_, variables) => {
      toast.success(`Request ${variables.action === 'approved' ? 'approved' : 'rejected'}`);
      queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId, 'members'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update request');
    }
  });

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  if (requests.length === 0) return null;

  return (
    <div className="mb-8 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          Pending Join Requests
          <span className="bg-amber-100 text-amber-700 text-xs py-0.5 px-2 rounded-full font-medium">
            {requests.length}
          </span>
        </h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {requests.map((request) => (
          <div key={request._id} className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {request.student.profilePicture ? (
                <img 
                  src={request.student.profilePicture} 
                  alt={request.student.name} 
                  className="h-10 w-10 rounded-full object-cover border border-gray-200 shrink-0"
                />
              ) : (
                <div className="h-10 w-10 bg-indigo-100 text-indigo-700 font-bold rounded-full flex items-center justify-center border border-indigo-200 shrink-0">
                  {getInitials(request.student.name)}
                </div>
              )}
              
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-gray-900 truncate">{request.student.name}</h4>
                <p className="text-sm text-gray-500 truncate">{request.student.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => respondMutation.mutate({ requestId: request._id, action: 'rejected' })}
                disabled={respondMutation.isPending}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <X size={16} className="mr-1 hidden sm:block" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => respondMutation.mutate({ requestId: request._id, action: 'approved' })}
                disabled={respondMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Check size={16} className="mr-1 hidden sm:block" />
                Accept
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
