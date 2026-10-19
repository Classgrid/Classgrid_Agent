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
const path = require('path');

const filePath = path.join('client', 'src', 'features', 'superadmin', 'pages', 'AgentReviewsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix text wrapping
content = content.replace(
  'whitespace-normal break-words w-full text-center leading-tight px-1',
  'whitespace-normal break-normal w-full text-center leading-tight px-1 text-balance'
);
content = content.replace(
  'whitespace-normal break-all w-full text-center mt-1 px-1',
  'whitespace-normal break-words w-full text-center mt-1 px-1 text-balance'
);

// Fix tree structure
const oldTreeLogic = \    const root: Record<string, { count: number, orgs: Record<string, { count: number, users: Record<string, { name: string, count: number, dates: Record<string, { count: number, reviews: AgentReview[] }> }> }> }> = {};
    
    filteredReviews.forEach(review => {
      const role = review.user_details?.role || "unknown";
      const org = review.user_details?.orgName || "No Organization";
      const email = review.user_email || "unknown";
      const name = review.user_details?.name || "Unknown";
      const date = format(new Date(review.created_at), 'MMM dd, yyyy');

      if (!root[role]) root[role] = { count: 0, orgs: {} };
      root[role].count++;

      if (!root[role].orgs[org]) root[role].orgs[org] = { count: 0, users: {} };
      root[role].orgs[org].count++;

      if (!root[role].orgs[org].users[email]) root[role].orgs[org].users[email] = { name, count: 0, dates: {} };
      root[role].orgs[org].users[email].count++;

      if (!root[role].orgs[org].users[email].dates[date]) root[role].orgs[org].users[email].dates[date] = { count: 0, reviews: [] };
      root[role].orgs[org].users[email].dates[date].count++;
      root[role].orgs[org].users[email].dates[date].reviews.push(review);
    });\;

const newTreeLogic = \    const root: Record<string, { count: number, roles: Record<string, { count: number, users: Record<string, { name: string, count: number, dates: Record<string, { count: number, reviews: AgentReview[] }> }> }> }> = {};
    
    filteredReviews.forEach(review => {
      const role = review.user_details?.role || "unknown";
      const org = review.user_details?.orgName || "No Organization";
      const email = review.user_email || "unknown";
      const name = review.user_details?.name || "Unknown";
      const date = format(new Date(review.created_at), 'MMM dd, yyyy');

      if (!root[org]) root[org] = { count: 0, roles: {} };
      root[org].count++;

      if (!root[org].roles[role]) root[org].roles[role] = { count: 0, users: {} };
      root[org].roles[role].count++;

      if (!root[org].roles[role].users[email]) root[org].roles[role].users[email] = { name, count: 0, dates: {} };
      root[org].roles[role].users[email].count++;

      if (!root[org].roles[role].users[email].dates[date]) root[org].roles[role].users[email].dates[date] = { count: 0, reviews: [] };
      root[org].roles[role].users[email].dates[date].count++;
      root[org].roles[role].users[email].dates[date].reviews.push(review);
    });\;

content = content.replace(oldTreeLogic, newTreeLogic);

const oldBreadcrumbs = \  const renderBreadcrumbs = () => {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/20 p-3 rounded-lg border border-border">
        <button onClick={() => setPath({})} className="hover:text-foreground flex items-center font-medium cursor-pointer">
          <Home className="h-4 w-4 mr-1.5 text-amber-500" /> Root
        </button>
        {path.role && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ role: path.role })} className="hover:text-foreground cursor-pointer">
              {formatRoleName(path.role)}
            </button>
          </>
        )}
        {path.org && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ role: path.role, org: path.org })} className="hover:text-foreground cursor-pointer">
              {path.org}
            </button>
          </>
        )}
        {path.email && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ role: path.role, org: path.org, email: path.email })} className="hover:text-foreground truncate max-w-[200px] cursor-pointer">
              {tree[path.role!]?.orgs[path.org!]?.users[path.email!]?.name || path.email}
            </button>
          </>
        )}
        {path.date && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <span className="text-foreground font-medium">{path.date}</span>
          </>
        )}
      </div>
    );
  };\;

const newBreadcrumbs = \  const renderBreadcrumbs = () => {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-6 bg-muted/20 p-3 rounded-lg border border-border">
        <button onClick={() => setPath({})} className="hover:text-foreground flex items-center font-medium cursor-pointer">
          <Home className="h-4 w-4 mr-1.5 text-amber-500" /> Root
        </button>
        {path.org && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ org: path.org })} className="hover:text-foreground cursor-pointer">
              {path.org}
            </button>
          </>
        )}
        {path.role && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ org: path.org, role: path.role })} className="hover:text-foreground cursor-pointer">
              {formatRoleName(path.role)}
            </button>
          </>
        )}
        {path.email && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <button onClick={() => setPath({ org: path.org, role: path.role, email: path.email })} className="hover:text-foreground truncate max-w-[200px] cursor-pointer">
              {tree[path.org!]?.roles[path.role!]?.users[path.email!]?.name || path.email}
            </button>
          </>
        )}
        {path.date && (
          <>
            <ChevronRight className="h-4 w-4 opacity-50" />
            <span className="text-foreground font-medium">{path.date}</span>
          </>
        )}
      </div>
    );
  };\;

