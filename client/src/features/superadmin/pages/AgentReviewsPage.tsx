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
import React, { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { ThumbsDown, MessageSquare, ExternalLink, Calendar, Search, Filter, Building, ChevronDown, ChevronUp, ChevronRight, Home, ArrowLeft, AlertCircle, Trash2, FileText, ExternalLink as ExtLinkIcon } from "lucide-react";
import { useAgentReviews, useUpdateAgentReviewStatus, useDeleteAgentReview, useBulkDeleteAgentReviews } from "../queries/useAgentReviews";
import { formatDistanceToNow, format } from "date-fns";
import { Badge } from "@/components/marketing_ui/badge";
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
  role?: string;
  org?: string;
  email?: string;
  date?: string;
}

function PdfAttachmentChip({ filename = "document.pdf", onClick }: { filename?: string, onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-[#151515] rounded-xl border border-slate-200/80 dark:border-white/10 flex items-center justify-between p-4 shadow-sm dark:shadow-none w-full max-w-sm hover:bg-slate-50 dark:hover:bg-[#1a1a1a] transition-all duration-500 ease-in-out cursor-pointer group"
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Red Icon Box */}
        <div className="h-10 w-10 shrink-0 rounded-lg flex items-center justify-center bg-red-100/50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          <FileText className="h-5 w-5" />
        </div>
        
        {/* Text Container */}
        <div className="flex flex-col overflow-hidden text-left">
          <span className="text-[14px] font-medium text-slate-800 dark:text-[#eeeeee] truncate">
            {filename}
          </span>
          <span className="text-[13px] text-slate-500 dark:text-[#8a8a8a] mt-0.5">
            Click to preview
          </span>
        </div>
      </div>
    </div>
  );
}

const formatRoleName = (role: string) => {
  const overrides: Record<string, string> = {
    'org_admin': 'Organization Admin',
    'super_admin': 'Super Admin',
    'student': 'Student',
    'faculty': 'Faculty',
    'teacher': 'Teacher'
  };
  return overrides[role] || (role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' '));
};

const REVIEW_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-yellow-500" },
  { value: "actioned", label: "Actioned (Auto-Email)", color: "bg-green-500" },
  { value: "acknowledged", label: "Acknowledged (Manual)", color: "bg-blue-500" },
  { value: "no_action", label: "No Action (Spam)", color: "bg-red-500" },
];

const FolderIcon = ({ label, subtitle, onClick, badge }: { label: string, subtitle?: string, onClick: () => void, badge: number }) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-start p-4 rounded-xl hover:bg-accent/50 transition-colors border border-transparent hover:border-border group h-auto min-h-[160px] relative cursor-pointer"
  >
    <div className="relative mb-2">
      {/* Windows-style folder icon SVG */}
      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400 group-hover:text-amber-500 transition-colors drop-shadow-sm">
        <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
      </svg>
      <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm min-w-[20px] text-center">
        {badge}
      </div>
    </div>
    <div className="flex flex-col w-full justify-center mt-2">
      <span className="text-sm font-medium text-foreground whitespace-normal break-normal w-full text-center leading-tight px-1 text-balance">{label}</span>
      {subtitle && <span className="text-xs text-muted-foreground whitespace-normal break-words w-full text-center mt-1 px-1 text-balance">{subtitle}</span>}
    </div>
  </button>
);

