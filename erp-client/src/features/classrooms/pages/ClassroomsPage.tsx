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

import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {  Plus, Search, BookOpen, Clock, Users } from "lucide-react";


import { useMyClassrooms, MyClassroomRecord } from "../queries/useMyClassrooms";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { CreateClassroomModal } from "../components/CreateClassroomModal";
import { JoinClassroomModal } from "../components/JoinClassroomModal";
import { ClassroomCard, ClassroomCardSkeleton } from "../components/ClassroomCard";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";

export function ClassroomsPage() {
  const { data: user } = useCurrentUser();
  const { data: classroomsData, isLoading } = useMyClassrooms();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const classrooms = classroomsData?.classrooms ?? [];

  const filteredClassrooms = useMemo(() => {
    if (!search.trim()) return classrooms;
    const lowerSearch = search.toLowerCase();
    return classrooms.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerSearch) ||
        c.subject?.toLowerCase().includes(lowerSearch) ||
        c.teacher?.name.toLowerCase().includes(lowerSearch)
    );
  }, [classrooms, search]);

  const isTeacher = user?.role === "teacher" || user?.role === "faculty" || user?.role === "org_admin" || user?.role === "super_admin";

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto pb-12 mt-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <ClassroomCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className=" max-w-7xl mx-auto pb-12">
      <div
        title="My Classrooms"
        description={
          isTeacher
            ? "Manage your active classes, view students, and handle join requests."
            : "Access your enrolled classes, assignments, and study materials."
        }
        actions={
          <div className="flex items-center gap-3">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search classrooms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
            </div>
            <div 
              onClick={() => isTeacher ? setIsCreateModalOpen(true) : setIsJoinModalOpen(true)}
              className="flex items-center cursor-pointer hover:text-primary transition-colors font-medium"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isTeacher ? "Create Class" : "Join Class"}
            </div>
          </div>
        }
      />

      {filteredClassrooms.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground">No Classrooms Found</h3>
          <p className="mt-2 text-muted-foreground max-w-sm">
            {isTeacher
              ? "You haven't created any classrooms yet. Create your first class to start teaching."
              : "You haven't joined any classrooms yet. Click 'Join Class' to enter a class code."}
          </p>
          {isTeacher ? (
            <Button 
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus size={16} />
              Create Class
            </Button>
          ) : (
            <div 
              className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
              onClick={() => setIsJoinModalOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Join Class
            </div>
          )}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredClassrooms.map((classroom) => (
            <Link 
              key={classroom._id} 
              to={`/classroom/${classroom._id}`} 
              className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            >
              <ClassroomCard 
                classroom={classroom as any} 
                isTeacher={isTeacher} 
                actionType="enter" 
              />
            </Link>
          ))}
        </div>
      )}

      <CreateClassroomModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
      
      <JoinClassroomModal 
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />
    </div>
  );
}

