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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiAgentReviewsApi } from "../services/superAdminApi";
import { toast } from "sonner";

export const useAgentReviews = () => {
  return useQuery({
    queryKey: ["ai-agent-reviews"],
    queryFn: () => aiAgentReviewsApi.getAll(),
  });
};

export const useUpdateAgentReviewStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'actioned' | 'acknowledged' | 'no_action' | 'pending' }) => 
      aiAgentReviewsApi.updateStatus(id, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-reviews"] });
      toast.success(`Review status updated to ${variables.status}`);
    },
    onError: () => {
      toast.error("Failed to update review status");
    }
  });
};

export const useDeleteAgentReview = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiAgentReviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-reviews"] });
      toast.success("Review deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete review");
    }
  });
};

export const useBulkDeleteAgentReviews = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => aiAgentReviewsApi.bulkDelete(ids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-agent-reviews"] });
      toast.success(`Successfully deleted ${variables.length} reviews`);
    },
    onError: () => {
      toast.error("Failed to bulk delete reviews");
    }
  });
};
