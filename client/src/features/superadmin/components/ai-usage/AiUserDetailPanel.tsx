// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { AlertTriangle, Zap, LayoutTemplate } from "lucide-react";
import { formatNumber, formatRoleLabel } from "@/lib/utils";
import { AiUsageBar } from "@/components/ai/components/AiUsageBar";
import { GrantCreditsModal } from "../../components/GrantCredits";
import { DataTable } from "@/components/marketing_ui/data-table";
import { BlockUserAiUsage } from "../BlockUserAiUsage";
import { ResetUserDailyLimit } from "../ResetUserDailyLimit";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { PauseUserGrantedCredits } from "./PauseUserGrantedCredits";
import { RemoveUserGrantedCredits } from "./RemoveUserGrantedCredits";
import { ExtendUserGrantedCredits } from "./ExtendUserGrantedCredits";
import { ViewGrantedCreditsDetails } from "./ViewGrantedCreditsDetails";
import socketClient from "@/lib/socketClient";
import { useQueryClient } from "@tanstack/react-query";

function ResetCountdown({ resetAt }: { resetAt?: string | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!resetAt) return <span className="text-xs text-muted-foreground">Full limit available</span>;
  const left = Math.max(0, Math.floor((new Date(resetAt).getTime() - now) / 1000));
  if (left === 0) return <span className="text-xs text-muted-foreground">Resetting now</span>;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return <span className="text-xs text-muted-foreground tabular-nums">Resets in {d > 0 ? `${d}d ` : ""}{pad(h)}:{pad(m)}:{pad(s)}</span>;
}

