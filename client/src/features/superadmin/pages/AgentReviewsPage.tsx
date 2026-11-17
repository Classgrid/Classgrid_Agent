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
// Agent Reviews: the thumbs up and thumbs down people give Classgrid AI's answers. Folders go person, then day, then
// the reviews of that day (owner, 2026-11-17: the organization and role levels went with the ERP).
import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/marketing_ui/card";
import { ThumbsDown, ThumbsUp, MessageSquare, Calendar, Search, ChevronRight, ArrowLeft, Trash2, FileText, ExternalLink } from "lucide-react";
import { useAgentReviews, useUpdateAgentReviewStatus, useDeleteAgentReview, useBulkDeleteAgentReviews } from "../queries/useAgentReviews";
import { format } from "date-fns";
import { Input } from "@/components/marketing_ui/input";
import { Button } from "@/components/marketing_ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { getSocket } from "@/lib/socketClient";
import { useQueryClient } from "@tanstack/react-query";
import { AgentReview } from "../services/superAdminApi";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import FilePreviewModal, { FilePreviewSource } from "@/components/ai/components/FilePreviewModal";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { Checkbox } from "@/components/marketing_ui/checkbox";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";

interface PathState {
  email?: string;
  /** yyyy-MM-dd */
  day?: string;
}

type ReviewStatus = AgentReview["status"];

const STATUS_OPTIONS: { value: ReviewStatus; label: string; color: string }[] = [
  { value: "pending", label: "Pending", color: "bg-amber-500" },
  { value: "actioned", label: "Actioned (emails the person)", color: "bg-blue-500" },
  { value: "acknowledged", label: "Acknowledged", color: "bg-zinc-500" },
  { value: "no_action", label: "No action (spam)", color: "bg-red-500" },
];

const isPositive = (r: AgentReview) => r.type === "up";
const dayKey = (iso: string) => format(new Date(iso), "yyyy-MM-dd");
const dayLabel = (key: string) => format(new Date(`${key}T00:00:00`), "MMM dd, yyyy");
const displayName = (r: AgentReview) => r.user_details?.name || r.user_email || "Unknown";

function AttachmentChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full max-w-sm flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted transition-colors text-left cursor-pointer"
    >
      <div className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center bg-muted text-foreground">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-foreground truncate">{label}</span>
        <span className="text-xs text-muted-foreground mt-0.5">Click to preview</span>
      </div>
    </button>
  );
}

