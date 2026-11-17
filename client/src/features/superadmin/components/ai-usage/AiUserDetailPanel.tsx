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
import { Button } from "@/components/marketing_ui/button";
import { AlertTriangle, Zap } from "lucide-react";
import { formatNumber, formatRoleLabel } from "@/lib/utils";
import { BlockUserAiUsage } from "../BlockUserAiUsage";
import { ResetUserDailyLimit } from "../ResetUserDailyLimit";
import { GiftPlanForm } from "./GiftPlanForm";
import { PlanMeters } from "./PlanFolders";
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

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      
      {/* Overview and Usage Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Usage Overview</CardTitle>
            <CardDescription>Their plan and what they used of it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Plan</div>
                <div className="text-2xl font-bold">{userDetail.overview?.plan?.name || "Free"}</div>
              </div>
              <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Ends</div>
                <div className="text-2xl font-bold">{userDetail.overview?.plan?.expires_at ? new Date(userDetail.overview.plan.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}</div>
              </div>
            </div>
            
            <div className="mt-4 border-t border-border/50 pt-4 flex flex-col gap-4">
              {/* The plan's limits and what they used of them (the same numbers they see in Settings > Usage) */}
              <PlanMeters overview={userDetail.overview} />

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


      {/* Gift a plan to this person (owner, 2026-11-17) */}
      <div className="border border-border rounded-xl shadow-sm bg-card">
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">Gift a Plan</h3>
            <p className="text-sm text-muted-foreground">Give {userDetail.name || "this user"} Pro or Max for a while. They get an email.</p>
          </div>
          <GiftPlanForm userIds={[String(userDetail.id)]} who={userDetail.name || userDetail.email} idPrefix={`gift-${userDetail.id}`} />
        </div>
      </div>


      <BlockUserAiUsage userId={userDetail.id} userName={userDetail.name || userDetail.email} isBlocked={isBlocked} />
      
      <ResetUserDailyLimit userId={userDetail.id} userName={userDetail.name || userDetail.email} />

    </div>
  );
}