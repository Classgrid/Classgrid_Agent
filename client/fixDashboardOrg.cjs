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

const dashboardFile = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/pages/AiUsageDashboardPage.tsx';
let content = fs.readFileSync(dashboardFile, 'utf8');

if (!content.includes('import { useResetOrgUsage, useBlockAiOrg }')) {
    content = content.replace('useAiUserDetail\n}', 'useAiUserDetail,\n  useResetOrgUsage,\n  useBlockAiOrg\n}');
    
    // Add DangerConfirmDialog import if not present
    if (!content.includes('DangerConfirmDialog')) {
        content = content.replace('import { Skeleton }', 'import { DangerConfirmDialog } from "@/components/marketing_ui/danger-confirm-dialog";\nimport { Skeleton }');
    }
}

// Add state for org dialogs
if (!content.includes('const [showOrgReset, setShowOrgReset] = useState(false);')) {
    content = content.replace('const [path, setPath] = useState<PathState>({});', 'const [path, setPath] = useState<PathState>({});\n  const [showOrgReset, setShowOrgReset] = useState(false);\n  const [showOrgBlock, setShowOrgBlock] = useState(false);\n  const resetOrgMutation = useResetOrgUsage();\n  const blockOrgMutation = useBlockAiOrg();');
}

// Update renderLevel1Roles to include the org action buttons
const newLevel1 = `  const renderLevel1Roles = () => {
    if (orgDetailLoading || orgUsersLoading) return <Skeleton className="h-64 w-full" />;

    const isOrgBlocked = orgDetail?.isBlocked;

    return (
      <div className="space-y-6">
        <div className="flex justify-end gap-3 mb-4">
            <button 
                onClick={() => setShowOrgBlock(true)}
                disabled={blockOrgMutation.isPending}
                className="text-sm font-medium px-4 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors flex items-center"
            >
                <Shield className="w-4 h-4 mr-2" />
                {isOrgBlocked ? "Unblock Organization" : "Block Organization"}
            </button>
            <button 
                onClick={() => setShowOrgReset(true)}
                disabled={resetOrgMutation.isPending}
                className="text-sm font-medium px-4 py-2 bg-background border border-border rounded-md hover:bg-muted transition-colors flex items-center"
            >
                <Activity className="w-4 h-4 mr-2" />
                Reset Org Limit
            </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{path.orgName} — Usage Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {orgUsers?.map((roleGroup: any) => (
                <FolderIcon
                  key={roleGroup.roleName}
                  label={roleGroup.roleName.toUpperCase()}
                  subtitle={\`\${roleGroup.userCount} users • \${formatNumber(roleGroup.totalUsage || 0)} Credits\`}
                  badge={roleGroup.userCount}
                  icon={Shield}
                  onClick={() => setPath({ ...path, role: roleGroup.roleName })}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };`;

content = content.replace(/const renderLevel1Roles = \(\) => \{[\s\S]*?return \([\s\S]*?\);\n  \};/, newLevel1);

// Add the dialog components at the end of the return
const dialogs = `
      {/* Organization Level Action Dialogs */}
      <DangerConfirmDialog
        open={showOrgReset}
        onOpenChange={setShowOrgReset}
        title="Reset Organization Limit?"
        description="This will reset the total usage counter for this organization back to 0."
        onConfirm={() => {
            resetOrgMutation.mutate(path.orgId || "");
            setShowOrgReset(false);
        }}
        confirmText="Reset Limit"
      />
      <DangerConfirmDialog
        open={showOrgBlock}
        onOpenChange={setShowOrgBlock}
        title={orgDetail?.isBlocked ? "Unblock Organization?" : "Block Organization?"}
        description={orgDetail?.isBlocked ? "Unblocking will allow all users in this org to use AI again." : "Blocking will immediately prevent all users in this org from using AI features."}
        onConfirm={() => {
            blockOrgMutation.mutate({ orgId: path.orgId || "", blocked: !orgDetail?.isBlocked });
            setShowOrgBlock(false);
        }}
        confirmText={orgDetail?.isBlocked ? "Unblock" : "Block"}
      />
    </div>
  );`;

content = content.replace(/<\/div>\s*\);\s*\}/, dialogs + '\n}');

fs.writeFileSync(dashboardFile, content);
console.log('Fixed AiUsageDashboardPage.tsx');
