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
import React, { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Trash2, CheckCircle2, Clock, XCircle, AlertCircle, Plus, Search, Send, Mail, Bell, FileText, BarChart3, BookOpen, GraduationCap, ArrowRight, Video, Presentation, MonitorPlay, Link2, Copy, ExternalLink, Repeat } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Badge } from "@/components/marketing_ui/badge";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { getSocket } from "@/lib/socketClient";
import { repeatLabel, type ScheduleRepeat } from "./scheduleRepeat";
import { useNavigate, useLocation } from "react-router-dom";

type ScheduleStatus = "pending" | "sent" | "failed" | "cancelled";

interface AiSchedule extends ScheduleRepeat {
  _id: string;
  title: string;
  description: string;
  summary?: string;
  action_info?: string;
  email_subject?: string;
  email_body?: string;
  scheduled_at: string;
  status: ScheduleStatus;
  error_message?: string;
  created_at: string;
  createdAt?: string;
}

interface ScheduleSuggestion {
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

const SCHEDULE_SUGGESTIONS: ScheduleSuggestion[] = [
  {
    icon: <Mail className="w-5 h-5 text-blue-500" />,
    title: "Daily summary email",
    description: "Get a daily email with your assignments, attendance, and upcoming deadlines",
    prompt: "Schedule a daily summary email for me every morning at 8 AM with my pending assignments, attendance status, and any upcoming deadlines for the week."
  },
  {
    icon: <Bell className="w-5 h-5 text-amber-500" />,
    title: "Assignment deadline reminder",
    description: "Get reminders before your assignment deadlines so you never miss one",
    prompt: "Remind me 1 day before every assignment deadline. Send me an email with the assignment name, subject, and due date."
  },
  {
    icon: <BarChart3 className="w-5 h-5 text-violet-500" />,
    title: "Weekly progress report",
    description: "Receive a weekly report summarizing your academic progress and attendance",
    prompt: "Schedule a weekly progress report email every Sunday at 6 PM summarizing my attendance percentage, completed assignments, and upcoming exams for the next week."
  },
  {
    icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
    title: "Exam prep reminders",
    description: "Get study reminders a few days before each exam with key topics",
    prompt: "Remind me 3 days before every exam. Include the exam name, subject, syllabus topics, and suggested study resources."
  },
  {
    icon: <FileText className="w-5 h-5 text-rose-500" />,
    title: "Fee payment reminder",
    description: "Never miss a fee payment deadline with timely reminders",
    prompt: "Schedule a reminder email 3 days before my next fee payment due date with the amount, due date, and payment link."
  },
  {
    icon: <GraduationCap className="w-5 h-5 text-cyan-500" />,
    title: "Class schedule briefing",
    description: "Get your daily class timetable emailed to you every morning",
    prompt: "Send me my class timetable every morning at 7:30 AM with the subject, teacher name, and room number for each class."
  }
];

const INTEGRATION_SUGGESTIONS: ScheduleSuggestion[] = [
  {
    icon: <img src="https://cdn.classgrid.in/classgrid_intgration/Google_Meet_icon_(2026).svg" alt="Google Meet" className="w-5 h-5 object-contain" />,
    title: "Google Meet",
    description: "Schedule a Google Meet and automatically invite participants",
    prompt: "Schedule a Google Meet for [Date/Time] about [Topic] and invite [Emails]."
  },
  {
    icon: <img src="https://cdn.classgrid.in/classgrid_intgration/zoom-communications-icon_(1).svg" alt="Zoom" className="w-5 h-5 object-contain" />,
    title: "Zoom Meeting",
    description: "Create a Zoom meeting link and share it with your class",
    prompt: "Schedule a Zoom meeting for [Date/Time] about [Topic] and send the link to my class."
  },
  {
    icon: <img src="https://cdn.classgrid.in/classgrid_intgration/Google_Classroom_Logo.svg" alt="Google Classroom" className="w-5 h-5 object-contain" />,
    title: "Google Classroom",
    description: "Post an announcement or assignment directly to Google Classroom",
    prompt: "Post an announcement in my Google Classroom about [Topic]."
  },
  {
    icon: <img src="https://cdn.classgrid.in/classgrid_intgration/slack-new-logo-logo-svgrepo-com.svg" alt="Slack" className="w-5 h-5 object-contain" />,
    title: "Slack",
    description: "Schedule an automated message to a Slack channel",
    prompt: "Schedule a message to my Slack #general channel every Monday morning."
  },
  {
    icon: <img src="https://cdn.classgrid.in/classgrid_intgration/whatsapp-svgrepo-com_(1).svg" alt="WhatsApp" className="w-5 h-5 object-contain" />,
    title: "WhatsApp Business",
    description: "Schedule a WhatsApp broadcast to students or parents",
    prompt: "Schedule a WhatsApp reminder to all parents 1 day before the fee deadline."
  },
  {
    icon: <img src="https://cdn.classgrid.in/classgrid_intgration/microsoft-teams-svgrepo-com.svg" alt="Microsoft Teams" className="w-5 h-5 object-contain" />,
    title: "Microsoft Teams",
    description: "Schedule a message or meeting in Microsoft Teams",
    prompt: "Schedule a Teams meeting for [Date/Time] and invite the team."
  },
  {
    icon: <img src="https://cdn.classgrid.in/classgrid_intgration/Google_Calendar_icon_(2026).svg" alt="Google Calendar" className="w-5 h-5 object-contain" />,
    title: "Google Calendar",
    description: "Add an event directly to your Google Calendar",
    prompt: "Schedule an event on my Google Calendar for [Date/Time] about [Topic]."
  },
  {
    icon: <img src="/logo.png" alt="Classgrid" className="w-5 h-5 object-contain" />,
    title: "Classgrid Classroom",
    description: "Schedule a live class or assignment in Classgrid",
    prompt: "Schedule a live class in my Classgrid Classroom for [Date/Time] about [Topic]."
  }
];

export const SchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<AiSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ScheduleStatus>("all");
  const [taskInput, setTaskInput] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const pathParts = location.pathname.split('/');
  const agentIndex = pathParts.indexOf('agent');
  const baseAgentPath = agentIndex !== -1
    ? pathParts.slice(0, agentIndex + 1).join('/')
    : location.pathname;
  const scheduleBasePath = `${baseAgentPath}/schedule`;