function LimitTimerRow({ label, unit, timer }: { label: string; unit: string; timer?: { used: number; limit: number; resetAt?: string | null } | null }) {
  if (!timer) return null;
  const percent = timer.limit > 0 ? Math.min(100, Math.max(0, (timer.used / timer.limit) * 100)) : 0;
  return (
    <div className="w-full flex items-start justify-between">
      <div className="flex flex-col gap-1 pr-6 min-w-[150px]">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <ResetCountdown resetAt={timer.resetAt} />
      </div>
      <div className="flex-1 flex flex-col gap-1.5 mt-1">
        <div className="w-full flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-foreground">{Math.round(percent)}% Used</span>
          <span className="text-muted-foreground font-medium">{formatNumber(timer.used)} / {formatNumber(timer.limit)} {unit}</span>
        </div>
        <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

export function AiUserDetailPanel({ userDetail }: { userDetail: any }) {
  const [isGrantCreditsOpen, setIsGrantCreditsOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (socket) {
      socket.on("ai_usage_updated", () => {
         queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      });
      socket.on("ai_token_update", () => {
         queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      });
    }

    return () => {
      if (socket) {
        socket.off("ai_usage_updated");
        socket.off("ai_token_update");
      }
    };
  }, [queryClient]);

  if (!userDetail) return null;

  const isBlocked = userDetail.isBlocked;

  const aiBarData = {
    type: 'pro',
    used: userDetail.totalUsage || 0,
    limit: userDetail.ai_tokens?.ai_credits_balance || 0, 
    remaining: userDetail.balance || 0,
    freeData: {
      used: userDetail.ai_tokens?.used_this_week || 0,
      limit: userDetail.ai_tokens?.free_weekly_limit || 0,
      remaining: Math.max(0, (userDetail.ai_tokens?.free_weekly_limit || 0) - (userDetail.ai_tokens?.used_this_week || 0))
    }
  };

  const billingColumns = [
    {
      key: "date",
      header: "Date & Time",
      width: "w-[25%]",
      render: (_: any, row: any) => <span>{new Date(row.date).toLocaleString()}</span>
    },
    {
      key: "amount_inr",
      header: "Amount",
      width: "w-[25%]",
      render: (_: any, row: any) => <span>₹{row.amount_inr}</span>
    },
    {
      key: "credits_added",
      header: "Credits Bought",
      width: "w-[25%]",
      render: (_: any, row: any) => <span>{formatNumber(row.credits_added)}</span>
    },
    {
      key: "status",
      header: "Status",
      width: "w-[25%]",
      render: (_: any, row: any) => {
        let displayStatus = (row.status || '').toLowerCase();
        let colorClass = 'bg-muted text-muted-foreground';

        const allTopups = [...(userDetail.topupHistory || [])]
          .sort((a: any, b: any) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime());
        
        const totalPurchased = allTopups.reduce((s: number, t: any) => s + (t.credits_added || 0), 0);
        const remaining = userDetail?.ai_tokens?.ai_credits_balance || 0;
        let usedBudget = Math.max(0, totalPurchased - remaining);
        const endDateStr = userDetail?.ai_tokens?.ai_credits_end_date;
        const isExpired = endDateStr && new Date(endDateStr).getTime() < Date.now();

        displayStatus = 'Active';
        colorClass = 'bg-emerald-500/10 text-emerald-600';

        for (const t of allTopups) {
          const amt = t.credits_added || 0;
          const tId = t._id || t.id;
          const rowId = row._id || row.id;
          
          if (tId === rowId || String(tId) === String(rowId)) {
            const rowStatus = (row.status || t.status || '').toLowerCase();
            
            if (rowStatus === 'revoked') {
              displayStatus = 'Revoked';
              colorClass = 'bg-red-500/10 text-red-600';
            } else if (rowStatus === 'paused') {
              displayStatus = 'Paused';
              colorClass = 'bg-amber-500/10 text-amber-500';
            } else if (usedBudget >= amt) {
              displayStatus = 'Exhausted';
              colorClass = 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
            } else if (isExpired || rowStatus === 'expired') {
              displayStatus = 'Expired';
              colorClass = 'bg-red-500/10 text-red-600';
            } else {
              displayStatus = 'Active';
              colorClass = 'bg-emerald-500/10 text-emerald-600';
            }
            break;
          }
          
          if (usedBudget >= amt) {
            usedBudget -= amt;
          } else {
            usedBudget = 0;
          }
        }

        // Just to visually match the case you want (e.g., "Active" instead of "ACTIVE")
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
            {displayStatus}
          </span>
        );
      }
    }
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Overview and Usage Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Lifetime credit consumption & balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Total Credits Consumed</div>
                <div className="text-2xl font-bold">{formatNumber(userDetail.totalUsage || 0)}</div>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Available Credits</div>
                <div className="text-2xl font-bold">{formatNumber(userDetail.balance || 0)}</div>
              </div>
            </div>
            
            <div className="mt-4 border-t border-border/50 pt-4 flex flex-col gap-4">
              {/* 1. Personal Limits */}
              {(() => {
                const limit = userDetail.ai_tokens?.free_weekly_limit ?? 0;
                const used = userDetail.limitTimers?.tokens ? userDetail.limitTimers.tokens.used : (userDetail.ai_tokens?.used_this_week || 0);
                const percent = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
                return (
                  <div className="w-full flex items-start justify-between">
                    <div className="flex flex-col gap-1 pr-6 min-w-[150px]">
                      <span className="text-sm font-medium text-foreground">Personal Limits</span>
                      {userDetail.limitTimers ? <ResetCountdown resetAt={userDetail.limitTimers.tokens?.resetAt} /> : <span className="text-xs text-muted-foreground">Resets in 7 days</span>}
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 mt-1">
                      <div className="w-full flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{Math.round(percent)}% Used</span>
                        <span className="text-muted-foreground font-medium">{formatNumber(used)} / {formatNumber(limit)} Tokens</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              <LimitTimerRow label="Images" unit="Images" timer={userDetail.limitTimers?.image} />
              <LimitTimerRow label="WhatsApp" unit="Messages" timer={userDetail.limitTimers?.whatsapp} />

              {/* 2. Paid Credits */}
              {(() => {
                const limit = userDetail.ai_tokens?.total_ai_credits_purchased || 0;
                if (limit <= 0) return null;
                const remaining = userDetail.ai_tokens?.ai_credits_balance || 0;
                const used = Math.max(0, limit - remaining);
                const percent = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
                return (
                  <div className="w-full flex items-start justify-between">
                    <div className="flex flex-col gap-1 pr-6 min-w-[150px]">
                      <span className="text-sm font-medium text-foreground">Paid Credits</span>
                      <span className="text-xs text-muted-foreground">Purchased Top-Ups</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 mt-1">
                      <div className="w-full flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{Math.round(percent)}% Used</span>
                        <span className="text-muted-foreground font-medium">{formatNumber(used)} / {formatNumber(limit)} Tokens</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Granted Credits */}
              {(() => {
                const limit = userDetail.ai_tokens?.total_promotion_credits_granted || 0;
                const remaining = userDetail.ai_tokens?.promotion_credits_balance || 0;
                if (limit <= 0 && remaining <= 0) return null;
                const used = Math.max(0, limit - remaining);
                const percent = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
                return (
                  <div className="w-full flex items-start justify-between">
                    <div className="flex flex-col gap-1 pr-6 min-w-[150px]">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        Granted Credits
                        {userDetail.ai_tokens?.promotion_credits_paused && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Paused</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">Promotional limit</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 mt-1">
                      <div className="w-full flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{Math.round(percent)}% Used</span>
                        <span className="text-muted-foreground font-medium">{formatNumber(used)} / {formatNumber(limit)} Tokens</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 4. Org Pool (Only for Admin/Owner) */}
              {(() => {
                if (userDetail.role !== 'org_admin' && userDetail.role !== 'Owner') return null;
                if (!userDetail.orgPool) return null;
                const limit = userDetail.orgPool.limit || 0;
                const used = userDetail.orgPool.used || 0;
                const percent = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
                return (
                  <div className="w-full flex items-start justify-between">
                    <div className="flex flex-col gap-1 pr-6 min-w-[150px]">
                      <span className="text-sm font-medium text-foreground">Org Pool</span>
                      <span className="text-xs text-muted-foreground">Shared Pro pool</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 mt-1">
                      <div className="w-full flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{Math.round(percent)}% Used</span>
                        <span className="text-muted-foreground font-medium">{formatNumber(used)} / {formatNumber(limit)} Tokens</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">User ID</div>
              <div className="font-mono text-sm mt-1 truncate">{userDetail.id}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Name</div>
              <div className="text-sm font-medium mt-1">{userDetail.name || "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Email</div>
              <div className="text-sm font-medium mt-1">{userDetail.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Role</div>
              <div className="text-sm font-medium mt-1">{formatRoleLabel(userDetail.role)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Chat Sessions</div>
              <div className="text-sm font-medium mt-1">{formatNumber(userDetail.totalChats || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Status</div>
              <div className="mt-1">
                {isBlocked ? (
                  <span className="inline-flex items-center text-sm font-medium text-red-500">
                    <AlertTriangle className="w-4 h-4 mr-1.5" /> Blocked
                  </span>
                ) : (
                  <span className="inline-flex items-center text-sm font-medium text-muted-foreground">
                    <Zap className="w-4 h-4 mr-1.5" /> Active
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Billing Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
          <CardDescription>Track payments and credits purchased</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
             <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Total Payments Made</div>
                <div className="text-2xl font-bold">{formatNumber(userDetail.topupHistory?.length || 0)}</div>
             </div>
             <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Total Credits Bought</div>
                <div className="text-2xl font-bold">{formatNumber(userDetail.topupHistory?.reduce((acc: any, t: any) => acc + (t.credits_added || 0), 0) || 0)}</div>
             </div>
             <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Available Credits</div>
                <div className="text-2xl font-bold">{formatNumber(userDetail.balance || 0)}</div>
             </div>
          </div>

          <DataTable 
            columns={billingColumns} 
            rows={userDetail.topupHistory || []} 
            emptyMessage="No payment history. This user hasn't made any purchases yet."
          />
        </CardContent>
      </Card>

      {/* Grant Credits Card */}
      <div className="border border-border rounded-xl shadow-sm bg-card">
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              Grant User Credits
            </h3>
            <p className="text-sm text-muted-foreground">
              Open the AI Hub Panel to securely grant tokens to {userDetail.name || "this user"}.
            </p>
          </div>
        </div>
        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-end">
          <Button variant="outline" onClick={() => setIsGrantCreditsOpen(true)}>
            <LayoutTemplate className="w-4 h-4 mr-2" />
            Open Grant Credits Panel
          </Button>
        </div>
      </div>

      {((userDetail.promotionHistory || []).filter((h: any) => h.type === 'grant' || h.type === 'granted').length > 0 || userDetail.ai_tokens?.total_promotion_credits_granted > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-purple-500">Granted Credits</CardTitle>
            <CardDescription>Promotional AI credits granted to this user</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable 
              columns={[
                {
                  key: "grantedBy",
                  header: "Granted By",
                  width: "w-[25%]",
                  render: () => (
                    <div className="flex items-center gap-3">
                      <img 
                        src={currentUser?.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || "Super Admin")}&background=random`} 
                        alt={currentUser?.name || "Super Admin"} 
                        className="w-8 h-8 rounded-full object-cover shrink-0" 
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground truncate">{currentUser?.name || "Super Admin"}</span>
                        <span className="text-xs text-muted-foreground truncate">{currentUser?.email || ""}</span>
                      </div>
                    </div>
                  )
                },
                {
                  key: "dates",
                  header: "Dates",
                  width: "w-[20%]",
                  render: (_: any, row: any) => (
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span className="truncate">Granted: {row.date ? new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}</span>
                      <span className="truncate">Expires: {userDetail.ai_tokens?.promotion_credits_end_date ? new Date(userDetail.ai_tokens.promotion_credits_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}</span>
                    </div>
                  )
                },
                {
                  key: "credits",
                  header: "Credits Added",
                  width: "w-[25%]",
                  render: (_: any, row: any) => {
                    return (
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-base">+{formatNumber(row.credits_added || 0)}</span>
                        <span className="text-xs text-muted-foreground">to Promotional Pool</span>
                      </div>
                    )
                  }
                },
                {
                  key: "status",
                  header: "Pool Status",
                  width: "w-[10%]",
                  render: (_: any, row: any) => {
                    const rowStatus = (row.status || '').toLowerCase();
                    
                    let statusLabel = "ACTIVE";
                    let statusClass = "bg-green-500/10 text-green-500";

                    if (rowStatus === 'revoked') {
                      statusLabel = "REVOKED";
                      statusClass = "bg-red-500/10 text-red-500";
                    } else if (rowStatus === 'paused') {
                      statusLabel = "PAUSED";
                      statusClass = "bg-amber-500/10 text-amber-500";
                    } else if (rowStatus === 'expired') {
                      statusLabel = "EXPIRED";
                      statusClass = "bg-red-500/10 text-red-500";
                    } else {
                      // For active/success grants, check if exhausted via waterfall
                      const allGrants = [...(userDetail.promotionHistory || [])]
                        .filter((h: any) => h.type === 'grant' || h.type === 'granted')
                        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                      
                      const activeGrants = allGrants.filter((g: any) => {
                        const s = (g.status || '').toLowerCase();
                        return s === 'success' || s === 'pending' || s === 'active';
                      });
                      const totalActiveGranted = activeGrants.reduce((s: number, g: any) => s + (g.credits_added || 0), 0);
                      const remaining = userDetail.ai_tokens?.promotion_credits_balance || 0;
                      let usedBudget = Math.max(0, totalActiveGranted - remaining);
                      
                      for (const g of activeGrants) {
                        const amt = g.credits_added || 0;
                        const gId = g._id || g.id;
                        const rowId = row._id || row.id;
                        if (String(gId) === String(rowId)) {
                          if (usedBudget >= amt) {
                            statusLabel = "EXHAUSTED";
                            statusClass = "bg-slate-500/10 text-slate-600 dark:text-slate-400";
                          }
                          break;
                        }
                        if (usedBudget >= amt) {
                          usedBudget -= amt;
                        } else {
                          usedBudget = 0;
                        }
                      }
                      
                      // Check expiry on the individual row
                      const endDate = row.metadata?.endDate || row.endDate;
                      if (endDate && new Date(endDate).getTime() < Date.now() && statusLabel === "ACTIVE") {
                        statusLabel = "EXPIRED";
                        statusClass = "bg-red-500/10 text-red-500";
                      }
                    }

                    return (
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
                        {statusLabel}
                      </span>
                    );
                  }
                },
                {
                  key: "actions",
                  header: "Pool Actions",
                  width: "w-[25%]",
                  render: (_: any, row: any) => {
                    const rowStatus = (row.status || '').toLowerCase();
                    const isRowRevoked = rowStatus === 'revoked';
                    const isRowPaused = rowStatus === 'paused';
                    const limit = row.credits_added || 0;

                    let statusLabel = "ACTIVE";
                    if (isRowRevoked) statusLabel = "REVOKED";
                    else if (isRowPaused) statusLabel = "PAUSED";
                    else if (rowStatus === 'expired') statusLabel = "EXPIRED";

                      return (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 min-w-0 max-w-full scrollbar-thin scrollbar-thumb-muted-foreground/20 [&>*]:shrink-0">
                          <ViewGrantedCreditsDetails used={0} limit={limit} history={userDetail.promotionHistory || []} status={statusLabel} transactionId={row.id || row._id} />
                          {!isRowRevoked && (
                            <>
                              <ExtendUserGrantedCredits userId={userDetail.id} currentExpiry={row.metadata?.endDate || row.endDate || userDetail.ai_tokens?.promotion_credits_end_date} />
                              <PauseUserGrantedCredits userId={userDetail.id} transactionId={row.id || row._id} isPaused={isRowPaused} />
                              <RemoveUserGrantedCredits userId={userDetail.id} transactionId={row.id || row._id} />
                            </>
                          )}
                        </div>
                      )
                  }
                }
              ]} 
              rows={(userDetail.promotionHistory || []).filter((h: any) => h.type === 'grant' || h.type === 'granted').map((h: any, i: number) => ({ ...h, id: h.id || h._id || i }))} 
              emptyMessage="No active granted credits."
            />
          </CardContent>
        </Card>
      )}

      <BlockUserAiUsage userId={userDetail.id} userName={userDetail.name || userDetail.email} isBlocked={isBlocked} />
      
      <ResetUserDailyLimit userId={userDetail.id} userName={userDetail.name || userDetail.email} />

      <GrantCreditsModal 
        isOpen={isGrantCreditsOpen} 
        onClose={() => setIsGrantCreditsOpen(false)}
        orgs={[{
          id: userDetail.id,
          name: userDetail.name || "N/A",
          orgName: userDetail.orgName || "",
          email: userDetail.email,
          role: formatRoleLabel(userDetail.role),
          avatar: userDetail.profilePicture
        }]}
      />
    </div>
  );
}