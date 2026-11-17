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
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { AlertTriangle, Zap } from "lucide-react";
import { formatNumber, formatRoleLabel } from "@/lib/utils";
import { GrantCreditsModal } from "../../components/GrantCredits";
import { DataTable } from "@/components/marketing_ui/data-table";
import { BlockUserAiUsage } from "../BlockUserAiUsage";
import { ResetUserDailyLimit } from "../ResetUserDailyLimit";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { PauseUserGrantedCredits } from "./PauseUserGrantedCredits";
import { RemoveUserGrantedCredits } from "./RemoveUserGrantedCredits";
import { ExtendUserGrantedCredits } from "./ExtendUserGrantedCredits";
import { ViewGrantedCreditsDetails } from "./ViewGrantedCreditsDetails";
import { GiftPlanForm } from "./GiftPlanForm";
import { PlanHeaderCard, PlanUsageBars, PlanHistoryList, UserUsageHistory } from "./UserPlanUsage";
import socketClient from "@/lib/socketClient";
import { useQueryClient } from "@tanstack/react-query";

// One credit balance as a bar (paid top-ups, granted credits, the org pool), under Credits
function CreditBar({ label, sub, used, limit, color, badge }: { label: string; sub: string; used: number; limit: number; color: string; badge?: React.ReactNode }) {
  const percent = limit > 0 ? Math.min(100, Math.max(0, (used / limit) * 100)) : 0;
  return (
    <div className="w-full flex flex-col sm:flex-row sm:items-start justify-between gap-2">
      <div className="flex flex-col gap-1 sm:pr-6 sm:min-w-[150px]">
        <span className="text-sm font-medium text-foreground flex items-center gap-2">{label}{badge}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 mt-1">
        <div className="w-full flex items-center justify-between text-xs mb-1">
          <span className="font-medium text-foreground">{Math.round(percent)}% used</span>
          <span className="text-muted-foreground font-medium">{formatNumber(used)} / {formatNumber(limit)} credits</span>
        </div>
        <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
          <div className={`h-full w-[var(--w)] ${color} rounded-full transition-all`} style={{ "--w": `${percent}%` } as React.CSSProperties} />
        </div>
      </div>
    </div>
  );
}

export function AiUserDetailPanel({ userDetail }: { userDetail: any }) {
  const [isGrantCreditsOpen, setIsGrantCreditsOpen] = useState(false);
  const [isGiftPlanOpen, setIsGiftPlanOpen] = useState(false);
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = socketClient.getSocket();
    if (!socket) return;
    // (its own handler, so leaving this page never removes the Plans & Usage page's listener)
    const refresh = () => queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
    socket.on("ai_usage_updated", refresh);
    socket.on("ai_token_update", refresh);
    return () => {
      socket.off("ai_usage_updated", refresh);
      socket.off("ai_token_update", refresh);
    };
  }, [queryClient]);

  if (!userDetail) return null;

  const isBlocked = userDetail.isBlocked;
  const userId = String(userDetail._id || userDetail.id || userDetail.userId || "");

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

  const paidLimit = userDetail.ai_tokens?.total_ai_credits_purchased || 0;
  const paidLeft = userDetail.ai_tokens?.ai_credits_balance || 0;
  const grantLimit = userDetail.ai_tokens?.total_promotion_credits_granted || 0;
  const grantLeft = userDetail.ai_tokens?.promotion_credits_balance || 0;
  const showOrgPool = (userDetail.role === 'org_admin' || userDetail.role === 'Owner') && userDetail.orgPool;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">

      {/* 1. The plan (with the two gift buttons) and the account */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PlanHeaderCard
            userId={userId}
            plan={userDetail.plan}
            overview={userDetail.overview}
            student={userDetail.student}
            onGift={() => setIsGiftPlanOpen(true)}
            onGrant={() => setIsGrantCreditsOpen(true)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Name</div>
              <div className="text-sm font-medium mt-1">{userDetail.name || "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Email</div>
              <div className="text-sm font-medium mt-1 break-all">{userDetail.email}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Role</div>
                <div className="text-sm font-medium mt-1">{formatRoleLabel(userDetail.role)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Chats</div>
                <div className="text-sm font-medium mt-1">{formatNumber(userDetail.totalChats || 0)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">AI access</div>
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
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">User ID</div>
              <div className="font-mono text-xs mt-1 truncate text-muted-foreground">{userDetail.id}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. The usage bars, as the user sees them in Settings > Usage */}
      <PlanUsageBars overview={userDetail.overview} />

      {/* 3. Plans given or ended by hand, with the reasons */}
      <PlanHistoryList rows={userDetail.planHistory} />

      {/* 4. The usage history */}
      <UserUsageHistory userId={userId} />

      {/* 5. Credits: paid top-ups and granted credits */}
      <div className="flex flex-col gap-1 pt-2">
        <h2 className="text-lg font-semibold text-foreground">Credits</h2>
        <p className="text-sm text-muted-foreground">Top-ups the user bought and credits given by hand. They are used after the limits of the plan.</p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
              <div className="text-sm text-muted-foreground mb-1">Credits used, all time</div>
              <div className="text-2xl font-bold">{formatNumber(userDetail.totalUsage || 0)}</div>
            </div>
            <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
              <div className="text-sm text-muted-foreground mb-1">Top-up credits left</div>
              <div className="text-2xl font-bold">{formatNumber(userDetail.balance || 0)}</div>
            </div>
          </div>
          {paidLimit > 0 && (
            <CreditBar label="Paid Credits" sub="Top-ups bought" used={Math.max(0, paidLimit - paidLeft)} limit={paidLimit} color="bg-emerald-500" />
          )}
          {(grantLimit > 0 || grantLeft > 0) && (
            <CreditBar
              label="Granted Credits"
              sub="Given by hand"
              used={Math.max(0, grantLimit - grantLeft)}
              limit={grantLimit}
              color="bg-purple-500"
              badge={userDetail.ai_tokens?.promotion_credits_paused ? <span className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Paused</span> : null}
            />
          )}
          {showOrgPool && (
            <CreditBar label="Org Pool" sub="Shared pool" used={userDetail.orgPool.used || 0} limit={userDetail.orgPool.limit || 0} color="bg-orange-500" />
          )}
          {paidLimit <= 0 && grantLimit <= 0 && grantLeft <= 0 && !showOrgPool && (
            <p className="text-sm text-muted-foreground">No paid or granted credits.</p>
          )}
        </CardContent>
      </Card>

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

      {/* Gift a plan: the main action (the plan header's first button) */}
      <Dialog open={isGiftPlanOpen} onOpenChange={setIsGiftPlanOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gift a plan</DialogTitle>
            <DialogDescription>Give {userDetail.name || userDetail.email} a plan for a while. They get an email.</DialogDescription>
          </DialogHeader>
          <GiftPlanForm userIds={[userId]} who={userDetail.name || userDetail.email} idPrefix="user-gift" onDone={() => setIsGiftPlanOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Gift credits: the second, smaller option (the panel also has Gift a plan) */}
      <GrantCreditsModal
        isOpen={isGrantCreditsOpen}
        onClose={() => setIsGrantCreditsOpen(false)}
        initialMode="credits"
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