export function AgentReviewsPage() {
  const { data, isLoading, error } = useAgentReviews();
  const updateStatusMutation = useUpdateAgentReviewStatus();
  const deleteReviewMutation = useDeleteAgentReview();
  const bulkDeleteMutation = useBulkDeleteAgentReviews();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | undefined>();
  const [previewFile, setPreviewFile] = useState<FilePreviewSource | null>(null);

  // Selection and Delete State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Navigation State
  const [path, setPath] = useState<PathState>({});

  // Real-time updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleNewReview = (newReview: AgentReview) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return { reviews: [newReview] };
        return { reviews: [newReview, ...old.reviews] };
      });
    };
    
    const handleReviewUpdated = (updatedReview: AgentReview) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return { reviews: [] };
        return { reviews: old.reviews.map(r => r.id === updatedReview.id ? updatedReview : r) };
      });
    };
    
    const handleReviewDeleted = ({ id }: { id: string }) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return { reviews: [] };
        return { reviews: old.reviews.filter(r => r.id !== id) };
      });
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    };

    const handleReviewsBulkDeleted = ({ ids }: { ids: string[] }) => {
      queryClient.setQueryData<{ reviews: AgentReview[] }>(["ai-agent-reviews"], (old) => {
        if (!old) return { reviews: [] };
        return { reviews: old.reviews.filter(r => !ids.includes(r.id)) };
      });
      setSelectedIds(prev => prev.filter(selectedId => !ids.includes(selectedId)));
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
  const totalFeedbackCount = reviews.length;
  const totalPendingCount = reviews.filter((r) => !r.status || r.status === "pending").length;

  const filteredReviews = useMemo(() => {
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

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const textMatch = review.feedback_text?.toLowerCase().includes(term);
        const emailMatch = review.user_email?.toLowerCase().includes(term);
        const nameMatch = review.user_details?.name.toLowerCase().includes(term);
        const orgMatch = review.user_details?.orgName.toLowerCase().includes(term);
        if (!textMatch && !emailMatch && !nameMatch && !orgMatch) return false;
      }
      return true;
    });
  }, [reviews, searchTerm, selectedDateFilter]);

  // Build the deeply nested structure based on filtered results
  const tree = useMemo(() => {
    const root: Record<string, { count: number, roles: Record<string, { count: number, users: Record<string, { name: string, count: number, dates: Record<string, { count: number, reviews: AgentReview[] }> }> }> }> = {};
    
    filteredReviews.forEach(review => {
      const role = review.user_details?.role || "unknown";
      const org = review.user_details?.orgName || "No Organization";
      const email = review.user_email || "unknown";
      const name = review.user_details?.name || "Unknown";
      const date = format(new Date(review.created_at), 'MMM dd, yyyy');

      if (!root[org]) root[org] = { count: 0, roles: {} };
      root[org].count++;

      if (!root[org].roles[role]) root[org].roles[role] = { count: 0, users: {} };
      root[org].roles[role].count++;

      if (!root[org].roles[role].users[email]) root[org].roles[role].users[email] = { name, count: 0, dates: {} };
      root[org].roles[role].users[email].count++;

      if (!root[org].roles[role].users[email].dates[date]) root[org].roles[role].users[email].dates[date] = { count: 0, reviews: [] };
      root[org].roles[role].users[email].dates[date].count++;
      root[org].roles[role].users[email].dates[date].reviews.push(review);
    });
    
    return root;
  }, [filteredReviews]);

  const renderReviewContent = (review: AgentReview) => (
    <Card key={review.id} className="overflow-hidden mb-4 relative group">
      <div className="absolute top-4 left-4 z-10">
        <Checkbox 
          className="cursor-pointer border-border bg-card shadow-sm"
          checked={selectedIds.includes(review.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedIds(prev => [...prev, review.id]);
            } else {
              setSelectedIds(prev => prev.filter(id => id !== review.id));
            }
          }}
        />
      </div>
      <div className={`flex flex-col md:flex-row border-l-4 bg-card hover:bg-muted/10 transition-colors pl-10`} style={{
        borderLeftColor: '#f43f5e'
      }}>
        {/* Left Side: Meta info & User Profile */}
        <div className={`md:w-1/3 p-4 bg-muted/20 border-b md:border-b-0 md:border-r border-border flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border-0 ml-2">
              <ThumbsDown className="h-3 w-3 mr-1" /> Negative Feedback
            </Badge>
            <div className="flex items-center text-muted-foreground text-xs font-medium">
              <Calendar className="h-3 w-3 mr-1" />
              <span title={format(new Date(review.created_at), 'PPpp')}>
                {format(new Date(review.created_at), 'h:mm a')} IST
              </span>
            </div>
          </div>
  
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={review.user_details?.profilePicture} alt={review.user_details?.name || review.user_email} />
              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {review.user_details?.name ? review.user_details.name.charAt(0).toUpperCase() : review.user_email.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sm truncate">
                {review.user_details?.name || "Unknown User"}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {review.user_email}
              </span>
              {review.user_details && (
                <div className="flex items-center gap-1 mt-1">
                  <Building className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground truncate">
                    {review.user_details.orgName}
                  </span>
                </div>
              )}
            </div>
          </div>
  
          {review.user_details && (
            <div className="mt-auto pt-2 border-t border-border/50">
              <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">User ID</span>
              <code className="text-xs text-muted-foreground break-all">
                {review.user_details.id}
              </code>
            </div>
          )}
  
          <div className="pt-2">
            <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-semibold">Message ID</span>
            <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded break-all">
              {review.message_id}
            </code>
          </div>
        </div>
  
        {/* Right Side: Content */}
        <div className="md:w-2/3 p-4 flex flex-col">
          {review.feedback_text ? (
            <div className="flex-1">
              <h4 className="text-sm font-semibold mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" />
                Written Feedback
              </h4>
              <p className="text-sm bg-muted/30 p-3 rounded-md italic border border-muted/50 text-foreground/90 whitespace-pre-wrap">
                "{review.feedback_text}"
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm italic py-4">
              No written feedback provided.
            </div>
          )}
  
          {review.file_url && (
            <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
              {review.file_url.split(',').map((url, i) => {
                const trimmedUrl = url.trim();
                const isImage = /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(trimmedUrl) || trimmedUrl.includes('firebasestorage.googleapis.com');
                
                const getMime = () => {
                  if (isImage) return 'image/png';
                  if (/\.pdf/i.test(trimmedUrl)) return 'application/pdf';
                  if (/\.xlsx/i.test(trimmedUrl)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                  if (/\.xls/i.test(trimmedUrl)) return 'application/vnd.ms-excel';
                  if (/\.csv/i.test(trimmedUrl)) return 'text/csv';
                  return 'application/octet-stream';
                };

                return (
                  <div key={i} className="flex items-start gap-4">
                    {isImage ? (
                      <div className="flex flex-col gap-2 items-start">
                        <img 
                          src={trimmedUrl} 
                          alt="Feedback attachment" 
                          onClick={() => setPreviewFile({ name: 'Attachment', src: trimmedUrl, mimeType: getMime() })}
                          className="max-w-xs max-h-48 rounded-md border border-border object-cover hover:opacity-80 transition-opacity cursor-pointer bg-white" 
                        />
                        <a href={trimmedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                          <ExtLinkIcon className="h-3 w-3" /> Open raw link
                        </a>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 items-start w-full max-w-sm">
                        <PdfAttachmentChip 
                          filename={`Attached File ${review.file_url!.split(',').length > 1 ? `(${i + 1})` : ''}`}
                          onClick={() => setPreviewFile({ name: 'Attachment', src: trimmedUrl, mimeType: getMime() })}
                        />
                        <a href={trimmedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1 ml-1">
                          <ExtLinkIcon className="h-3 w-3" /> Open raw link
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Status Dropdown and Actions */}
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider mr-2">Status</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                onClick={() => {
                  setDeletingId(review.id);
                  setShowDeleteConfirm(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="w-[220px]">
              <ResponsiveSelect
                className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm font-medium"
                value={review.status || 'pending'}
                popDirection="up"
                onChange={(e) => {
                  const newStatus = e.target.value as 'actioned' | 'acknowledged' | 'no_action' | 'pending';
                  if (newStatus !== review.status) {
                    updateStatusMutation.mutate({ id: review.id, status: newStatus });
                  }
                }}
                disabled={updateStatusMutation.isPending}
              >
                {REVIEW_STATUS_OPTIONS.map((o) => (
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

  const renderBreadcrumbs = () => {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/20 p-3 rounded-lg border border-border">
        <button onClick={() => setPath({})} className="hover:text-foreground flex items-center font-medium cursor-pointer">
          <Home className="h-4 w-4 mr-1.5 text-amber-500" /> Root
        </button>
        {path.org && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ org: path.org })} className="hover:text-foreground cursor-pointer">
              {path.org}
            </button>
          </>
        )}
        {path.role && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ org: path.org, role: path.role })} className="hover:text-foreground cursor-pointer">
              {formatRoleName(path.role)}
            </button>
          </>
        )}
        {path.email && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ org: path.org, role: path.role, email: path.email })} className="hover:text-foreground truncate max-w-[200px] cursor-pointer">
              {tree[path.org!]?.roles[path.role!]?.users[path.email!]?.name || path.email}
            </button>
          </>
        )}
        {path.date && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <span className="text-foreground font-medium">{path.date}</span>
          </>
        )}
      </div>
    );
  };

  const renderFolders = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      );
    }
    if (error) return <div className="text-center py-12 text-rose-500">Failed to load reviews.</div>;

    // ROOT LEVEL (Organizations)
    if (!path.org) {
      const orgs = Object.keys(tree).sort();
      if (orgs.length === 0) return <div className="text-center py-12 text-muted-foreground w-full">No folders found.</div>;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {orgs.map(org => (
            <FolderIcon 
              key={org} 
              label={org} 
              badge={tree[org].count} 
              onClick={() => setPath({ org })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 1 (Roles)
    if (path.org && !path.role) {
      const orgNode = tree[path.org];
      if (!orgNode) return null;
      const roles = Object.keys(orgNode.roles).sort();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {roles.map(role => (
            <FolderIcon 
              key={role} 
              label={formatRoleName(role)} 
              badge={orgNode.roles[role].count} 
              onClick={() => setPath({ ...path, role })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 2 (Users)
    if (path.org && path.role && !path.email) {
      const roleNode = tree[path.org]?.roles[path.role];
      if (!roleNode) return null;
      const emails = Object.keys(roleNode.users).sort();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {emails.map(email => {
            const userNode = roleNode.users[email];
            return (
              <FolderIcon 
                key={email} 
                label={userNode.name} 
                subtitle={email}
                badge={userNode.count} 
                onClick={() => setPath({ ...path, email })} 
              />
            );
          })}
        </div>
      );
    }

    // LEVEL 3 (Dates)
    if (path.org && path.role && path.email && !path.date) {
      const userNode = tree[path.org]?.roles[path.role]?.users[path.email];
      if (!userNode) return null;
      const dates = Object.keys(userNode.dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {dates.map(date => (
            <FolderIcon 
              key={date} 
              label={date} 
              badge={userNode.dates[date].count} 
              onClick={() => setPath({ ...path, date })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 4 (Reviews!)
    if (path.org && path.role && path.email && path.date) {
      const dateNode = tree[path.org]?.roles[path.role]?.users[path.email]?.dates[path.date];
      if (!dateNode) return null;
      
      return (
        <div className="w-full space-y-4 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setPath({ org: path.org, role: path.role, email: path.email })}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dates
              </Button>
              <h3 className="text-lg font-semibold">{path.date} - {dateNode.reviews.length} Reviews</h3>
            </div>
            
            <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border border-border">
              <Checkbox 
                id="select-all"
                className="cursor-pointer"
                checked={selectedIds.length > 0 && selectedIds.length === dateNode.reviews.length}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedIds(dateNode.reviews.map(r => r.id));
                  } else {
                    setSelectedIds([]);
                  }
                }}
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">Select All in View</label>
            </div>
          </div>
          {dateNode.reviews.map(review => renderReviewContent(review))}
        </div>
      );
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageBreadcrumbs items={[
        { label: "Agent Reviews" }
      ]} />

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalFeedbackCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{totalPendingCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Global Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between bg-muted/40">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search globally by name, email, org, or text..."
              className="pl-8 bg-background w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="w-full sm:w-64">
              <NikhilTimeCalendar 
                value={selectedDateFilter} 
                onChange={(d) => setSelectedDateFilter(d)} 
                showTime={false} 
                placeholder="Filter globally by date..." 
              />
            </div>
            
            
          </div>
        </CardContent>
      </Card>

      {/* Folders Area */}
      <div className="w-full pb-20">
        {renderBreadcrumbs()}
        {renderFolders()}
      </div>

      <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-card border border-border p-4 rounded-xl shadow-xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
              {selectedIds.length}
            </span>
            <span className="text-sm font-medium">Selected</span>
          </div>
          <div className="h-6 w-[1px] bg-border mx-2"></div>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => {
              setDeletingId(null);
              setShowDeleteConfirm(true);
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Bulk Delete
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedIds([])}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Danger Confirm Dialog for Delete (Single & Bulk) */}
      <DangerConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={deletingId ? "Delete Agent Review" : `Bulk Delete ${selectedIds.length} Reviews`}
        description={
          <>
            Permanently delete {deletingId ? "this selected agent review" : `these ${selectedIds.length} selected agent reviews`}.
          </>
        }
        warningMessage="This action is irreversible. All details associated with this review data will be permanently lost."
        confirmationSteps={[
          {
            label: "To confirm, type",
            value: "delete",
          },
        ]}
        actionLabel={deletingId ? "Delete Review" : "Bulk Delete Reviews"}
        cancelLabel="Cancel"
        isLoading={deletingId ? deleteReviewMutation.isPending : bulkDeleteMutation.isPending}
        onConfirm={() => {
          if (deletingId) {
            deleteReviewMutation.mutate(deletingId, {
              onSuccess: () => {
                setShowDeleteConfirm(false);
                setDeletingId(null);
                setSelectedIds(prev => prev.filter(id => id !== deletingId));
              }
            });
          } else {
            bulkDeleteMutation.mutate(selectedIds, {
              onSuccess: () => {
                setShowDeleteConfirm(false);
                setSelectedIds([]);
              }
            });
          }
        }}
        variant="danger"
      />
    </div>
  );
}
