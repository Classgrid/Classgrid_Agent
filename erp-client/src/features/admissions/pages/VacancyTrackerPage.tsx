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

import { useQuery } from "@tanstack/react-query";
import {  RefreshCw } from "lucide-react";

import { getSeatMatrix } from "../api";
import { RefreshButton } from "@/components/marketing_ui/refresh-button";
import { Spinner } from "@/components/marketing_ui/spinner";


export function VacancyTrackerPage() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admission-seat-matrix"],
    queryFn: getSeatMatrix,
    refetchInterval: 10000, // Poll every 10 seconds for real-time feel
  });

  const seatMatrixData = data?.data || [];

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vacancy & Seat Tracker</h1>
          <p className="text-muted-foreground mt-1">Live dashboard monitoring available seats, waitlists, and quotas across branches.</p>
        </div>
        <div>
          <RefreshButton onClick={() => refetch()} isFetching={isRefetching} label="Refresh Now" />
        </div>
      </div>

      {isError && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md border border-red-200">
          <strong>Error</strong>
          <br/>Could not load the live seat matrix.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size={24} className=" text-primary" />
        </div>
      ) : seatMatrixData.length === 0 ? (
        <div className="bg-card border border-border rounded-xl shadow-sm mb-6 p-6">
          <div className="text-center p-8 text-muted-foreground">
            <h2 className="text-lg font-bold text-foreground mb-2">No Seat Matrix Configured</h2>
            <p>Seat quotas and capacities are not currently configured for this admission cycle.</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {seatMatrixData.map((branchConfig: any) => (
            <div key={branchConfig._id} className="bg-card border border-border rounded-xl shadow-sm">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-bold">{branchConfig.hierarchy_id?.name || "Institution Level"}</h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(branchConfig.quotas || []).map((quota: any) => {
                    const vacancy = quota.capacity - quota.filled;
                    const fillRate = (quota.filled / quota.capacity) * 100;
                    
                    let statusColor = "hsl(var(--emerald-500))";
                    let bgStatusColor = "bg-emerald-500";
                    if (fillRate >= 100) { statusColor = "hsl(var(--red-500))"; bgStatusColor = "bg-red-500"; }
                    else if (fillRate >= 80) { statusColor = "hsl(var(--amber-500))"; bgStatusColor = "bg-amber-500"; }

                    return (
                      <div
                        key={quota.name}
                        className="relative border border-border rounded-lg overflow-hidden bg-background shadow-sm flex flex-col"
                      >
                        <div className={`h-1 w-full ${bgStatusColor}`} />
                        <div className="p-4 flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <div className="font-semibold">{quota.name}</div>
                            {fillRate >= 100 && (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-100 text-red-800">FULL</span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                            <div>
                              <div className="text-muted-foreground text-xs">Total Capacity</div>
                              <div className="font-medium">{quota.capacity}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Filled</div>
                              <div className="font-medium">{quota.filled}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Vacant</div>
                              <div className="font-bold text-lg" >{vacancy > 0 ? vacancy : 0}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground text-xs">Waitlist</div>
                              <div className="font-medium" >
                                {quota.waitlist_count || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted mt-auto">
                          <div className={`h-full ${bgStatusColor}`}  />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
