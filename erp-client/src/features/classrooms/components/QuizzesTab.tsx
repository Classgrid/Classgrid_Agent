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
import { HelpCircle, Plus } from 'lucide-react';
import { useClassroomContent } from '../queries/useClassroomContent';
import { EmptyState } from './EmptyState';
import { Spinner } from '@/components/marketing_ui/spinner';
import { Button } from '@/components/marketing_ui/button';
import { ClassroomContent } from '../types/classroom.types';

interface QuizzesTabProps {
  classroomId: string | undefined;
  userRole: 'faculty' | 'student';
}

export const QuizzesTab: React.FC<QuizzesTabProps> = ({ classroomId, userRole }) => {
  const { data, isLoading } = useClassroomContent(classroomId, 'quiz');
  const quizzes: ClassroomContent[] = data?.data || [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Top Action Bar */}
      {userRole === 'faculty' && (
        <div className="flex justify-end mb-6">
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} />
            Create Quiz
          </Button>
        </div>
      )}

      {/* Content Area */}
      {quizzes.length === 0 ? (
        <EmptyState 
          icon={HelpCircle}
          title="No quizzes yet"
          description="Assignments, tests, and quizzes will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id || quiz._id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-lg mb-2">{quiz.title || 'Untitled Quiz'}</h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">{quiz.description || 'No description provided.'}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-medium text-gray-400">
                  {new Date(quiz.created_at || new Date()).toLocaleDateString()}
                </span>
                <Button variant="outline" size="sm">
                  {userRole === 'faculty' ? 'View Results' : 'Take Quiz'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
