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
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Mail,
  FileText,
  Info,
  StickyNote,
  Trash2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlarmClock,
} from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbLink } from "@/components/marketing_ui/breadcrumb";
import { toast } from "sonner";
import { apiClient as api } from "@/lib/apiClient";
import { getSocket } from "@/lib/socketClient";
import { repeatLabel, type ScheduleRepeat } from "./scheduleRepeat";

type ScheduleStatus = "pending" | "sent" | "failed" | "cancelled";

interface AiSchedule extends ScheduleRepeat {
  _id: string;
  title: string;
  description?: string;
  summary?: string;
  action_info?: string;
  email_subject?: string;
  email_body?: string;
  scheduled_at: string;
  status: ScheduleStatus;
  error_message?: string;
  createdAt?: string;
  created_at?: string;
}

const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{children}</p>
);

// One fact in the facts grid
const Fact = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="p-5">
    <Eyebrow>{label}</Eyebrow>
    <div className="mt-2 text-[15px] text-foreground">{children}</div>
  </div>
);

// A flat section: small label on top, content below
const Section = ({ label, title, children }: { label: string; title?: string; children: React.ReactNode }) => (
  <section className="rounded-md border border-border bg-background p-6">
    <Eyebrow>{label}</Eyebrow>
    {title && <h2 className="mt-2 text-xl font-medium tracking-[-0.01em] text-foreground">{title}</h2>}
    <div className="mt-4">{children}</div>
  </section>
);