  const fetchSchedules = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get(`/api/ai/schedules?status=${filter}`);
      if (response.data?.success) {
        setSchedules(response.data.schedules);
      }
    } catch (error) {
      toast.error("Failed to load schedules");
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(true);
  }, [filter]);

  // Live WebSocket Sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleScheduleUpdate = () => {
      fetchSchedules(false);
    };

    socket.on("ai:schedule_updated", handleScheduleUpdate);
    return () => {
      socket.off("ai:schedule_updated", handleScheduleUpdate);
    };
  }, [filter]);

  const handleDelete = async (id: string) => {
    try {
      const response = await api.delete(`/api/ai/schedules/${id}`);
      if (response.data?.success) {
        toast.success("Schedule deleted");
        setSchedules(schedules.filter(s => s._id !== id));
      }
    } catch (error) {
      toast.error("Failed to delete schedule");
    }
  };

  const navigateToNewChatWithPrompt = (prompt: string) => {
    // Store the prompt in sessionStorage so AskAiPanel can pick it up
    sessionStorage.setItem("agent:schedule_prompt", prompt);
    navigate(baseAgentPath);
    window.dispatchEvent(new Event("agent:new-chat"));
    // Focus input and set the text after a brief delay
    setTimeout(() => {
      const input = document.getElementById("ai-chat-input") as HTMLTextAreaElement;
      if (input) {
        input.value = prompt;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }
    }, 200);
  };

  const handleScheduleInputSubmit = () => {
    if (!taskInput.trim()) return;
    navigateToNewChatWithPrompt(taskInput.trim());
    setTaskInput("");
  };

  const getStatusIcon = (status: ScheduleStatus) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4 text-blue-500" />;
      case "sent": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "cancelled": return <XCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">Pending</Badge>;
      case "sent": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Completed</Badge>;
      case "failed": return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">Failed</Badge>;
      case "cancelled": return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400">Cancelled</Badge>;
    }
  };

  const activeCount = schedules.filter(s => s.status === "pending").length;

  return (
    <div className="h-full flex flex-col bg-background relative z-10 p-6 md:p-8 max-w-3xl mx-auto w-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Scheduled</h1>
        {activeCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2C2C2C] dark:bg-[#F0EFED] text-[#F0EFED] dark:text-[#2C2C2C] text-xs font-medium">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {activeCount} Active
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-sm mb-6">
        Ask Classgrid AI to schedule tasks, set reminders, or monitor for updates.
      </p>

      {/* Schedule Input Bar */}
      <div className="flex items-center gap-2 mb-8 bg-muted/40 dark:bg-white/5 border border-border/60 rounded-2xl px-4 py-2.5 focus-within:border-foreground/20 transition-colors">
        <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          data-no-ring="true"
          placeholder="Schedule a task..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-none focus:ring-0 focus-visible:ring-0 focus:outline-none"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleScheduleInputSubmit()}
        />
        <button
          onClick={handleScheduleInputSubmit}
          disabled={!taskInput.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-[#2C2C2C] dark:bg-[#F0EFED] text-[#F0EFED] dark:text-[#2C2C2C] disabled:opacity-30 transition-opacity cursor-pointer"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Active Schedules */}
      {loading ? (
        <div className="space-y-3 mb-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[60%]" />
                <Skeleton className="h-3 w-[40%]" />
              </div>
            </div>
          ))}
        </div>
      ) : schedules.length > 0 ? (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            {(["all", "pending", "sent"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filter === f 
                    ? "bg-[#2C2C2C] text-[#F0EFED] dark:bg-[#F0EFED] dark:text-[#2C2C2C] shadow-sm" 
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
              >
                {f === "all" ? "All" : f === "pending" ? "Pending" : "Completed"}
              </button>
            ))}
          </div>

          {/* Schedule List */}
          <div className="flex flex-col mb-8">
            {schedules.map((schedule) => (
              <div 
                  key={schedule._id} 
                  className="py-4 border-b border-border/30 last:border-0 flex items-start gap-3 group relative"
                >
                <div className="w-10 h-10 rounded-lg bg-muted/50 dark:bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                  {getStatusIcon(schedule.status)}
                </div>
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`${scheduleBasePath}/${schedule._id}`)}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{schedule.title}</h3>
                    {getStatusBadge(schedule.status)}
                  </div>
                  {schedule.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                      {schedule.description}
                    </p>
                  )}
                  <span className="text-xs text-muted-foreground/70">
                    {schedule.status === "pending" && repeatLabel(schedule) ? "Next: " : ""}
                    {format(new Date(schedule.scheduled_at), "EEEE, MMM d, yyyy 'at' h:mm a")}
                  </span>
                  {repeatLabel(schedule) && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Repeat className="h-3 w-3" /> {repeatLabel(schedule)}
                    </span>
                  )}
                </div>
                {/* Copy link button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const url = `${window.location.origin}${scheduleBasePath}/${schedule._id}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Schedule link copied!");
                  }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                  title="Copy schedule link"
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <DangerConfirmDialog
                  title="Delete Schedule?"
                  description="Are you sure you want to cancel and delete this scheduled task? This cannot be undone."
                  onConfirm={() => handleDelete(schedule._id)}
                >
                  <button className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </DangerConfirmDialog>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {/* Recommended Section - always shown */}
      <div className="mt-auto">
        {!loading && schedules.length === 0 && (
          <div className="border-b border-border/20 mb-6 pb-2" />
        )}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Recommended</h3>
        <div className="flex flex-col">
          {SCHEDULE_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => navigateToNewChatWithPrompt(suggestion.prompt)}
              className="flex items-center gap-3.5 py-3.5 border-b border-border/20 last:border-0 group/item hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-muted/40 dark:bg-white/5 flex items-center justify-center shrink-0">
                {suggestion.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{suggestion.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{suggestion.description}</p>
              </div>
              <Plus className="w-5 h-5 text-muted-foreground/50 group-hover/item:text-foreground transition-colors shrink-0" />
            </button>
          ))}
        </div>

        {/* Integrations Section */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 mt-8">Integrations</h3>
        <div className="flex flex-col">
          {INTEGRATION_SUGGESTIONS.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => navigateToNewChatWithPrompt(suggestion.prompt)}
              className="flex items-center gap-3.5 py-3.5 border-b border-border/20 last:border-0 group/item hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-muted/40 dark:bg-white/5 flex items-center justify-center shrink-0">
                {suggestion.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{suggestion.title}</h4>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{suggestion.description}</p>
              </div>
              <Plus className="w-5 h-5 text-muted-foreground/50 group-hover/item:text-foreground transition-colors shrink-0" />
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default SchedulePage;
