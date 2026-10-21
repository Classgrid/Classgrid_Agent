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

import { Input } from "@/components/marketing_ui/input";
import React, { useState } from "react";
import { 
    Calendar, 
    FileText, 
    Activity, 
    CheckCircle2, 
    Clock, 
    XCircle,
    Plus,
    Send
} from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { 
    useGetStudentAttendancePercentage,
    useGetStudentLeaveHistory,
    useApplyForLeave
} from "../queries/useAttendance";

export default function StudentLeavePortal() {
    // Hardcoded IDs for demo purposes
    const studentId = "current_student_123";
    const hierarchyId = "batch_computer_science_2023";

    // Queries
    const { data: attendanceData, isLoading: loadingStats } = useGetStudentAttendancePercentage(studentId, hierarchyId);
    const { data: leaveHistory, isLoading: loadingHistory } = useGetStudentLeaveHistory(studentId);

    // Mutations
    const { mutate: applyLeave, isPending: isApplying } = useApplyForLeave();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        startDate: "",
        endDate: "",
        reason: ""
    });

    const percentage = attendanceData?.percentage || 0;
    
    // Determine ring color based on percentage
    let ringColor = "stroke-emerald-500";
    let glowColor = "rgba(16,185,129,0.5)"; // emerald
    if (percentage < 75) {
        ringColor = "stroke-rose-500";
        glowColor = "rgba(244,63,94,0.5)"; // rose
    } else if (percentage < 85) {
        ringColor = "stroke-amber-500";
        glowColor = "rgba(245,158,11,0.5)"; // amber
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyLeave({
            hierarchyId,
            startDate: formData.startDate,
            endDate: formData.endDate,
            reason: formData.reason
        }, {
            onSuccess: () => {
                setIsModalOpen(false);
                setFormData({ startDate: "", endDate: "", reason: "" });
            }
        });
    };

    return (
        <div className="min-h-screen bg-background dark:bg-[#0A0A0B] text-foreground dark:text-slate-200 p-8 font-sans selection:bg-emerald-500/30">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-12">
                <div>
                    <h1 className="text-3xl font-bold text-foreground dark:text-white tracking-tight">Attendance & Leaves</h1>
                    <p className="text-sm text-slate-400 mt-1">Track your attendance and manage your leave requests.</p>
                </div>
                <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-sm px-6 py-2.5 rounded-xl transition shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Apply for Leave
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT COLUMN: Glowing Attendance Ring */}
                <div className="lg:col-span-1">
                    <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-8 backdrop-blur-xl relative flex flex-col items-center justify-center text-center overflow-hidden h-full min-h-[400px]">
                        
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"  />

                        <h2 className="text-lg font-semibold text-foreground dark:text-white mb-8 flex items-center gap-2 z-10">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            Overall Attendance
                        </h2>

                        {loadingStats ? (
                            <div className="text-slate-500 z-10">Calculating stats...</div>
                        ) : (
                            <div className="relative w-48 h-48 mb-8 z-10">
                                {/* SVG Progress Ring */}
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background Track */}
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="transparent" 
                                        className="stroke-white/10" 
                                        strokeWidth="8" 
                                    />
                                    {/* Progress Ring */}
                                    <circle 
                                        cx="50" cy="50" r="45" 
                                        fill="transparent" 
                                        className={`${ringColor} transition-all duration-1000 ease-out`}
                                        strokeWidth="8" 
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 45}`}
                                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
                                        
                                    />
                                </svg>
                                
                                {/* Inner Text */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-5xl font-black text-foreground dark:text-white tracking-tighter">{percentage}%</span>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 w-full z-10">
                            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Attended</p>
                                <p className="text-2xl font-bold text-foreground dark:text-white">{attendanceData?.present || 0}</p>
                            </div>
                            <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 border border-black/5 dark:border-white/5">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Missed</p>
                                <p className="text-2xl font-bold text-foreground dark:text-white">{attendanceData?.absent || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Leave History */}
                <div className="lg:col-span-2">
                    <div className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 backdrop-blur-xl h-full flex flex-col">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-emerald-400" />
                                Leave Application History
                            </h2>
                        </div>

                        {loadingHistory ? (
                            <div className="flex-1 flex items-center justify-center text-slate-500">Loading history...</div>
                        ) : leaveHistory?.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 border-dashed">
                                <FileText className="w-12 h-12 mb-4 opacity-50" />
                                <p>You haven't applied for any leaves yet.</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto rounded-2xl border border-black/10 dark:border-white/10 bg-muted dark:bg-black/20">
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-muted dark:bg-[#1A1C20] border-b border-black/10 dark:border-white/10 z-10">
                                        <tr>
                                            <th className="py-4 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Duration</th>
                                            <th className="py-4 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Reason</th>
                                            <th className="py-4 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider">Applied On</th>
                                            <th className="py-4 px-6 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {leaveHistory?.map((leave: any) => (
                                            <tr key={leave._id} className="hover:bg-black/5 dark:bg-white/5 transition-colors">
                                                <td className="py-4 px-6 whitespace-nowrap">
                                                    <p className="text-sm font-semibold text-foreground dark:text-slate-200">
                                                        {new Date(leave.start_date).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1">to {new Date(leave.end_date).toLocaleDateString()}</p>
                                                </td>
                                                <td className="py-4 px-6">
                                                    <p className="text-sm text-slate-300 line-clamp-2 max-w-xs">{leave.reason}</p>
                                                    {leave.admin_remarks && (
                                                        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> {leave.admin_remarks}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 whitespace-nowrap text-sm text-slate-400">
                                                    {new Date(leave.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 px-6 whitespace-nowrap text-right">
                                                    {leave.status === 'pending' && (
                                                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                                                            <Clock className="w-3.5 h-3.5" /> Pending
                                                        </span>
                                                    )}
                                                    {leave.status === 'approved' && (
                                                        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                                                        </span>
                                                    )}
                                                    {leave.status === 'rejected' && (
                                                        <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-semibold">
                                                            <XCircle className="w-3.5 h-3.5" /> Rejected
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Custom Tailwind Modal for Applying Leave */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-muted dark:bg-[#1A1C20] border border-black/10 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                        
                        <div className="p-6 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground dark:text-white">Apply for Leave</h2>
                            <Button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-foreground dark:text-white transition">
                                <XCircle className="w-6 h-6" />
                            </Button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Start Date</label>
                                    <Input 
                                        type="date" 
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                        className="w-full bg-muted dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-foreground dark:text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">End Date</label>
                                    <Input 
                                        type="date" 
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                        className="w-full bg-muted dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-foreground dark:text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reason for Leave</label>
                                <textarea 
                                    required
                                    rows={4}
                                    placeholder="Please provide a detailed reason..."
                                    value={formData.reason}
                                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                    className="w-full bg-muted dark:bg-black/50 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-foreground dark:text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition resize-none"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button 
                                    type="button" 
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-foreground dark:text-white font-semibold py-3 rounded-xl transition"
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={isApplying}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isApplying ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit Request</>}
                                </Button>
                            </div>
                        </form>

                    </div>
                </div>
            )}
        </div>
    );
}
