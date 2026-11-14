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
import React, { useState } from "react";
import { useMyAiBalance, useMyAiHistory } from "@/components/ai/queries/useAiCredits";
import { formatNumber, cn } from "@/lib/utils";
import { Wallet, Search, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { Progress } from "@/components/marketing_ui/progress";
import { Input } from "@/components/marketing_ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { Calendar } from "@/components/marketing_ui/nikhil_calendar";
import { Button } from "@/components/marketing_ui/button";
import { format } from "date-fns";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";

import { getSocket } from "@/lib/socketClient";
import { useQueryClient } from "@tanstack/react-query";

export function AiCreditsPanel() {
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useMyAiBalance();
  const { data: history, isLoading: historyLoading } = useMyAiHistory();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  React.useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    
    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ["my-ai-balance"] });
      queryClient.invalidateQueries({ queryKey: ["my-ai-history"] });
    };

    socket.on("ai_token_update", handleUpdate);
    return () => {
      socket.off("ai_token_update", handleUpdate);
    };
  }, [queryClient]);

  if (balanceLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  const isBlocked = balance?.ai_access_blocked;
  
  // Calculate usage
  const totalLimit = balance?.free_weekly_limit || 0;
  const consumed = balance?.tokens_consumed_this_week || 0;
  const remaining = Math.max(0, totalLimit - consumed);
  const usagePercent = totalLimit > 0 ? (consumed / totalLimit) * 100 : 0;
  
  const purchasedCredits = balance?.ai_credits_balance || 0;

  // Filter history
  const filteredHistory = history?.filter((txn: any) => {
    // Exclude internal audit records
    if (txn.type === 'pause' || txn.type === 'resume' || txn.type === 'revoke') {
      return false;
    }
    
    let match = true;
    if (searchTerm) {
      match = txn.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
              txn.status.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if (dateFilter && match) {
      match = format(new Date(txn.createdAt), "yyyy-MM-dd") === dateFilter;
    }
    return match;
  });

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="p-6 border-b border-border">
        <h2 className="text-2xl font-bold mb-2">AI Credits</h2>
        <p className="text-muted-foreground text-sm">Manage your token balance and top-up your account.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {isBlocked && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-400 p-4 rounded-lg flex items-start gap-3 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">AI Access Blocked</h4>
              <p className="text-sm mt-1">Your AI access has been suspended by the administrator. Top-ups are disabled.</p>
            </div>
          </div>
        )}

        {/* AWS Style Credit Pools */}
        <div className="space-y-6 mb-6">
          {balance?.pools?.filter((p: any) => p.creditType !== "Free").map((pool: any) => {
            const issuedAmount = pool.issuedAmount || 0;
            const remainingAmount = Math.max(0, pool.amountRemaining || 0);
            const estimatedRemaining = pool.estimatedAmountRemaining || 0;
            const usedAmount = Math.min(issuedAmount, Math.max(0, issuedAmount - (pool.amountRemaining || 0)));
            const rawPercent = issuedAmount > 0 ? (usedAmount / issuedAmount) * 100 : 0;
            const percentUsed = Math.min(100, rawPercent);
            
            const isPromo = pool.creditType === "Promotion";
            const isPaid = pool.creditType === "Paid";
            
            // Calculate dynamic status based on the "current" (oldest unexhausted) transaction
            let dynamicStatus = pool.status;
            
            if (isPromo && history) {
              const allGrants = history
                .filter((t: any) => t.type === 'grant')
                .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              const activeGrants = allGrants.filter((g: any) => {
                  const s = (g.status || '').toLowerCase();
                  return s !== 'revoked' && s !== 'paused';
              });
              
              const totalActiveGranted = activeGrants.reduce((s: number, g: any) => s + (g.credits_added || 0), 0);
              let usedBudget = Math.max(0, totalActiveGranted - (pool.amountRemaining || 0));
              
              for (const g of allGrants) {
                const amt = g.credits_added || 0;
                const gStatus = (g.status || '').toLowerCase();
                const isGrantActive = gStatus !== 'revoked' && gStatus !== 'paused';
                
                if (usedBudget < amt && isGrantActive) {
                  const lowerStatus = g.status?.toLowerCase() || '';
                  if (lowerStatus === 'revoked') dynamicStatus = 'Revoked';
                  else if (lowerStatus === 'paused') dynamicStatus = 'Paused';
                  else if (lowerStatus === 'expired') dynamicStatus = 'Expired';
                  break;
                }
                
                if (isGrantActive) {
                    usedBudget -= amt;
                }
              }
            } else if (isPaid && history) {
              const allTopups = history
                .filter((t: any) => t.type === 'topup')
                .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              const totalPurchased = allTopups.reduce((s: number, t: any) => s + (t.credits_added || 0), 0);
              let usedBudget = Math.max(0, totalPurchased - (pool.amountRemaining || 0));
              
              for (const t of allTopups) {
                const amt = t.credits_added || 0;
                if (usedBudget < amt) {
                  const lowerStatus = t.status?.toLowerCase() || '';
                  if (lowerStatus === 'revoked') dynamicStatus = 'Revoked';
                  else if (lowerStatus === 'paused') dynamicStatus = 'Paused';
                  else if (lowerStatus === 'expired') dynamicStatus = 'Expired';
                  break;
                }
                usedBudget -= amt;
              }
            }

            let finalDisplayStatus = dynamicStatus;
            if (dynamicStatus === 'Active') {
              if (pool.amountRemaining <= 0) finalDisplayStatus = 'Exhausted';
              else if (pool.expirationDate && new Date(pool.expirationDate).getTime() < new Date().getTime()) finalDisplayStatus = 'Expired';
            }
            
            // User requested to only use blue bar (bg-blue-500) to match the main Usage page
            let typeColorClass = "text-blue-500";
            let typeBgClass = "bg-blue-500";

            return (
              <div key={pool.creditId} className="bg-card border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
                {isPromo && (
                  <div className="absolute top-0 right-0 bg-purple-500/10 text-purple-500 text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Promotion / Granted
                  </div>
                )}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-border gap-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                      <Wallet className={cn("w-5 h-5", typeColorClass)} />
                      Credit details <span className="text-sm font-normal text-muted-foreground ml-2">ID: {pool.creditId}</span>
                    </h3>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    <div className="font-medium text-foreground">
                      {finalDisplayStatus}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Start date</div>
                    <div className="font-medium">
                      {pool.startDate ? format(new Date(pool.startDate), "d/M/yyyy") : "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Issued credits</div>
                    <div className="font-semibold text-lg">{formatNumber(issuedAmount)} <span className="text-sm font-normal text-muted-foreground">Credits</span></div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Expiration date</div>
                    <div className="font-medium">
                      {pool.expirationDate ? format(new Date(pool.expirationDate), "d/M/yyyy") : "Never"}
                    </div>
                  </div>
                  
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground mb-1">Credits remaining</div>
                    <div className="font-semibold text-lg">{formatNumber(remainingAmount)} <span className="text-sm font-normal text-muted-foreground">Credits</span></div>
                  </div>
                  
                </div>
                
                {issuedAmount > 0 && pool.status !== 'Revoked' && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="w-full flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {Math.round(percentUsed)}% Used
                        </span>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>Used: <strong className="font-medium">{formatNumber(usedAmount)}</strong></span>
                          <span>Remaining: <strong className="font-medium">{formatNumber(remainingAmount)}</strong></span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", typeBgClass)}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Transaction History Table */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h3 className="text-lg font-semibold">Billing History</h3>
            
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search payments..." 
                  className="pl-9 h-9 w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="shrink-0 w-[160px] relative overflow-hidden">
                <NikhilTimeCalendar
                  value={dateFilter ? new Date(dateFilter) : undefined}
                  onChange={(d: Date | undefined) => setDateFilter(d ? d.toISOString() : "")}
                  placeholder="Select Date"
                  popDirection="down"
                  showTime={false}
                  className="h-9 w-full pr-8"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDateFilter(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent bg-background"
                    title="Clear date"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Credits Added</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ) : filteredHistory?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredHistory?.map((txn: any) => (
                      <TableRow key={txn._id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(txn.createdAt), "MMM dd, yyyy h:mm a")}
                        </TableCell>                          <TableCell className="font-medium">
                            {txn.type === "topup" ? "Top-Up" : "Credit Grant"}
                          </TableCell>
                        <TableCell className="text-muted-foreground">
                          {txn.amount_inr ? `₹${formatNumber(txn.amount_inr)}` : "-"}
                        </TableCell>
                        <TableCell className="font-bold text-foreground">
                          +{formatNumber(txn.credits_added)}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            let displayStatus = txn.status;
                            let colorClass = 'bg-muted text-muted-foreground';

                            const lowerStatus = txn.status?.toLowerCase() || '';

                            if (lowerStatus === 'revoked') {
                              displayStatus = 'Revoked';
                              colorClass = 'bg-red-500/10 text-red-600';
                            } else if (lowerStatus === 'paused') {
                              displayStatus = 'Paused';
                              colorClass = 'bg-amber-500/10 text-amber-600';
                            } else if (lowerStatus === 'expired') {
                              displayStatus = 'Expired';
                              colorClass = 'bg-red-500/10 text-red-600';
                            } else if (lowerStatus === 'success' || lowerStatus === 'active') {
                              const now = new Date().getTime();
                              const isTopup = txn.type === "topup";
                              const endDateStr = isTopup ? balance?.ai_credits_end_date : balance?.promotion_credits_end_date;
                              
                              if (endDateStr && new Date(endDateStr).getTime() < now) {
                                  displayStatus = 'Expired';
                                  colorClass = 'bg-red-500/10 text-red-600';
                              } else {
                                  displayStatus = 'Active';
                                  colorClass = 'bg-emerald-500/10 text-emerald-600';
                              }
                            }

                            if (txn.type === 'grant') {
                              // Waterfall: walk through all valid grants oldest-first
                              const allGrants = (filteredHistory || [])
                                .filter((t: any) => t.type === 'grant')
                                .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                              
                              const activeGrants = allGrants.filter((g: any) => {
                                const s = (g.status || '').toLowerCase();
                                return s !== 'revoked' && s !== 'paused';
                              });
                              
                              const promoPool = balance?.pools?.find((p: any) => p.creditType === "Promotion");
                              const totalGranted = activeGrants.reduce((s: number, g: any) => s + (g.credits_added || 0), 0);
                              const poolRemaining = promoPool?.amountRemaining ?? 0;
                              let usedBudget = Math.max(0, totalGranted - poolRemaining);

                              // Walk oldest-first and consume
                              for (const g of allGrants) {
                                const amt = g.credits_added || 0;
                                const isGrantActive = (g.status || '').toLowerCase() !== 'revoked' && (g.status || '').toLowerCase() !== 'paused';
                                
                                if (g._id === txn._id) {
                                  // This is the current row
                                  if (promoPool?.status === 'Revoked' || lowerStatus === 'revoked') {
                                    displayStatus = 'Revoked';
                                    colorClass = 'bg-red-500/10 text-red-600';
                                  } else if (promoPool?.status === 'Paused' || lowerStatus === 'paused') {
                                    displayStatus = 'Paused';
                                    colorClass = 'bg-amber-500/10 text-amber-600';
                                  } else if (usedBudget >= amt) {
                                    displayStatus = 'Exhausted';
                                    colorClass = 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
                                  } else if (promoPool?.expirationDate && new Date(promoPool.expirationDate).getTime() < Date.now()) {
                                    displayStatus = 'Expired';
                                    colorClass = 'bg-red-500/10 text-red-600';
                                  } else {
                                    displayStatus = 'Active';
                                    colorClass = 'bg-emerald-500/10 text-emerald-600';
                                  }
                                  break;
                                }
                                // Consume this grant's credits from the used budget ONLY if it is an active grant
                                if (isGrantActive) {
                                  if (usedBudget >= amt) {
                                    usedBudget -= amt;
                                  } else {
                                    usedBudget = 0;
                                  }
                                }
                              }
                            } else if (txn.type === 'topup') {
                              // Waterfall: walk through all valid topups oldest-first
                              const allTopups = (filteredHistory || [])
                                .filter((t: any) => t.type === 'topup')
                                .sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                              const paidPool = balance?.pools?.find((p: any) => p.creditType === "Paid");
                              const totalPurchased = allTopups.reduce((s: number, t: any) => s + (t.credits_added || 0), 0);
                              const paidRemaining = paidPool?.amountRemaining ?? 0;
                              let usedBudget = Math.max(0, totalPurchased - paidRemaining);

                              for (const t of allTopups) {
                                const amt = t.credits_added || 0;
                                if (t._id === txn._id) {
                                  if (lowerStatus === 'revoked') {
                                    displayStatus = 'Revoked';
                                    colorClass = 'bg-red-500/10 text-red-600';
                                  } else if (lowerStatus === 'paused') {
                                    displayStatus = 'Paused';
                                    colorClass = 'bg-amber-500/10 text-amber-600';
                                  } else if (usedBudget >= amt) {
                                    displayStatus = 'Exhausted';
                                    colorClass = 'bg-slate-500/10 text-slate-600 dark:text-slate-400';
                                  } else if (paidPool?.expirationDate && new Date(paidPool.expirationDate).getTime() < Date.now()) {
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
                            }

                            return (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                                {displayStatus}
                              </span>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
