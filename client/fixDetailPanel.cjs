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
const fs = require('fs');

const panelContent = `import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/marketing_ui/card";
import { Button } from "@/components/marketing_ui/button";
import { ShieldAlert, RotateCcw, AlertTriangle, Coins, Zap } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { useBlockAiUser, useGrantAiCredits, useResetUserUsage } from "../../queries/useAiUsage";
import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";
import { Input } from "@/components/marketing_ui/input";

export function AiUserDetailPanel({ userDetail }: { userDetail: any }) {
  const blockUserMutation = useBlockAiUser();
  const grantCreditsMutation = useGrantAiCredits();
  const resetUserMutation = useResetUserUsage();
  
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showGrantConfirm, setShowGrantConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [grantAmount, setGrantAmount] = useState(10000);

  if (!userDetail) return null;

  const isBlocked = userDetail.isBlocked;

  const handleToggleBlock = () => {
    blockUserMutation.mutate({ userId: userDetail.id, blocked: !isBlocked });
    setShowBlockConfirm(false);
  };

  const handleGrantCredits = () => {
    grantCreditsMutation.mutate({ userId: userDetail.id, amount: grantAmount });
    setShowGrantConfirm(false);
  };

  const handleResetLimit = () => {
    resetUserMutation.mutate(userDetail.id);
    setShowResetConfirm(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
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

          <div className="mt-8 space-y-4">
            <h4 className="font-semibold text-sm">Administrative Actions</h4>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline"
                onClick={() => setShowBlockConfirm(true)}
                disabled={blockUserMutation.isPending}
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                {isBlocked ? "Unblock AI Access" : "Block AI Access"}
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setShowGrantConfirm(true)}
              >
                <Coins className="w-4 h-4 mr-2" />
                Grant Free Credits
              </Button>

              <Button 
                variant="outline" 
                onClick={() => setShowResetConfirm(true)}
                disabled={resetUserMutation.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset Limit to 0
              </Button>
            </div>
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
            <div className="text-sm font-medium mt-1 capitalize">{userDetail.role}</div>
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

      <DangerConfirmDialog
        open={showBlockConfirm}
        onOpenChange={setShowBlockConfirm}
        title={isBlocked ? "Unblock AI Access?" : "Block AI Access?"}
        description={isBlocked 
          ? "This user will immediately regain access to AI features." 
          : "This user will be immediately blocked from using any AI features. This overrides organization-level settings."}
        onConfirm={handleToggleBlock}
        confirmText={isBlocked ? "Unblock User" : "Block User"}
      />

      <DangerConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset Usage Limit?"
        description="This will reset the user's weekly usage counter back to 0, allowing them to use their free weekly limit again."
        onConfirm={handleResetLimit}
        confirmText="Reset Limit"
      />

      {showGrantConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md shadow-lg border border-border">
            <CardHeader className="bg-muted/50">
              <CardTitle>Grant AI Credits</CardTitle>
              <CardDescription>Add free promotional credits directly to this user's balance.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium">Amount to Grant</label>
                <Input 
                  type="number" 
                  value={grantAmount} 
                  onChange={(e) => setGrantAmount(Number(e.target.value))}
                  min={1}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended: 10,000 for standard testing. These credits bypass weekly limits.
                </p>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setShowGrantConfirm(false)}>Cancel</Button>
                <Button onClick={handleGrantCredits} disabled={grantCreditsMutation.isPending}>
                  {grantCreditsMutation.isPending ? "Processing..." : "Confirm Grant"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/components/ai-usage/AiUserDetailPanel.tsx', panelContent);
console.log('Fixed AiUserDetailPanel.tsx');
