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

import React, { useState, useCallback, useEffect } from "react";
import { X, Book, Users, TreePine } from "lucide-react";
import { useCreateClassroom } from "../queries/useCreateClassroom";
import { useTerminology } from "../hooks/useTerminology";
import { HierarchySelector } from "./HierarchySelector";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { apiClient } from "@/lib/apiClient";

type CreateClassroomModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

interface CourseSubject {
  id: string;
  subject_name: string;
  subject_code?: string;
  semester?: number;
}

export function CreateClassroomModal({ isOpen, onClose }: CreateClassroomModalProps) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [maxStudents, setMaxStudents] = useState("200");
  const [allowRequests, setAllowRequests] = useState(true);

  // Hierarchy-driven fields
  const [divisionId, setDivisionId] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<CourseSubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const { mutate: createClassroom, isPending } = useCreateClassroom();
  const { data: termData } = useTerminology();
  const subjectLabel = termData?.terminology?.subject || "Subject";

  // Fetch subjects when division is selected
  useEffect(() => {
    if (!divisionId) {
      setAvailableSubjects([]);
      setSubjectId(null);
      return;
    }

    let cancelled = false;
    setIsLoadingSubjects(true);

    // Fetch courses for this org, then get subjects from the first course
    // The course.routes.js GET / returns all courses for the org
    apiClient.get<{ courses: Array<{ id: string; subject_count: number }> }>("/api/courses")
      .then(async (res) => {
        if (cancelled) return;
        const courses = res.data.courses || [];
        if (courses.length === 0) {
          setAvailableSubjects([]);
          setIsLoadingSubjects(false);
          return;
        }

        // Fetch subjects from all courses and flatten
        const allSubjects: CourseSubject[] = [];
        for (const course of courses) {
          try {
            const detail = await apiClient.get<{ subjects: CourseSubject[] }>(`/api/courses/${course.id}`);
            if (!cancelled && detail.data.subjects) {
              allSubjects.push(...detail.data.subjects);
            }
          } catch {
            // Skip courses that fail
          }
        }

        if (!cancelled) {
          // Deduplicate by subject name
          const seen = new Set<string>();
          const unique = allSubjects.filter(s => {
            const key = s.subject_name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setAvailableSubjects(unique);
          setIsLoadingSubjects(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableSubjects([]);
          setIsLoadingSubjects(false);
        }
      });

    return () => { cancelled = true; };
  }, [divisionId]);

  const handleDivisionSelect = useCallback((id: string | null) => {
    setDivisionId(id);
    setSubjectId(null);
    setSubject("");
  }, []);

  const handleSubjectSelect = (subId: string) => {
    setSubjectId(subId);
    const found = availableSubjects.find(s => s.id === subId);
    if (found) {
      setSubject(found.subject_name);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createClassroom(
      {
        name,
        subject,
        description,
        division_id: divisionId || undefined,
        subject_id: subjectId || undefined,
        settings: {
          maxStudents: parseInt(maxStudents) || 200,
          allowJoinRequests: allowRequests,
        },
      },
      {
        onSuccess: () => {
          onClose();
          setName("");
          setSubject("");
          setDescription("");
          setDivisionId(null);
          setSubjectId(null);
          setAvailableSubjects([]);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Create Classroom</h2>
            <p className="text-sm text-muted-foreground mt-1">Set up a new digital learning space.</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={20} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Hierarchy Selector (Smart Picker) ── */}
          <div className="space-y-2 p-4 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <TreePine size={16} className="text-primary" />
              <span className="text-sm font-semibold text-foreground">Select Your {termData?.terminology?.division || "Division"}</span>
              <span className="text-xs text-muted-foreground">(Optional)</span>
            </div>
            <HierarchySelector onDivisionSelect={handleDivisionSelect} />
          </div>

          {/* ── Subject Picker (from course_subjects if hierarchy selected, else manual) ── */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">{subjectLabel} *</label>
            {divisionId && availableSubjects.length > 0 ? (
              <Select value={subjectId || ""} onValueChange={handleSubjectSelect}>
                <SelectTrigger className="w-full bg-background border-border">
                  <SelectValue placeholder={`Pick a ${subjectLabel}`} />
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-[220px] overflow-y-auto pr-1">
                    {availableSubjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.subject_name}{s.subject_code ? ` (${s.subject_code})` : ""}
                      </SelectItem>
                    ))}
                  </div>
                </SelectContent>
              </Select>
            ) : (
              <div className="relative">
                <Book className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="text"
                  required
                  placeholder={isLoadingSubjects ? "Loading subjects..." : `e.g. Data Structures`}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isLoadingSubjects}
                  className="w-full rounded-md border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* ── Classroom Name ── */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Classroom Name *</label>
            <Input
              type="text"
              required
              placeholder="e.g. Data Structures & Algorithms A1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* ── Description ── */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description (Optional)</label>
            <textarea
              placeholder="Brief overview of what this class covers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px] resize-none"
            />
          </div>

          {/* ── Settings Row ── */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max Students</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  type="number"
                  min="1"
                  max="500"
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(e.target.value)}
                  className="w-full rounded-md border border-border bg-background pl-10 pr-4 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <Input
                  type="checkbox"
                  checked={allowRequests}
                  onChange={(e) => setAllowRequests(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground">Allow Join Requests</span>
              </label>
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name || !subject}>
              {isPending ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" /> Creating...
                </>
              ) : (
                "Create Classroom"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
