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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings, Save, AlertTriangle, Trash2 } from 'lucide-react';
import { useClassroomDetail } from '../queries/useClassroomDetail';
import { ClassroomCoverUpload } from './ClassroomCoverUpload';
import { classroomApi } from '../services/classroomApi';
import { Button } from '@/components/marketing_ui/button';
import { Input } from '@/components/marketing_ui/input';
import { Textarea } from '@/components/marketing_ui/textarea';
import { Switch } from '@/components/marketing_ui/switch';
import { Spinner } from '@/components/marketing_ui/spinner';
import { useNavigate } from 'react-router-dom';

interface ClassroomSettingsTabProps {
  classroomId: string | undefined;
  userRole: 'faculty' | 'student';
}

export const ClassroomSettingsTab: React.FC<ClassroomSettingsTabProps> = ({ classroomId, userRole }) => {
  const { data: classroomData, isLoading } = useClassroomDetail(classroomId);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [maxStudents, setMaxStudents] = useState<number | ''>('');
  const [allowJoinRequests, setAllowJoinRequests] = useState(true);

  // Initialize form with data once loaded
  useEffect(() => {
    if (classroomData?.classroom) {
      const c = classroomData.classroom;
      setName(c.name || '');
      setSubject(c.subject || '');
      setDescription(c.description || '');
      setMaxStudents(c.settings?.maxStudents || '');
      setAllowJoinRequests(c.settings?.allowJoinRequests ?? true);
    }
  }, [classroomData]);

  const updateMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      if (!classroomId) throw new Error('ClassroomId missing');
      return await classroomApi.updateClassroom(classroomId, updatedData);
    },
    onSuccess: () => {
      toast.success('Settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['classrooms', classroomId] });
      queryClient.invalidateQueries({ queryKey: ['classrooms'] }); // Refresh lists
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update settings');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!classroomId) throw new Error('ClassroomId missing');
      return await classroomApi.deleteClassroom(classroomId);
    },
    onSuccess: () => {
      toast.success('Classroom deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      navigate('/app/classrooms');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete classroom');
    }
  });

  const hasChanges = () => {
    if (!classroomData?.classroom) return false;
    const c = classroomData.classroom;
    return (
      name !== (c.name || '') ||
      subject !== (c.subject || '') ||
      description !== (c.description || '') ||
      maxStudents !== (c.settings?.maxStudents || '') ||
      allowJoinRequests !== (c.settings?.allowJoinRequests ?? true)
    );
  };

  const handleSave = () => {
    if (!name.trim() || !subject.trim()) {
      toast.error('Name and Subject are required fields.');
      return;
    }
    
    updateMutation.mutate({
      name,
      subject,
      description,
      settings: {
        maxStudents: maxStudents === '' ? null : Number(maxStudents),
        allowJoinRequests
      }
    });
  };

  const handleDelete = () => {
    if (window.confirm('Are you absolutely sure you want to delete this classroom? This action cannot be undone and will remove all students, materials, and data.')) {
      deleteMutation.mutate();
    }
  };

  if (userRole !== 'faculty') {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-center p-8 bg-white border border-gray-200 rounded-xl">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-4" />
        <h3 className="text-xl font-bold text-gray-900">Access Denied</h3>
        <p className="text-gray-500 mt-2">Only faculty members can access classroom settings.</p>
      </div>
    );
  }

  if (isLoading || !classroomData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8 animate-in fade-in duration-300">
      
      {/* Settings Form */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <Settings size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">General Settings</h2>
            <p className="text-sm text-gray-500">Manage your classroom's core details and preferences.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {classroomId && (
            <ClassroomCoverUpload 
              classroomId={classroomId} 
              currentCoverImage={classroomData?.classroom?.coverImage} 
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Classroom Name <span className="text-red-500">*</span></label>
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Data Structures & Algorithms"
                className="bg-white border-gray-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Subject <span className="text-red-500">*</span></label>
              <Input 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Computer Science"
                className="bg-white border-gray-200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of this classroom and its goals..."
              className="bg-white border-gray-200 min-h-[100px] resize-y"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Maximum Students</label>
              <Input 
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(e.target.value ? Number(e.target.value) : '')}
                placeholder="Leave blank for unlimited"
                className="bg-white border-gray-200"
                min={1}
              />
              <p className="text-xs text-gray-500">Cap the number of students who can join.</p>
            </div>
            
            <div className="flex flex-col justify-center pt-2">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl bg-gray-50/30">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Allow Join Requests</h4>
                  <p className="text-xs text-gray-500 mt-1">Let students search and request to join.</p>
                </div>
                <Switch 
                  checked={allowJoinRequests}
                  onCheckedChange={setAllowJoinRequests}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges() || updateMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2"><Spinner className="h-4 w-4" /> Saving...</span>
            ) : (
              <span className="flex items-center gap-2"><Save size={16} /> Save Changes</span>
            )}
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div>
            <h3 className="text-lg font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle size={20} />
              Danger Zone
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Permanently delete this classroom and all its data. This action is irreversible. Students will lose access immediately.
            </p>
          </div>
          
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="shrink-0 w-full sm:w-auto"
          >
            {deleteMutation.isPending ? 'Deleting...' : (
              <span className="flex items-center gap-2"><Trash2 size={16} /> Delete Classroom</span>
            )}
          </Button>
        </div>
      </div>

    </div>
  );
};
