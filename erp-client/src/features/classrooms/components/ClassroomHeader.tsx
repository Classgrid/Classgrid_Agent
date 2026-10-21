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
import { Settings, LogOut, MoreHorizontal, Copy, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Classroom } from '../types/classroom.types';

interface ClassroomHeaderProps {
  classroom?: Classroom;
  userRole: 'faculty' | 'student';
}

export const ClassroomHeader: React.FC<ClassroomHeaderProps> = ({ classroom, userRole }) => {
  // Fallback gradient if no cover image
  const defaultGradient = 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500';

  const copyToClipboard = () => {
    const code = classroom?.classCode || (classroom as any)?.code;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success('Class code copied to clipboard!');
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="w-full bg-white border-b border-gray-200">
      {/* Cover Banner */}
      <div className="relative w-full h-48 sm:h-56 lg:h-64">
        {classroom?.coverImage ? (
          <>
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${classroom.coverImage})` }}
            />
            {/* Gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
          </>
        ) : (
          <div className={`absolute inset-0 ${defaultGradient}`} />
        )}
        
        {/* Banner Content (Absolute positioned at the bottom) */}
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight truncate drop-shadow-md">
                {classroom?.name || 'Classroom Name'}
              </h1>
              <p className="mt-2 text-lg text-gray-200 font-medium truncate drop-shadow-sm">
                {classroom?.subject || (classroom as any)?.branch || 'General Subject'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action Bar / Info Bar below banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Left Info: Teacher and Badges */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Teacher Info */}
            <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
              {classroom?.teacher?.profilePicture ? (
                <img 
                  src={classroom.teacher.profilePicture} 
                  alt={classroom?.teacher?.name || 'Teacher'} 
                  className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center border-2 border-white shadow-sm">
                  {getInitials(classroom?.teacher?.name)}
                </div>
              )}
              <span className="text-sm font-medium text-gray-700">
                {classroom?.teacher?.name || 'Unknown Teacher'}
              </span>
            </div>

            {/* Class Code Badge */}
            <button
              onClick={copyToClipboard}
              className="group flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-mono font-medium transition-all duration-200 ease-in-out cursor-pointer active:scale-95"
              title="Copy Class Code"
            >
              {classroom?.classCode || (classroom as any)?.code || 'CODE'}
              <Copy className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>

            {/* Member Count Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
              <Users className="h-4 w-4" />
              <span>{classroom?.memberCount || (classroom as any)?.membersCount || 0} Members</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {userRole === 'faculty' ? (
              <button
                type="button"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:text-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-95 duration-200"
              >
                <Settings className="-ml-1 mr-2 h-4 w-4 text-gray-400 group-hover:text-indigo-500" aria-hidden="true" />
                <span>Settings</span>
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 active:scale-95 transition-all duration-200"
              >
                <LogOut className="-ml-1 mr-2 h-4 w-4 text-red-400" aria-hidden="true" />
                <span>Leave</span>
              </button>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center px-2 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 active:scale-95 transition-all duration-200"
            >
              <MoreHorizontal className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
