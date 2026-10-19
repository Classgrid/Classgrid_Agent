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

const useAiUsageFile = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/queries/useAiUsage.ts';
let content = fs.readFileSync(useAiUsageFile, 'utf8');

// Add toast imports
if (!content.includes('import { toast }')) {
    content = content.replace('import { apiClient', 'import { toast } from "sonner";\nimport { apiClient');
}

// Replace all onSuccess with toast
content = content.replace(/onSuccess: \(_, { userId }\) => {/g, 'onSuccess: (_, { userId }) => {\n      toast.success("Action completed successfully.");');
content = content.replace(/onSuccess: \(_, { orgId }\) => {/g, 'onSuccess: (_, { orgId }) => {\n      toast.success("Action completed successfully.");');

// Add error handling toasts
content = content.replace(/mutationFn: (.*?),/g, 'mutationFn: $1,\n    onError: (error) => toast.error("Action failed. " + error.message),');

// Add reset mutations
const resetMutations = `
export const useResetUserUsage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => aiUsageApi.resetUserUsage(userId),
    onSuccess: (_, userId) => {
      toast.success("User usage limit has been reset to 0.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user", userId] });
    },
    onError: (error) => toast.error("Failed to reset limit. " + error.message),
  });
};

export const useResetOrgUsage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) => aiUsageApi.resetOrgUsage(orgId),
    onSuccess: (_, orgId) => {
      toast.success("Organization usage has been reset.");
      queryClient.invalidateQueries({ queryKey: ["ai-usage-org", orgId] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-orgs"] });
    },
    onError: (error) => toast.error("Failed to reset limit. " + error.message),
  });
};
`;

if (!content.includes('useResetUserUsage')) {
    content += resetMutations;
}

fs.writeFileSync(useAiUsageFile, content);
console.log('Fixed useAiUsage.ts');