function FolderTile({ label, subtitle, count, onClick }: { label: string; subtitle?: string; count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-start p-3 sm:p-4 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-colors min-h-[150px] cursor-pointer"
    >
      <div className="relative mb-2">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 dark:text-amber-500/80">
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
        </svg>
        <span className="absolute -top-2 -right-2 min-w-[20px] rounded-full bg-foreground text-background text-[10px] font-semibold px-1.5 py-0.5 text-center">
          {count}
        </span>
      </div>
      <span className="text-sm font-medium text-foreground text-center leading-tight break-words w-full">{label}</span>
      {subtitle && <span className="text-xs text-muted-foreground text-center mt-1 break-all w-full">{subtitle}</span>}
    </button>
  );
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

export function AgentReviewsPage() {
  const { data, isLoading, error } = useAgentReviews();
  const updateStatusMutation = useUpdateAgentReviewStatus();
  const deleteReviewMutation = useDeleteAgentReview();
  const bulkDeleteMutation = useBulkDeleteAgentReviews();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | undefined>();
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);

  // Selection and delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Folder path
  const [path, setPath] = useState<PathState>({});

  // Live updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewReview = (newReview: AgentReview) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return { reviews: [newReview] };
        if (old.reviews.some((r) => r.id === newReview.id)) return old;
        return { reviews: [newReview, ...old.reviews] };
      });
    };

    // The server sends the updated row without the person's details, so keep the ones already on the page
    const handleReviewUpdated = (updatedReview: AgentReview) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return old;
        return {
          reviews: old.reviews.map((r) =>
            r.id === updatedReview.id ? { ...r, ...updatedReview, user_details: updatedReview.user_details ?? r.user_details } : r
          ),
        };
      });
    };

    const handleReviewDeleted = ({ id }: { id: string }) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return old;
        return { reviews: old.reviews.filter((r) => r.id !== id) };
      });
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    };

    const handleReviewsBulkDeleted = ({ ids }: { ids: string[] }) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return old;
        return { reviews: old.reviews.filter((r) => !ids.includes(r.id)) };
      });
      setSelectedIds((prev) => prev.filter((selectedId) => !ids.includes(selectedId)));
    };

    socket.on("new_agent_review", handleNewReview);
    socket.on("agent_review_updated", handleReviewUpdated);
    socket.on("agent_review_deleted", handleReviewDeleted);
    socket.on("agent_reviews_bulk_deleted", handleReviewsBulkDeleted);

    return () => {
      socket.off("new_agent_review", handleNewReview);
      socket.off("agent_review_updated", handleReviewUpdated);
      socket.off("agent_review_deleted", handleReviewDeleted);
      socket.off("agent_reviews_bulk_deleted", handleReviewsBulkDeleted);
    };
  }, [queryClient]);

  const reviews = data?.reviews || [];
  const totalCount = reviews.length;
  const negativeCount = reviews.filter((r) => !isPositive(r)).length;
  const pendingCount = reviews.filter((r) => !r.status || r.status === "pending").length;

  const filteredReviews = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return reviews.filter((review) => {
      if (selectedDateFilter) {
        const reviewDate = new Date(review.created_at);
        if (
          reviewDate.getFullYear() !== selectedDateFilter.getFullYear() ||
          reviewDate.getMonth() !== selectedDateFilter.getMonth() ||
          reviewDate.getDate() !== selectedDateFilter.getDate()
        ) {
          return false;
        }
      }
      if (term) {
        const haystack = `${review.feedback_text || ""} ${review.user_email || ""} ${review.user_details?.name || ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [reviews, searchTerm, selectedDateFilter]);

  // Person, then day, then the reviews of that day
  const tree = useMemo(() => {
    const people: Record<string, { name: string; count: number; days: Record<string, AgentReview[]> }> = {};
    filteredReviews.forEach((review) => {
      const email = review.user_email || "unknown";
      const day = dayKey(review.created_at);
      if (!people[email]) people[email] = { name: displayName(review), count: 0, days: {} };
      people[email].count++;
      if (!people[email].days[day]) people[email].days[day] = [];
      people[email].days[day].push(review);
    });
    return people;
  }, [filteredReviews]);

  // Drop the selection of reviews that are no longer on the page (removed, or hidden by the filters)
  useEffect(() => {
    const visible = new Set(filteredReviews.map((r) => r.id));
    setSelectedIds((prev) => (prev.every((id) => visible.has(id)) ? prev : prev.filter((id) => visible.has(id))));
  }, [filteredReviews]);

  const toggleSelected = (id: string, checked: boolean) =>
    setSelectedIds((prev) => (checked ? (prev.includes(id) ? prev : [...prev, id]) : prev.filter((x) => x !== id)));

  const renderReview = (review: AgentReview) => {
    const positive = isPositive(review);
    const status = review.status || "pending";
    // "Actioned" emails the person that the bad answer was fixed, so it is only offered on a thumbs down
    const options = STATUS_OPTIONS.filter((o) => !(positive && o.value === "actioned" && status !== "actioned"));
    const files = review.file_url ? review.file_url.split(",").map((u) => u.trim()).filter(Boolean) : [];

    return (
      <Card key={review.id} className="overflow-hidden relative border-border bg-card">
        <div className="absolute top-4 left-4 z-10">
          <Checkbox
            className="cursor-pointer border-border bg-card"
            checked={selectedIds.includes(review.id)}
            onCheckedChange={(checked) => toggleSelected(review.id, checked === true)}
            aria-label="Select this review"
          />
        </div>
        <div className="flex flex-col md:flex-row pl-10">
          {/* Who and when */}
          <div className="md:w-1/3 p-4 bg-muted/30 border-b md:border-b-0 md:border-r border-border flex flex-col gap-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                {positive ? <ThumbsUp className="h-3 w-3" /> : <ThumbsDown className="h-3 w-3" />}
                {positive ? "Positive" : "Negative"}
              </span>
              <span className="flex items-center text-muted-foreground text-xs" title={format(new Date(review.created_at), "PPpp")}>
                <Calendar className="h-3 w-3 mr-1" />
                {format(new Date(review.created_at), "h:mm a")}
              </span>
            </div>

            <div className="flex items-start gap-3 min-w-0">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={review.user_details?.profilePicture} alt={displayName(review)} />
                <AvatarFallback className="bg-muted text-foreground font-medium">
                  {displayName(review).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                {review.user_details?.id ? (
                  <Link to={`/superadmin/global-users/${review.user_details.id}`} className="font-semibold text-sm text-foreground truncate hover:underline">
                    {review.user_details.name || review.user_email}
                  </Link>
                ) : (
                  <span className="font-semibold text-sm text-foreground truncate">{displayName(review)}</span>
                )}
                <span className="text-xs text-muted-foreground truncate">{review.user_email}</span>
                {!review.user_details && <span className="text-xs text-muted-foreground mt-1">No account with this email</span>}
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Message ID</span>
              <code className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded break-all">{review.message_id}</code>
            </div>
          </div>

          {/* What they said */}
          <div className="md:w-2/3 p-4 flex flex-col min-w-0">
            {review.feedback_text ? (
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                  Written feedback
                </h4>
                <p className="text-sm bg-muted/40 p-3 rounded-md border border-border text-foreground whitespace-pre-wrap break-words">
                  {review.feedback_text}
                </p>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm py-4">No written feedback.</div>
            )}

            {files.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border space-y-3">
                {files.map((url, i) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(url) || url.includes("firebasestorage.googleapis.com");
                  const mimeType = isImage
                    ? "image/png"
                    : /\.pdf/i.test(url)
                      ? "application/pdf"
                      : /\.xlsx/i.test(url)
                        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        : /\.xls/i.test(url)
                          ? "application/vnd.ms-excel"
                          : /\.csv/i.test(url)
                            ? "text/csv"
                            : "application/octet-stream";
                  const open = () => setPreviewFile({ name: "Attachment", src: url, mimeType });
                  return (
                    <div key={i} className="flex flex-col gap-2 items-start">
                      {isImage ? (
                        <img
                          src={url}
                          alt="Feedback attachment"
                          onClick={open}
                          className="max-w-full sm:max-w-xs max-h-48 rounded-md border border-border object-cover hover:opacity-80 transition-opacity cursor-pointer bg-muted"
                        />
                      ) : (
                        <AttachmentChip label={files.length > 1 ? `Attached file (${i + 1})` : "Attached file"} onClick={open} />
                      )}
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> Open the file
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Status and delete */}
            <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-500/10 dark:text-red-400"
                  aria-label="Delete this review"
                  onClick={() => {
                    setDeletingId(review.id);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="w-full sm:w-[240px]">
                <ResponsiveSelect
                  className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 hover:bg-muted/50 transition-colors text-sm font-medium"
                  value={status}
                  popDirection="up"
                  onChange={(e) => {
                    const newStatus = e.target.value as ReviewStatus;
                    if (newStatus !== status) updateStatusMutation.mutate({ id: review.id, status: newStatus });
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  {options.map((o) => (
                    <option key={o.value} value={o.value} data-color={o.color}>
                      {o.label}
                    </option>
                  ))}
                </ResponsiveSelect>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderPathBar = () => {
    const person = path.email ? tree[path.email] : undefined;
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/30 p-3 rounded-lg border border-border">
        <button type="button" onClick={() => setPath({})} className="hover:text-foreground font-medium cursor-pointer">
          Everyone
        </button>
        {path.email && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button type="button" onClick={() => setPath({ email: path.email })} className="hover:text-foreground truncate max-w-[200px] cursor-pointer">
              {person?.name || path.email}
            </button>
          </>
        )}
        {path.day && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <span className="text-foreground font-medium">{dayLabel(path.day)}</span>
          </>
        )}
      </div>
    );
  };

  const grid = "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4 w-full";

  const renderFolders = () => {
    if (isLoading) {
      return (
        <div className={grid}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      );
    }
    if (error) return <div className="text-center py-12 text-sm text-red-600 dark:text-red-400">Could not load the reviews. Reload the page to try again.</div>;

    // Everyone
    if (!path.email) {
      const people = Object.entries(tree).sort(([, a], [, b]) => a.name.localeCompare(b.name));
      if (people.length === 0) {
        return (
          <div className="text-center py-12 text-sm text-muted-foreground w-full">
            {reviews.length === 0 ? "No feedback yet." : "No feedback matches the search or the date."}
          </div>
        );
      }
      return (
        <div className={grid}>
          {people.map(([email, p]) => (
            <FolderTile
              key={email}
              label={p.name}
              subtitle={p.name !== email ? email : undefined}
              count={p.count}
              onClick={() => setPath({ email })}
            />
          ))}
        </div>
      );
    }

    const person = tree[path.email];
    if (!person) {
      return <div className="text-center py-12 text-sm text-muted-foreground w-full">No feedback from this person matches the search or the date.</div>;
    }

    // One person's days
    if (!path.day) {
      const days = Object.entries(person.days).sort(([a], [b]) => b.localeCompare(a));
      return (
        <div className={grid}>
          {days.map(([day, list]) => (
            <FolderTile key={day} label={dayLabel(day)} count={list.length} onClick={() => setPath({ email: path.email, day })} />
          ))}
        </div>
      );
    }

    // One day's reviews
    const dayReviews = person.days[path.day];
    if (!dayReviews) {
      return <div className="text-center py-12 text-sm text-muted-foreground w-full">No feedback on this day matches the search or the date.</div>;
    }
    const allSelected = dayReviews.every((r) => selectedIds.includes(r.id));
    return (
      <div className="w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setPath({ email: path.email })}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to days
            </Button>
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              {dayLabel(path.day)}: {dayReviews.length} {dayReviews.length === 1 ? "review" : "reviews"}
            </h3>
          </div>
          <label className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-md border border-border text-sm font-medium text-foreground cursor-pointer">
            <Checkbox
              className="cursor-pointer"
              checked={allSelected}
              onCheckedChange={(checked) =>
                setSelectedIds((prev) => {
                  const ids = dayReviews.map((r) => r.id);
                  return checked === true ? Array.from(new Set([...prev, ...ids])) : prev.filter((id) => !ids.includes(id));
                })
              }
            />
            Select all on this day
          </label>
        </div>
        {dayReviews.map((review) => renderReview(review))}
      </div>
    );
  };

  return (
    <div className="px-4 py-4 sm:p-6 space-y-6 text-foreground">
      <PageBreadcrumbs items={[{ label: "Agent Reviews" }]} />

      <div>
        <h2 className="text-xl font-semibold tracking-tight">Agent Reviews</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The thumbs up and thumbs down people give Classgrid AI's answers. A review set to any status other than Pending
          is removed within 5 minutes; Actioned also emails the person that the answer was fixed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile label="All feedback" value={totalCount} icon={<MessageSquare className="h-4 w-4" />} />
        <StatTile label="Thumbs down" value={negativeCount} icon={<ThumbsDown className="h-4 w-4" />} />
        <StatTile label="Pending" value={pendingCount} icon={<Calendar className="h-4 w-4" />} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email or text"
            className="pl-8 bg-background w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <NikhilTimeCalendar value={selectedDateFilter} onChange={(d) => setSelectedDateFilter(d)} showTime={false} placeholder="Filter by date" />
        </div>
      </div>

      <div className="w-full pb-24">
        {renderPathBar()}
        {renderFolders()}
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Bulk actions */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 max-w-[calc(100vw-2rem)] bg-card border border-border px-4 py-3 rounded-xl shadow-xl animate-in slide-in-from-bottom-5">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground whitespace-nowrap">
            <span className="bg-foreground text-background min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-semibold">
              {selectedIds.length}
            </span>
            Selected
          </span>
          <div className="h-6 w-px bg-border" />
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeletingId(null);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Cancel
          </Button>
        </div>
      )}

      {/* Delete (one review or the selected ones) */}
      <DangerConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={deletingId ? "Delete this review" : `Delete ${selectedIds.length} ${selectedIds.length === 1 ? "review" : "reviews"}`}
        description={<>Permanently delete {deletingId ? "this review" : `the ${selectedIds.length} selected ${selectedIds.length === 1 ? "review" : "reviews"}`}.</>}
        warningMessage="This can't be undone. The review, its text and its link to the files are removed for good."
        confirmationSteps={[{ label: "To confirm, type", value: "delete" }]}
        actionLabel={deletingId ? "Delete review" : "Delete reviews"}
        cancelLabel="Cancel"
        isLoading={deletingId ? deleteReviewMutation.isPending : bulkDeleteMutation.isPending}
        onConfirm={() => {
          if (deletingId) {
            const id = deletingId;
            deleteReviewMutation.mutate(id, {
              onSuccess: () => {
                setShowDeleteConfirm(false);
                setDeletingId(null);
                setSelectedIds((prev) => prev.filter((x) => x !== id));
              },
            });
          } else {
            bulkDeleteMutation.mutate(selectedIds, {
              onSuccess: () => {
                setShowDeleteConfirm(false);
                setSelectedIds([]);
              },
            });
          }
        }}
        variant="danger"
      />
    </div>
  );
}
