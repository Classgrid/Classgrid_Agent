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
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Search } from "lucide-react";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { formatNumber, formatRoleLabel } from "@/lib/utils";
import { NikhilDateCalendar } from "@/components/marketing_ui/nikhil_date_calendar";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

export interface TopAiUsersTableProps {
  users?: any[];
}

export function TopAiUsersTable({ users = [] }: TopAiUsersTableProps) {
  const { data: currentUser } = useCurrentUser();
  const [search, setSearch] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [showAll, setShowAll] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<{ from?: Date; to?: Date } | undefined>();

  // Extract unique roles dynamically from real user data
  const uniqueRoles = useMemo(() => {
    const rolesSet = new Set<string>();
    users.forEach(u => {
      if (u.role || u.roleName) rolesSet.add(u.role || u.roleName);
    });
    return Array.from(rolesSet);
  }, [users]);

  const formattedUsers = useMemo(() => {
    let filtered = [...users];
    
    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => (u.role || u.roleName) === roleFilter);
    }

    // Apply search filter
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(lowerSearch)) || 
        (u.email && u.email.toLowerCase().includes(lowerSearch))
      );
    }

    // Sort by total usage descending
    filtered.sort((a, b) => (b.totalUsage || 0) - (a.totalUsage || 0));

    const limit = showAll ? filtered.length : 10;

    return filtered.slice(0, limit).map((u, index) => ({
      id: u.id || u._id || index,
      name: u.name || u.email || "Unknown User",
      email: u.email || "",
      profilePicture: u.profilePicture || null,
      initials: (u.name || u.email || "??").substring(0, 2).toUpperCase(),
      role: u.role ? formatRoleLabel(u.role) : "Unknown Role",
      tokensUsed: formatNumber(u.totalUsage || 0),
      recentTopUp: u.recentTopUp ? formatNumber(u.recentTopUp) : "-"
    }));
  }, [users, search, roleFilter, showAll]);

  const totalFiltered = useMemo(() => {
    let filtered = [...users];
    if (roleFilter !== "all") {
      filtered = filtered.filter(u => (u.role || u.roleName) === roleFilter);
    }
    if (search) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(u => 
        (u.name && u.name.toLowerCase().includes(lowerSearch)) || 
        (u.email && u.email.toLowerCase().includes(lowerSearch))
      );
    }
    return filtered.length;
  }, [users, search, roleFilter]);

  const columns = [
    {
      key: "user",
      header: "USER",
      width: "w-[45%]",
      render: (_: any, row: any) => (
        <div className="flex items-center gap-3 py-1">
          {row.profilePicture ? (
            <img src={row.profilePicture} alt={row.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (currentUser?.profilePicture || currentUser?.platformLogo) && (row.id === currentUser?._id || row.name === currentUser?.name) ? (
            <img src={currentUser.profilePicture || currentUser.platformLogo} alt={row.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {row.initials}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-foreground">{row.name}</span>
            <span className="text-xs text-muted-foreground break-all">{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: "role",
      header: "ROLE",
      width: "w-[15%]",
      render: (value: string) => <span className="text-muted-foreground">{value}</span>
    },
    {
      key: "tokensUsed",
      header: "TOKENS USED",
      width: "w-[20%]",
      render: (value: string) => <span className="text-muted-foreground font-medium">{value}</span>
    },
    {
      key: "recentTopUp",
      header: "RECENT TOP-UP",
      width: "w-[20%]",
      render: (value: string) => <span className="text-muted-foreground">{value}</span>
    }
  ];

  return (
    <Card className="border border-border shadow-sm overflow-hidden bg-card">
      <CardHeader className="border-b border-border pb-4 bg-card flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
          TOP AI USERS
        </CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search Filter..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[180px] h-[34px] pl-9 pr-3 bg-background border border-input rounded-lg text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="w-[200px]">
            <NikhilDateCalendar 
              value={dateRange}
              onChange={setDateRange}
              placeholder="Select Date"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px] h-[34px] bg-background border-input text-foreground hover:bg-accent hover:text-accent-foreground">
              <SelectValue placeholder="Role Filter" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              <SelectItem value="all">All Roles</SelectItem>
              {uniqueRoles.map(role => (
                <SelectItem key={role} value={role}>{formatRoleLabel(role)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 bg-card flex flex-col">
        <DataTable 
          columns={columns} 
          rows={formattedUsers} 
          className="border-0 rounded-none bg-transparent"
        />
        {!showAll && totalFiltered > 10 && (
          <div className="p-4 border-t border-border flex justify-center">
            <button 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAll(true)}
            >
              View All Users ({totalFiltered})
            </button>
          </div>
        )}
        {showAll && totalFiltered > 10 && (
          <div className="p-4 border-t border-border flex justify-center">
            <button 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowAll(false)}
            >
              Show Less
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

