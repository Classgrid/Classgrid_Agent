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

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
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

import { useState, useMemo } from "react";
import { Search, Play, RefreshCw, Upload, User, Expand, StopCircle, X, Filter, Copy } from "lucide-react";
import { useErrorLogs } from "../queries/useAlerts";
import type { ErrorLog } from "../services/superAdminApi";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/marketing_ui/select";
import { format } from "date-fns";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/marketing_ui/tooltip";
import { RefreshButton } from "@/components/marketing_ui/refresh-button";
import { SuperadminFilterBar } from "../components/SuperadminFilterBar";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/marketing_ui/dropdown-menu";
import { Download, FileJson, Link } from "lucide-react";

const safeString = (val: any) => typeof val === 'object' && val !== null ? (val.toString ? val.toString() : JSON.stringify(val)) : String(val || "");

// A small wrapper to use the marketing tooltip cleanly
function IconButton({ icon: Icon, label, onClick, className = "", isActive = false }: any) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={`h-8 w-8 flex items-center justify-center rounded-md border transition-colors ${isActive
              ? "bg-secondary border-border text-foreground shadow-inner"
              : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              } ${className}`}
          >
            <Icon size={14} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={4}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function AuditLogsPage() {
  const [isLive, setIsLive] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [traceId, setTraceId] = useState("");
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

  const { data: errData, isLoading, refetch, isFetching, error } = useErrorLogs(isLive ? 1000 : 0, search, undefined, category, traceId);

  const handleExpand = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleExportJSON = () => {
    if (!errData?.logs) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(errData.logs, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
    a.click();
  };

  const handleExportCSV = () => {
    if (!errData?.logs) return;
    const headers = ["Timestamp", "Level", "Message", "Context", "Trace ID"];
    const rows = errData.logs.map((log: any) => [
      format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      log.level,
      `"${(log.message || "").replace(/"/g, '""')}"`,
      log.context || "---",
      log.metadata?.traceId || "---"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encodedUri;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
  };

  const handleCopyVisible = () => {
    if (!errData?.logs) return;
    const textData = errData.logs.map((log: any) => `[${format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}] ${log.level.toUpperCase()} - ${log.message}`).join("\n");
    navigator.clipboard.writeText(textData);
  };
  const logs = errData?.logs ?? [];

  const [rescuePassword, setRescuePassword] = useState("");
  const [rescueError, setRescueError] = useState("");

  const handleRescueLogin = async () => {
    try {
      setRescueError("");
      const axios = (await import("axios")).default;
      const r = await axios.post("/api/rescue/login", {
        email: "support@classgrid.in",
        password: rescuePassword
      });
      localStorage.setItem("rescue_token", r.data.token);
      refetch();
    } catch (err: any) {
      setRescueError(err.response?.data?.message || "Failed to authenticate with rescue server.");
    }
  };

  const toggleLive = () => {
    setIsLive(!isLive);
    if (!isLive) refetch();
  };

  const getStatusColor = (level: string, statusCode?: number) => {
    if (level === "error" || (statusCode && statusCode >= 500)) return "text-red-500";
    if (level === "warn" || (statusCode && statusCode >= 400)) return "text-yellow-500";
    return "text-green-500";
  };

  const columns = [
    {
      key: "time",
      header: "Time",
      width: "w-[160px]",
      render: (_: any, log: ErrorLog) => (
        <div className="text-muted-foreground font-mono text-[13px] flex items-center whitespace-nowrap">
          <span className="text-muted-foreground/60 mr-2 text-[10px] uppercase font-sans">
            {format(new Date(log.timestamp || new Date()), "MMM dd")}
          </span>
          {format(new Date(log.timestamp || new Date()), "HH:mm:ss.SS")}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[120px]",
      render: (_: any, log: ErrorLog) => (
        <div className={`font-semibold font-mono text-[13px] flex items-center gap-2`}>
          <span className={getStatusColor(log.level, log.metadata?.status)}>
            {log.metadata?.method || log.level.toUpperCase()}
          </span>
          {log.metadata?.status ? (
            <span className={
              log.metadata.status >= 500 ? "text-red-500" :
                log.metadata.status >= 400 ? "text-yellow-500" :
                  "text-green-500"
            }>{log.metadata.status}</span>
          ) : log.metadata?.method ? (
            <span className="text-muted-foreground/50">---</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "host",
      header: "Host",
      width: "w-[140px]",
      render: (_: any, log: ErrorLog) => (
        <div className="text-muted-foreground font-mono text-[13px] truncate">
          {log.metadata?.orgId === "none" ? "system" : "classgrid.in"}
        </div>
      ),
    },
    {
      key: "request",
      header: "Request",
      width: "w-[250px]",
      render: (_: any, log: ErrorLog) => (
        <div className="text-foreground font-mono text-[13px] truncate flex items-center gap-2">
          {log.metadata?.url ? (
            <>
              <span className="border border-border bg-secondary text-secondary-foreground px-1 rounded text-[10px] uppercase font-sans">
                {log.metadata.method?.[0] || 'M'}
              </span>
              <span className="truncate">{log.metadata.url}</span>
            </>
          ) : (
            <span className="text-muted-foreground/50">---</span>
          )}
        </div>
      ),
    },
    {
      key: "messages",
      header: "Messages",
      render: (_: any, log: ErrorLog) => (
        <div className="text-foreground break-words font-mono text-[13px] tracking-wide">
          <span className={log.level === 'error' ? 'text-destructive' : ''}>
            {safeString(log.message)}
          </span>
          {log.context && <span className="ml-2 text-muted-foreground text-xs font-sans">[{safeString(log.context)}]</span>}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full max-w-full mx-auto bg-background p-0">

      {error && error.message === "RESCUE_REQUIRED" ? (
        <div className="flex flex-col items-center justify-center flex-1 min-h-0 bg-card border border-border rounded-lg shadow-sm p-8 space-y-4">
          <div className="text-red-500 mb-2">
            <StopCircle size={48} />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Main Server Offline</h2>
          <p className="text-muted-foreground">The main application is down. Enter the Rescue Password to securely view crash logs.</p>
          <div className="flex flex-col w-full max-w-sm space-y-2 mt-4">
            <input
              type="password"
              placeholder="Rescue Password"
              value={rescuePassword}
              onChange={e => setRescuePassword(e.target.value)}
              className="bg-background border border-border rounded-md py-2 px-3 text-sm text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
            />
            <button onClick={handleRescueLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded transition-colors">
              Enter Rescue Mode
            </button>
            {rescueError && <p className="text-red-500 text-sm text-center">{rescueError}</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0 bg-background">

          {/* Unified Toolbar */}
          <div className="w-full relative z-50 mb-2 px-4 pt-4 border-b border-border bg-card pb-4">
            <SuperadminFilterBar
              searchQuery={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search logs..."
            >
              {/* Category */}
              <div className="w-[140px]">
                <ResponsiveSelect
                  className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-xs font-medium uppercase"
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setTraceId(""); }}
                >
                  {["all", "errors", "warnings", "api", "socket", "cron", "email queue", "ai agent"].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </ResponsiveSelect>
              </div>

              {traceId && (
                <div className="flex items-center bg-yellow-500/10 border border-yellow-500/30 text-yellow-600 px-3 py-1 h-9 rounded-md text-xs font-mono font-medium whitespace-nowrap ml-1 shrink-0">
                  <span title={traceId}>Trace: {traceId.substring(0, 8)}...</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(traceId)}
                    className="ml-2 hover:text-yellow-800 transition-colors"
                    title="Copy full Trace ID"
                  >
                    <Copy size={12} />
                  </button>
                  <button onClick={() => setTraceId("")} className="ml-2 hover:text-yellow-800" title="Clear Trace ID">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Spacer so the right side actions push to right on wide screens if needed, otherwise just gap */}
              <div className="hidden xl:block flex-1" />

              {/* Right Side Actions */}
              <div className="flex items-center gap-2 shrink-0 h-9 bg-card px-2 rounded-md border border-border shadow-sm">
                <IconButton icon={Expand} label="Expand View" className="h-7 w-7 border-none shadow-none" onClick={handleExpand} />

                <div className="w-px h-4 bg-border mx-1"></div>

                {/* Live Button */}
                <button
                  onClick={toggleLive}
                  className={`flex items-center justify-center gap-2 px-3 h-7 rounded-md text-xs font-medium transition-colors ${isLive
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                >
                  {isLive ? (
                    <>
                      <span className="relative flex h-2 w-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                      </span>
                      Live
                    </>
                  ) : (
                    <>
                      <Play size={12} className="mr-1" />
                      Live
                    </>
                  )}
                </button>

                {/* Refresh Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" sideOffset={4}>
                      Refresh logs
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Share / Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-7 w-7 flex items-center justify-center rounded-md bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors focus:outline-none">
                      <Upload size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleCopyVisible} className="cursor-pointer text-xs">
                      <Copy className="mr-2 h-4 w-4" />
                      <span>Copy visible logs</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer text-xs">
                      <Download className="mr-2 h-4 w-4" />
                      <span>Export to CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer text-xs">
                      <FileJson className="mr-2 h-4 w-4" />
                      <span>Export to JSON</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </SuperadminFilterBar>
          </div>

          {/* Table Area */}
          <div className="flex-1 min-h-[500px] h-full pb-4 mt-6 px-4 relative overflow-hidden rounded-md">
            <DataTable
              columns={columns}
              rows={logs}
              isLoading={isLoading && !isLive}
              emptyMessage="No more logs to show within selected timeline"
              className="h-full overflow-auto bg-background"
              onRowClick={(row) => setSelectedLog(row)}
            />

            {/* Detail Panel Overlay */}
            {selectedLog && (
              <div className="absolute top-0 right-0 h-full w-[600px] max-w-full border-l border-border bg-card flex flex-col shadow-2xl z-20 animate-in slide-in-from-right-4 rounded-r-md rounded-l-lg border-y">
                <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
                  <h3 className="font-semibold text-foreground">Log Details</h3>
                  <button onClick={() => setSelectedLog(null)} className="text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-4 overflow-y-auto flex-1 space-y-4">
                  {/* Message */}
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Message</div>
                    <div className="font-mono text-sm break-words bg-secondary/50 p-3 rounded border border-border text-foreground">
                      {selectedLog.message}
                    </div>
                  </div>

                  {/* Trace Action */}
                  {(selectedLog.metadata?.traceId) && (
                    <button
                      onClick={() => {
                        setTraceId(selectedLog.metadata.traceId);
                        setSelectedLog(null);
                      }}
                      className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded transition-colors text-sm shadow-sm"
                    >
                      <Filter size={14} /> View Full Trace ({selectedLog.metadata.traceId.substring(0, 8)})
                    </button>
                  )}

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Duration</div>
                      <div className="font-mono text-sm text-foreground">{selectedLog.metadata?.durationMs ? `${selectedLog.metadata.durationMs}ms` : "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Status</div>
                      <div className={`font-mono text-sm font-semibold ${getStatusColor(selectedLog.level, selectedLog.metadata?.status)}`}>
                        {selectedLog.metadata?.status || "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Org ID</div>
                      <div className="font-mono text-sm truncate text-foreground" title={safeString(selectedLog.metadata?.orgId)}>{selectedLog.metadata?.orgId ? safeString(selectedLog.metadata.orgId) : "N/A"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">User ID</div>
                      <div className="font-mono text-sm truncate text-foreground" title={safeString(selectedLog.metadata?.userId)}>{selectedLog.metadata?.userId ? safeString(selectedLog.metadata.userId) : "N/A"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">IP Address</div>
                      <div className="font-mono text-sm text-foreground">{selectedLog.metadata?.ip || "N/A"}</div>
                    </div>
                  </div>

                  {/* Request Body */}
                  {selectedLog.metadata?.body && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Request Body</div>
                      <pre className="font-mono text-[11px] bg-secondary/80 text-foreground p-3 rounded border border-border overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(selectedLog.metadata.body, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Stack Trace */}
                  {selectedLog.stack && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Stack Trace</div>
                      <pre className="font-mono text-[10px] bg-secondary/80 p-3 rounded border border-border text-red-500 overflow-x-auto whitespace-pre-wrap">
                        {selectedLog.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