content = content.replace(oldBreadcrumbs, newBreadcrumbs);

const oldFolders = \  const renderFolders = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      );
    }
    if (error) return <div className="text-center py-12 text-rose-500">Failed to load reviews.</div>;

    // ROOT LEVEL (Roles)
    if (!path.role) {
      const roles = Object.keys(tree).sort();
      if (roles.length === 0) return <div className="text-center py-12 text-muted-foreground w-full">No folders found.</div>;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {roles.map(role => (
            <FolderIcon 
              key={role} 
              label={formatRoleName(role)} 
              badge={tree[role].count} 
              onClick={() => setPath({ role })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 1 (Organizations)
    if (path.role && !path.org) {
      const roleNode = tree[path.role];
      if (!roleNode) return null;
      const orgs = Object.keys(roleNode.orgs).sort();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {orgs.map(org => (
            <FolderIcon 
              key={org} 
              label={org} 
              badge={roleNode.orgs[org].count} 
              onClick={() => setPath({ ...path, org })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 2 (Users)
    if (path.role && path.org && !path.email) {
      const orgNode = tree[path.role]?.orgs[path.org];
      if (!orgNode) return null;
      const emails = Object.keys(orgNode.users).sort();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {emails.map(email => {
            const userNode = orgNode.users[email];
            return (
              <FolderIcon 
                key={email} 
                label={userNode.name} 
                subtitle={email}
                badge={userNode.count} 
                onClick={() => setPath({ ...path, email })} 
              />
            );
          })}
        </div>
      );
    }

    // LEVEL 3 (Dates)
    if (path.role && path.org && path.email && !path.date) {
      const userNode = tree[path.role]?.orgs[path.org]?.users[path.email];
      if (!userNode) return null;
      const dates = Object.keys(userNode.dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {dates.map(date => (
            <FolderIcon 
              key={date} 
              label={date} 
              badge={userNode.dates[date].count} 
              onClick={() => setPath({ ...path, date })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 4 (Reviews!)
    if (path.role && path.org && path.email && path.date) {
      const dateNode = tree[path.role]?.orgs[path.org]?.users[path.email]?.dates[path.date];
      if (!dateNode) return null;
      
      return (
        <div className="w-full space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => setPath({ role: path.role, org: path.org, email: path.email })}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dates
            </Button>
            <h3 className="text-lg font-semibold">{path.date} - {dateNode.reviews.length} Reviews</h3>
          </div>
          {dateNode.reviews.map(review => renderReviewContent(review))}
        </div>
      );
    }
  };\;

const newFolders = \  const renderFolders = () => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      );
    }
    if (error) return <div className="text-center py-12 text-rose-500">Failed to load reviews.</div>;

    // ROOT LEVEL (Organizations)
    if (!path.org) {
      const orgs = Object.keys(tree).sort();
      if (orgs.length === 0) return <div className="text-center py-12 text-muted-foreground w-full">No folders found.</div>;
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {orgs.map(org => (
            <FolderIcon 
              key={org} 
              label={org} 
              badge={tree[org].count} 
              onClick={() => setPath({ org })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 1 (Roles)
    if (path.org && !path.role) {
      const orgNode = tree[path.org];
      if (!orgNode) return null;
      const roles = Object.keys(orgNode.roles).sort();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {roles.map(role => (
            <FolderIcon 
              key={role} 
              label={formatRoleName(role)} 
              badge={orgNode.roles[role].count} 
              onClick={() => setPath({ ...path, role })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 2 (Users)
    if (path.org && path.role && !path.email) {
      const roleNode = tree[path.org]?.roles[path.role];
      if (!roleNode) return null;
      const emails = Object.keys(roleNode.users).sort();
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {emails.map(email => {
            const userNode = roleNode.users[email];
            return (
              <FolderIcon 
                key={email} 
                label={userNode.name} 
                subtitle={email}
                badge={userNode.count} 
                onClick={() => setPath({ ...path, email })} 
              />
            );
          })}
        </div>
      );
    }

    // LEVEL 3 (Dates)
    if (path.org && path.role && path.email && !path.date) {
      const userNode = tree[path.org]?.roles[path.role]?.users[path.email];
      if (!userNode) return null;
      const dates = Object.keys(userNode.dates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      return (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 w-full">
          {dates.map(date => (
            <FolderIcon 
              key={date} 
              label={date} 
              badge={userNode.dates[date].count} 
              onClick={() => setPath({ ...path, date })} 
            />
          ))}
        </div>
      );
    }

    // LEVEL 4 (Reviews!)
    if (path.org && path.role && path.email && path.date) {
      const dateNode = tree[path.org]?.roles[path.role]?.users[path.email]?.dates[path.date];
      if (!dateNode) return null;
      
      return (
        <div className="w-full space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => setPath({ org: path.org, role: path.role, email: path.email })}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dates
            </Button>
            <h3 className="text-lg font-semibold">{path.date} - {dateNode.reviews.length} Reviews</h3>
          </div>
          {dateNode.reviews.map(review => renderReviewContent(review))}
        </div>
      );
    }
  };\;

content = content.replace(oldFolders, newFolders);

fs.writeFileSync(filePath, content);
console.log('Successfully applied hierarchy updates');
