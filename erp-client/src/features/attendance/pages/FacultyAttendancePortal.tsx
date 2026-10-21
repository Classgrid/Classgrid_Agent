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

import React, { useState } from "react";
import { 
    Users, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    AlertTriangle,
    Check,
    X,
    Save,
    CalendarClock,
    ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { 
    useGetBatchAttendanceReport, 
    useGetPendingLeaveRequests,
    useSubmitDailyAttendance,
    useProcessLeaveRequest
} from "../queries/useAttendance";

// Mock student roster for the fast-entry table demo
const MOCK_ROSTER = [
    { _id: "s1", name: "Aarav Sharma", prn: "CS2023001" },
    { _id: "s2", name: "Priya Patel", prn: "CS2023002" },
    { _id: "s3", name: "Rahul Verma", prn: "CS2023003" },
    { _id: "s4", name: "Neha Singh", prn: "CS2023004" },
    { _id: "s5", name: "Vikram Malhotra", prn: "CS2023005" },
];

export default function FacultyAttendancePortal() {
    // Hardcoded DNA node for demo purposes
    const hierarchyId = "batch_computer_science_2023";
    const today = new Date().toISOString().split('T')[0];

    // Queries
    const { data: report, isLoading: loadingReport } = useGetBatchAttendanceReport(hierarchyId, today);
    const { data: pendingLeaves, isLoading: loadingLeaves } = useGetPendingLeaveRequests(hierarchyId);
    
    // Mutations
    const { mutate: submitAttendance, isPending: isSubmitting } = useSubmitDailyAttendance();
    const { mutate: processLeave } = useProcessLeaveRequest();

    // Fast-entry State (defaults everyone to 'present')
    const [attendanceState, setAttendanceState] = useState<Record<string, 'present'|'absent'|'leave'|'late'>>(
        MOCK_ROSTER.reduce((acc, student) => ({ ...acc, [student._id]: 'present' }), {})
    );

    const handleMark = (studentId: string, status: 'present'|'absent'|'leave'|'late') => {
        setAttendanceState(prev => ({ ...prev, [studentId]: status }));
    };

    const handleSaveRegister = () => {
        const studentRecordsArray = Object.entries(attendanceState).map(([student_id, status]) => ({
            student_id,
            status
        }));

        submitAttendance({
            hierarchyId,
            date: today,
            sessionType: 'full_day',
            studentRecordsArray
        });
    };

    const handleProcessLeave = (leaveRequestId: string, status: 'approved' | 'rejected') => {
        processLeave({
            leaveRequestId,
            status,
            remarks: `Processed by faculty on ${new Date().toLocaleDateString()}`
        });
    };

    return (
        <div className="min-h-screen bg-background dark:bg-[#0A0A0B] text-foreground dark:text-slate-200 p-8 font-sans selection:bg-emerald-500/30">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">Attendance & Leave Control</h1>
                    <p className="text-sm text-slate-400 mt-1">Manage daily registers and approve student leaves instantly.</p>
                </div>
                <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 rounded-full">
                    <CalendarClock className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-medium">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: Dashboard Stats & Pending Leaves */}
                <div className="xl:col-span-1 space-y-8">
                    
                    {/* BENTO GRID: Today's Snapshot */}
                    <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                        
                        <h2 className="text-lg font-semibold text-foreground dark:text-white mb-6 flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-400" />
                            Today's Snapshot
                        </h2>
                        
                        {loadingReport ? (
                            <div className="h-32 flex items-center justify-center text-slate-500">Loading stats...</div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Total</p>
                                    <p className="text-3xl font-bold text-foreground dark:text-white">{report?.stats?.total || 0}</p>
                                </div>
                                <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20">
                                    <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider mb-1">Present</p>
                                    <p className="text-3xl font-bold text-emerald-400">{report?.stats?.present || 0}</p>
                                </div>
                                <div className="bg-rose-500/10 rounded-2xl p-4 border border-rose-500/20">
                                    <p className="text-xs text-rose-400 font-medium uppercase tracking-wider mb-1">Absent</p>
                                    <p className="text-3xl font-bold text-rose-400">{report?.stats?.absent || 0}</p>
                                </div>
                                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
                                    <p className="text-xs text-amber-400 font-medium uppercase tracking-wider mb-1">On Leave</p>
                                    <p className="text-3xl font-bold text-amber-400">{report?.stats?.leave || 0}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* LEAVE WORKFLOW QUEUE */}
                    <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                                Leave Requests
                            </h2>
                            {pendingLeaves?.length > 0 && (
                                <span className="bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-1 rounded-md">
                                    {pendingLeaves.length} Pending
                                </span>
                            )}
                        </div>

                        {loadingLeaves ? (
                            <div className="text-sm text-slate-500 text-center py-4">Loading queue...</div>
                        ) : pendingLeaves?.length === 0 ? (
                            <div className="text-sm text-slate-500 text-center py-8 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 border-dashed">
                                No pending leave requests! 🎉
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pendingLeaves?.map((leave: any) => (
                                    <div key={leave._id} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 transition hover:bg-black/10 dark:hover:bg-white/10">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="text-sm font-semibold text-foreground dark:text-white">{leave.student_id?.name || 'Unknown Student'}</p>
                                                <p className="text-xs text-slate-400">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-300 bg-muted/50 dark:bg-black/30 p-2 rounded-lg border border-black/5 dark:border-white/5 mb-4 line-clamp-2">
                                            "{leave.reason}"
                                        </p>
                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={() => handleProcessLeave(leave._id, 'approved')}
                                                className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1"
                                            >
                                                <Check className="w-3 h-3" /> Approve
                                            </Button>
                                            <Button 
                                                onClick={() => handleProcessLeave(leave._id, 'rejected')}
                                                className="flex-1 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold py-2 rounded-xl transition flex items-center justify-center gap-1"
                                            >
                                                <X className="w-3 h-3" /> Reject
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Fast-Entry Register */}
                <div className="xl:col-span-2">
                    <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 backdrop-blur-xl h-full flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
                                    <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                                    Daily Fast-Entry Register
                                </h2>
                                <p className="text-xs text-slate-400 mt-1">Click a status to toggle instantly. No lag.</p>
                            </div>
                            <Button 
                                onClick={handleSaveRegister}
                                disabled={isSubmitting}
                                className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm px-6 py-2.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {isSubmitting ? 'Saving...' : 'Save Register'}
                            </Button>
                        </div>

                        <div className="flex-1 overflow-auto rounded-2xl border border-black/10 dark:border-white/10 bg-muted dark:bg-black/20">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-muted dark:bg-[#1A1C20] border-b border-black/10 dark:border-white/10 z-10">
                                    <tr>
                                        <th className="py-4 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Student Name</th>
                                        <th className="py-4 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider w-1/2 text-center">Status Toggle</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {MOCK_ROSTER.map((student) => {
                                        const status = attendanceState[student._id];
                                        return (
                                            <tr key={student._id} className="hover:bg-black/5 dark:bg-white/5 transition-colors group">
                                                <td className="py-4 px-6">
                                                    <p className="text-sm font-semibold text-foreground dark:text-slate-200">{student.name}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{student.prn}</p>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button 
                                                            onClick={() => handleMark(student._id, 'present')}
                                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                                                                status === 'present' 
                                                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                                                                    : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" /> P
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleMark(student._id, 'absent')}
                                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                                                                status === 'absent' 
                                                                    ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]' 
                                                                    : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <XCircle className="w-3 h-3" /> A
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleMark(student._id, 'late')}
                                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 border ${
                                                                status === 'late' 
                                                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]' 
                                                                    : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-500 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            <Clock className="w-3 h-3" /> L
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
