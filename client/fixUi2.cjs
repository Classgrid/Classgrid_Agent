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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/features/superadmin/pages/AiUsageDashboardPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldRenderLevel0Orgs = `  const renderLevel0Orgs = () => {
    if (orgsLoading) return <Skeleton className="h-64 w-full" />;
    if (!orgs || orgs.length === 0) return <div className="text-center py-12 text-muted-foreground">No organizations found.</div>;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organizations ({orgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {orgs.map((org: any) => (
              <FolderIcon
                key={org._id}
                label={org.displayName}
                subtitle={\`\${formatNumber(org.ai_credits_consumed || 0)} credits\`}
                badge={0} // Maybe show blocked users count?
                icon={Building}
                onClick={() => setPath({ orgId: org._id, orgName: org.displayName })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };`;

const newRenderLevel0Orgs = `  const renderLevel0Orgs = () => {
    if (orgsLoading) return <Skeleton className="h-64 w-full" />;
    if (!orgs || orgs.length === 0) return <div className="text-center py-12 text-muted-foreground">No organizations found.</div>;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organizations ({orgs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {orgs.map((org: any) => (
              <FolderIcon
                key={org.id}
                label={org.name}
                subtitle={\`\${formatNumber(org.totalUsage || 0)} Credits\`}
                badge={org.isBlocked ? "BLOCKED" : 0}
                icon={Building}
                onClick={() => setPath({ orgId: org.id, orgName: org.name })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };`;

const oldRenderLevel1Roles = `  const renderLevel1Roles = () => {
    if (orgDetailLoading || orgUsersLoading) return <Skeleton className="h-64 w-full" />;
    
    // Group users by role to create role folders
    const rolesMap: Record<string, { count: number, credits: number }> = {};
    if (orgUsers) {
      orgUsers.forEach((user: any) => {
        const role = user.role || "unknown";
        if (!rolesMap[role]) rolesMap[role] = { count: 0, credits: 0 };
        rolesMap[role].count++;
        rolesMap[role].credits += user.ai_credits?.ai_credits_consumed || 0;
      });
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{path.orgName} — Usage Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {Object.entries(rolesMap).map(([role, stats]) => (
                <FolderIcon
                  key={role}
                  label={role.toUpperCase()}
                  subtitle={\`\${stats.count} users • \${formatNumber(stats.credits)} credits\`}
                  badge={stats.count}
                  icon={Shield}
                  onClick={() => setPath({ ...path, role })}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };`;

const newRenderLevel1Roles = `  const renderLevel1Roles = () => {
    if (orgDetailLoading || orgUsersLoading) return <Skeleton className="h-64 w-full" />;

    return (
      <div className="space-y-6">
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

const oldRenderLevel2Users = `  const renderLevel2Users = () => {
    if (orgUsersLoading) return <Skeleton className="h-64 w-full" />;
    
    const usersInRole = orgUsers?.filter((u: any) => u.role === path.role) || [];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{path.role?.toUpperCase()} Users ({usersInRole.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {usersInRole.map((user: any) => (
              <FolderIcon
                key={user._id}
                label={user.name || user.email}
                subtitle={\`\${formatNumber(user.ai_credits?.ai_credits_consumed || 0)} credits\`}
                badge={user.ai_credits?.ai_access_blocked ? "BLOCKED" : 0}
                icon={UserIcon}
                onClick={() => setPath({ ...path, userId: user._id, userName: user.name || user.email })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };`;

const newRenderLevel2Users = `  const renderLevel2Users = () => {
    if (orgUsersLoading) return <Skeleton className="h-64 w-full" />;
    
    const roleGroup = orgUsers?.find((r: any) => r.roleName === path.role);
    const usersInRole = roleGroup ? roleGroup.users : [];

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{path.role?.toUpperCase()} Users ({usersInRole.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {usersInRole.map((user: any) => (
              <FolderIcon
                key={user.id}
                label={user.name || user.email}
                subtitle={\`\${formatNumber(user.totalUsage || 0)} Credits\`}
                badge={user.isBlocked ? "BLOCKED" : 0}
                icon={UserIcon}
                onClick={() => setPath({ ...path, userId: user.id, userName: user.name || user.email })}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };`;

content = content.replace(oldRenderLevel0Orgs, newRenderLevel0Orgs);
content = content.replace(oldRenderLevel1Roles, newRenderLevel1Roles);
content = content.replace(oldRenderLevel2Users, newRenderLevel2Users);

fs.writeFileSync(file, content);
console.log('Done mapping.');
