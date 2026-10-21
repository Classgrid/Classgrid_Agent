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
import { useParams } from 'react-router-dom';
import { ClassroomHeader } from '../components/ClassroomHeader';
import { ClassroomTabs } from '../components/ClassroomTabs';
import { StreamTab } from '../components/StreamTab';
import { MaterialsTab } from '../components/MaterialsTab';
import { StudentsTab } from '../components/StudentsTab';
import { ClassroomSettingsTab } from '../components/ClassroomSettingsTab';
import { ClassroomAITab } from '../components/ClassroomAITab';
import { ClassroomChatTab } from '../components/ClassroomChatTab';
import { QuizzesTab } from '../components/QuizzesTab';
import { useClassroomDetail } from '../queries/useClassroomDetail';
import { useCurrentUser } from '@/features/auth/queries/useCurrentUser';
import { Spinner } from "@/components/marketing_ui/spinner";
import { Button } from '@/components/marketing_ui/button';
import { AlertCircle, Lock, ShieldAlert, ArrowLeft, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ClassroomDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('stream');

  const { data: classroom, isLoading, isError, error, refetch } = useClassroomDetail(id);

  const { data: currentUser } = useCurrentUser();
  const navigate = useNavigate();
  
  // Use current user's role from auth state
  const isFacultyRole = ['teacher', 'faculty', 'org_admin', 'super_admin'].includes(currentUser?.role || '');
  const userRole: 'faculty' | 'student' = isFacultyRole ? 'faculty' : 'student';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Placeholder Header Skeleton */}
        <div className="bg-white border-b border-gray-200">
          <div className="h-32 bg-gray-200 animate-pulse w-full"></div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-end -mt-10">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-white p-1">
                <div className="h-full w-full bg-gray-200 animate-pulse rounded-lg"></div>
              </div>
              <div className="space-y-2 mt-10">
                <div className="h-6 w-48 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 w-32 bg-gray-200 animate-pulse rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    const err = error as any;
    const status = err?.response?.status;
    const isAccessDenied = status === 403;
    const isNotFound = status === 404;

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="h-16 w-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            {isAccessDenied ? (
              <Lock className="h-8 w-8 text-red-500" />
            ) : isNotFound ? (
              <ShieldAlert className="h-8 w-8 text-red-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-500" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isAccessDenied ? "Access Denied" : isNotFound ? "Classroom Not Found" : "Connection Error"}
          </h2>
          <p className="text-gray-500 mb-8">
            {isAccessDenied 
              ? "You don't have permission to view this classroom. You may need to join it first or wait for your request to be approved." 
              : isNotFound 
                ? "The classroom you are looking for does not exist or has been deleted."
                : "We encountered an error while loading the classroom. Please check your connection and try again."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
            </Button>
            {!isAccessDenied && !isNotFound && (
              <Button onClick={() => refetch()} className="w-full sm:w-auto">
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!classroom) return null;

  const isArchived = classroom.status === "archived";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {isArchived && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
          <div className="flex items-center justify-center gap-2 text-amber-800">
            <Archive className="h-5 w-5" />
            <p className="font-medium text-sm">
              This classroom is archived. It is in read-only mode and no new activity can be added.
            </p>
          </div>
        </div>
      )}

      {/* 1. Header (Banner, Title, Action Buttons) */}
      <ClassroomHeader 
        classroom={classroom} 
        userRole={userRole} 
      />

      {/* 2. Tabs (Stream, Materials, Students, Settings) */}
      <ClassroomTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        userRole={userRole}
      />

      {/* 3. Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'stream' ? (
          <StreamTab 
            classroomId={id} 
            userRole={userRole} 
            teacher={classroom.teacher} 
          />
        ) : activeTab === 'materials' ? (
          <MaterialsTab classroomId={id} userRole={userRole} />
        ) : activeTab === 'quizzes' ? (
          <QuizzesTab classroomId={id} userRole={userRole} />
        ) : activeTab === 'students' ? (
          <StudentsTab classroomId={id} userRole={userRole} />
        ) : activeTab === 'chat' ? (
          <ClassroomChatTab classroomId={id} userRole={userRole} />
        ) : activeTab === 'ai' ? (
          <ClassroomAITab
            classroomId={id || ''}
            classroomName={classroom.name || ''}
            classroomSubject={classroom.subject || ''}
          />
        ) : activeTab === 'settings' ? (
          <ClassroomSettingsTab classroomId={id} userRole={userRole} />
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center text-gray-500">
            <p>
              You are viewing the <strong>{activeTab}</strong> tab for classroom ID: <strong>{id}</strong>
            </p>
            <p className="mt-2 text-sm text-gray-400">
              This content area is currently unavailable.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomDetailPage;
