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

import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUnifiedRequests, processJoinRequest, processRoleRequest } from "../services/chatApi";
import { ArrowLeft, Check, X, Users, Search, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_USER_AVATAR } from "@/lib/constants";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

export function JoinRequestPage() {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'history'>('incoming');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["join-requests", "unified"],
    queryFn: fetchUnifiedRequests,
  });

  const { mutate: processRequest, isPending: isProcessing } = useMutation({
    mutationFn: ({ type, groupId, requestId, status }: { type?: string; groupId: string; requestId: string; status: 'approved' | 'rejected' }) => {
      if (type === 'role_request') {
        return processRoleRequest(requestId, status);
      }
      return processJoinRequest(groupId, requestId, status);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["join-requests", "unified"] });
      toast.success(`Request ${variables.status}`);
    },
    onError: (err: any) => {
      // apiClient puts the server's body on the error itself ({ error } or { message })
      toast.error(err?.error || err?.message || "Failed to process request");
    }
  });

  if (isLoading) {
    // Skeleton with the same layout as the loaded page (tabs + request cards)
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="max-w-5xl mx-auto p-4 py-8 w-full flex-1">
          {user?.role === 'student' ? (
            <Skeleton className="h-6 w-32 mb-6" />
          ) : (
            <div className="flex gap-4 border-b border-border mb-8 pb-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-28" />
            </div>
          )}
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border rounded-xl gap-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64 max-w-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-24 rounded-lg" />
                  <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // A failed load must not look like "All caught up"
  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center px-4">
        <p className="text-base font-semibold text-foreground">Couldn't load requests</p>
        <p className="text-sm text-muted-foreground">Check your connection and try again.</p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {isFetching ? <Spinner className="w-4 h-4" /> : null}
          Retry
        </button>
      </div>
    );
  }

  const isStudent = user?.role === 'student';
  // Force student to see outgoing if somehow they end up on incoming
  const currentTab = isStudent ? 'outgoing' : activeTab;

  const allIncoming = data?.incoming || [];
  const incomingRequests = allIncoming.filter((req: any) => req.status === 'pending');
  const historyRequests = allIncoming.filter((req: any) => req.status !== 'pending');
  const outgoingRequests = data?.outgoing || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">


      <div className="max-w-5xl mx-auto p-4 py-8 w-full flex-1">
        
        {/* Tabs */}
        {!isStudent && (
          <div className="flex gap-4 border-b border-border mb-8">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 relative ${
                activeTab === 'incoming' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
              }`}
            >
              Incoming Requests
              {incomingRequests.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full">
                  {incomingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'outgoing' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
              }`}
            >
              My Requests
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'history' ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
              }`}
            >
              History
            </button>
          </div>
        )}

        {isStudent && (
          <div className="mb-6">
            <h2 className="text-lg font-bold">My Requests</h2>
          </div>
        )}

        {/* Content */}
        {activeTab === 'incoming' && (
          <div className="space-y-4">
            {incomingRequests.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-xl border border-border border-dashed">
                <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">All caught up</h3>
                <p className="text-muted-foreground text-sm mt-1">You have no pending requests to approve.</p>
              </div>
            ) : (
              incomingRequests.map((req) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <img 
                      src={req.user_avatar || DEFAULT_USER_AVATAR} 
                      alt={req.user_name} 
                      className="w-12 h-12 rounded-full object-cover bg-primary/10 border border-border shrink-0"
                    />
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        {req.user_name}
                      </h3>
                      {req.user_email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{req.user_email}</p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Requested to join <strong className="text-foreground">{req.group?.name}</strong> on {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <button
                      onClick={() => processRequest({ type: req.type, groupId: req.group_id, requestId: req.id, status: 'approved' })}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium shadow-sm"
                    >
                      <Check className="w-4 h-4" /> Accept
                    </button>
                    <button
                      onClick={() => processRequest({ type: req.type, groupId: req.group_id, requestId: req.id, status: 'rejected' })}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 text-destructive hover:bg-destructive hover:text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                    >
                      <X className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'outgoing' && (
          <div className="space-y-4">
            {outgoingRequests.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-xl border border-border border-dashed">
                <Search className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No requests sent</h3>
                <p className="text-muted-foreground text-sm mt-1">You haven't requested to join any groups recently.</p>
              </div>
            ) : (
              outgoingRequests.map((req: any) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 overflow-hidden">
                       {req.group?.avatar ? (
                          <img src={req.group.avatar} alt={req.group.name} className="w-full h-full object-cover" />
                       ) : (
                          <Users className="w-5 h-5 text-primary" />
                       )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{req.group?.name || 'Unknown Group'}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Requested on {new Date(req.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center self-start sm:self-center">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                      req.status === 'pending' ? 'bg-warning/10 text-warning' :
                      req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {historyRequests.length === 0 ? (
              <div className="text-center py-20 bg-muted/20 rounded-xl border border-border border-dashed">
                <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No history</h3>
                <p className="text-muted-foreground text-sm mt-1">You haven't approved or rejected any requests yet.</p>
              </div>
            ) : (
              historyRequests.map((req: any) => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-card border border-border rounded-xl shadow-sm gap-4 opacity-75">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <img 
                      src={req.user_avatar || DEFAULT_USER_AVATAR} 
                      alt={req.user_name} 
                      className="w-12 h-12 rounded-full object-cover bg-primary/10 border border-border shrink-0 grayscale"
                    />
                    <div>
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        {req.user_name}
                      </h3>
                      {req.user_email && (
                        <p className="text-xs text-muted-foreground mt-0.5">{req.user_email}</p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> Requested to join <strong className="text-foreground">{req.group?.name}</strong> on {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center self-start sm:self-center">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                      req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
}