export const ScheduleDetailPage: React.FC<{ id?: string }> = ({ id: propId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  const navigate = useNavigate();
  const location = useLocation();

  const [schedule, setSchedule] = useState<AiSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Derive back path from URL
  const pathParts = location.pathname.split("/");
  const scheduleIdx = pathParts.indexOf("schedule");
  const backPath = scheduleIdx !== -1
    ? pathParts.slice(0, scheduleIdx + 1).join("/")
    : pathParts.slice(0, -1).join("/") || "/";

  useEffect(() => {
    const fetchSchedule = async (isInitial = true) => {
      if (isInitial) setLoading(true);
      try {
        const res = await api.get(`/api/ai/schedules/${id}`);
        if (res.data?.success) {
          setSchedule(res.data.schedule);
          if (isInitial && res.data.schedule.scheduled_at) {
            setSelectedDate(new Date(res.data.schedule.scheduled_at));
          }
        } else if (isInitial) {
          toast.error("Schedule not found");
          navigate(backPath);
        }
      } catch {
        if (isInitial) {
          toast.error("Failed to load schedule");
          navigate(backPath);
        }
      } finally {
        if (isInitial) setLoading(false);
      }
    };

    if (id) {
      fetchSchedule(true);
      
      const socket = getSocket();
      const handleScheduleUpdate = (data: any) => {
        if (data.schedule_id === id || data._id === id) {
          fetchSchedule(false);
        } else if (!data.schedule_id && !data._id) {
          // Fallback if ID wasn't provided in the event
          fetchSchedule(false);
        }
      };
      
      socket.on("ai:schedule_updated", handleScheduleUpdate);
      return () => {
        socket.off("ai:schedule_updated", handleScheduleUpdate);
      };
    }
  }, [id, navigate, backPath]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await api.delete(`/api/ai/schedules/${id}`);
      toast.success("Schedule deleted");
      navigate(backPath);
    } catch {
      toast.error("Failed to delete schedule");
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  const getStatusBadge = (status: ScheduleStatus) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">● Pending</Badge>;
      case "sent": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">● Completed</Badge>;
      case "failed": return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400">● Failed</Badge>;
      case "cancelled": return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400">● Cancelled</Badge>;
    }
  };

  const handleUpdateSchedule = async () => {
    if (!schedule || !selectedDate) return;
    try {
      setIsUpdating(true);

      const res = await api.put(`/api/ai/schedules/${schedule._id}`, {
        scheduled_at: selectedDate.toISOString(),
      });

      if (res.data.success && res.data.schedule) {
        setSchedule(res.data.schedule);
        toast.success("Schedule updated successfully");
      }
    } catch (err: any) {
      console.error("Failed to update schedule:", err);
      toast.error("Failed to update schedule");
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── LOADING SKELETON ───
  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl animate-pulse p-4 pb-16 sm:p-6 lg:p-8">
        <div className="mb-8 border-b border-border pb-8">
          <div className="h-3 w-20 rounded bg-muted" />
          <div className="mt-4 h-10 w-80 rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <div className="h-28 rounded-md border border-border" />
            <div className="h-40 rounded-md border border-border" />
          </div>
          <div className="h-80 rounded-md border border-border" />
        </div>
      </div>
    );
  }

  if (!schedule) return null;

  const createdDateStr = schedule.createdAt || schedule.created_at;
  const summaryText = schedule.summary || schedule.email_subject;
  const detailsText = schedule.action_info;
  const repeatText = repeatLabel(schedule);
  const statusLabel = schedule.status === "sent" ? "Completed" : schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1);
  const statusDot =
    schedule.status === "pending" ? "bg-blue-500" :
    schedule.status === "sent" ? "bg-emerald-500" :
    schedule.status === "failed" ? "bg-red-500" : "bg-slate-400";

  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-y-auto p-4 pb-16 sm:p-6 lg:p-8">

      {/* Breadcrumb */}
      <div className="mb-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <div role="button" tabIndex={0} onClick={() => navigate(backPath)} className="inline-flex cursor-pointer border-none bg-transparent p-0 hover:text-foreground">
                  Schedules
                </div>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{schedule.title || "Schedule Details"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Heading */}
      <header className="mb-8 border-b border-border pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>Schedule</Eyebrow>
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-muted px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
            {statusLabel}
          </span>
        </div>
        <h1 className="mt-4 text-balance text-3xl font-medium tracking-[-0.03em] text-foreground sm:text-5xl">{schedule.title}</h1>
        {createdDateStr && (
          <p className="mt-3 text-sm text-muted-foreground">
            Created on {format(new Date(createdDateStr), "dd MMM yyyy, hh:mm a")}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">

        {/* Main */}
        <div className="space-y-6">

          {/* Facts */}
          <div className="grid grid-cols-1 divide-y divide-border rounded-md border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Fact label="Scheduled for">
              <p className="font-medium">{format(new Date(schedule.scheduled_at), "dd MMM yyyy")}</p>
              <p className="text-sm text-muted-foreground">{format(new Date(schedule.scheduled_at), "hh:mm a")} · IST</p>
            </Fact>
            <Fact label="Repeats">
              <p className="font-medium">{repeatText || "One time"}</p>
              {repeatText && schedule.status === "pending" && (
                <p className="text-sm text-muted-foreground">The time shown is the next run</p>
              )}
            </Fact>
            <Fact label="Schedule ID">
              <p className="font-mono font-medium">#{schedule._id.slice(-8).toUpperCase()}</p>
            </Fact>
          </div>

          {summaryText && (
            <Section label="Subject" title={summaryText}>
              {schedule.summary && schedule.summary !== summaryText ? (
                <p className="text-[15px] leading-relaxed text-muted-foreground">{schedule.summary}</p>
              ) : (
                <p className="text-[15px] leading-relaxed text-muted-foreground">What this schedule is about.</p>
              )}
            </Section>
          )}

          {detailsText && (
            <Section label="Details">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{detailsText}</p>
            </Section>
          )}

          {schedule.description && (
            <Section label="Notes">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{schedule.description}</p>
            </Section>
          )}

          {schedule.status === "pending" && (
            <Section label="Reschedule" title="Change the date and time">
              <div className="flex flex-col gap-4">
                <NikhilTimeCalendar value={selectedDate} onChange={setSelectedDate} />
                <div>
                  <button
                    onClick={handleUpdateSchedule}
                    disabled={isUpdating || !selectedDate || selectedDate.getTime() === new Date(schedule.scheduled_at).getTime()}
                    className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-md bg-foreground px-5 text-[15px] font-medium text-background transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-300"
                  >
                    {isUpdating ? "Saving..." : "Update schedule"}
                  </button>
                </div>
              </div>
            </Section>
          )}
        </div>

        {/* Side panel */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">

          {/* Status */}
          <section className="rounded-md border border-border bg-muted/40 p-6">
            <Eyebrow>Status</Eyebrow>
            <div className="mt-3 flex items-center gap-3">
              {schedule.status === "pending" && <AlarmClock className="h-5 w-5 text-blue-500" />}
              {schedule.status === "sent" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              {schedule.status === "failed" && <AlertCircle className="h-5 w-5 text-red-500" />}
              {schedule.status === "cancelled" && <XCircle className="h-5 w-5 text-slate-500" />}
              <p className="text-xl font-medium tracking-[-0.01em] text-foreground">{statusLabel}</p>
            </div>
            {schedule.status === "pending" && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This schedule is active. An email will be sent automatically at the scheduled time.
              </p>
            )}
            {schedule.status === "sent" && (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Task was completed successfully at the scheduled time.
              </p>
            )}
          </section>

          {/* Timeline */}
          <section className="rounded-md border border-border bg-background p-6">
            <Eyebrow>Timeline</Eyebrow>
            <div className="relative mt-5 pl-6">
              <div className="absolute bottom-1.5 left-[5px] top-1.5 w-px bg-border" />
              {(() => {
                const history = (schedule as any).reschedule_history || [];
                const originalDate = history.length > 0 ? history[0].previous_date : schedule.scheduled_at;
                const isCompleted = schedule.status === "sent";
                const isFailed = schedule.status === "failed";

                return (
                  <>
                    <div className="relative pb-5">
                      <div className="absolute -left-6 top-1.5 z-10 h-[11px] w-[11px] rounded-full border-2 border-background bg-foreground" />
                      <Eyebrow>Created</Eyebrow>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {createdDateStr ? format(new Date(createdDateStr), "dd MMM yyyy, hh:mm a") : "—"}
                      </p>
                    </div>

                    <div className="relative pb-5">
                      <div className="absolute -left-6 top-1.5 z-10 h-[11px] w-[11px] rounded-full border-2 border-background bg-blue-500" />
                      <Eyebrow>Scheduled</Eyebrow>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {format(new Date(originalDate), "dd MMM yyyy, hh:mm a")} · IST
                      </p>
                    </div>

                    {history.map((entry: any, i: number) => {
                      const newDate = i + 1 < history.length ? history[i + 1].previous_date : schedule.scheduled_at;
                      return (
                        <div key={i} className="relative pb-5">
                          <div className="absolute -left-6 top-1.5 z-10 h-[11px] w-[11px] rounded-full border-2 border-background bg-amber-500" />
                          <Eyebrow>Rescheduled</Eyebrow>
                          <p className="mt-1 text-sm font-medium text-foreground">
                            {format(new Date(newDate), "dd MMM yyyy, hh:mm a")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            moved on {format(new Date(entry.rescheduled_at), "dd MMM, hh:mm a")}
                          </p>
                        </div>
                      );
                    })}

                    <div className="relative">
                      <div className={`absolute -left-6 top-1.5 z-10 h-[11px] w-[11px] rounded-full border-2 border-background ${isCompleted ? "bg-emerald-500" : isFailed ? "bg-red-500" : "bg-muted-foreground/30"}`} />
                      <Eyebrow>{isCompleted ? "Completed" : isFailed ? "Failed" : "Pending"}</Eyebrow>
                      {isCompleted && (schedule as any).sent_at ? (
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {format(new Date((schedule as any).sent_at), "dd MMM yyyy, hh:mm a")} · IST
                        </p>
                      ) : isCompleted ? (
                        <p className="mt-1 text-sm font-medium text-emerald-500">Done ✓</p>
                      ) : isFailed ? (
                        <>
                          <p className="mt-1 text-sm font-medium text-red-500">Failed ✗</p>
                          <p className="mt-1 max-w-[240px] text-xs leading-tight text-red-400">
                            {schedule.error_message || "Execution failed. Worker caught an error."}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1 text-sm text-muted-foreground">Awaiting execution…</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </section>

          {/* Delete */}
          <button
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleting}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-red-500/30 bg-background text-[15px] font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete schedule"}
          </button>
        </aside>
      </div>

      <DangerConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Schedule?"
        description="Are you sure you want to cancel and permanently delete this scheduled task?"
        warningMessage="This action cannot be undone."
        actionLabel="Delete Schedule"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        variant="danger"
      />
    </div>
  );
};

export default ScheduleDetailPage;
