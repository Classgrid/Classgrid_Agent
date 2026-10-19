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
import { Button } from "@/components/marketing_ui/button";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export function PauseUserGrantedCredits({ userId, transactionId, isPaused }: { userId: string, transactionId: string, isPaused: boolean }) {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const handlePause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoading(true);
    try {
      await apiClient.post(`/api/super-admin/ai-usage/users/${userId}/credits/${transactionId}/pause`, { isPaused: !isPaused });
      toast.success(`Granted credits ${!isPaused ? 'paused' : 'unpaused'} successfully.`);
      // Invalidate the user details query
      queryClient.invalidateQueries({ queryKey: ["aiUsage", "user", userId] });
      // Invalidate broader stats
      queryClient.invalidateQueries({ queryKey: ["aiUsage"] });
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      size="sm"
      variant="outline" 
      onClick={handlePause}
      disabled={isLoading}
    >
      {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
      {isPaused ? 'Unpause' : 'Pause'}
    </Button>
  );
}
