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

import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import React, { useState } from "react";
import { useGetAdmissions, useGetApplicationDetails, useUpdateApplicationStatus } from "../queries/useAdmissions";
import { useGeneratePRNs, useAllocateDivisions, useDownloadGovtExport } from "../queries/useAdmissionsOperations";
import { DocumentValidityBadge } from "../components/DocumentValidityBadge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/marketing_ui/table";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/marketing_ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/marketing_ui/tabs";
import { Textarea } from "@/components/marketing_ui/textarea";
import { toast } from "sonner";
import { Search, CheckCircle, XCircle, FileText, User, MapPin, Activity, Calendar, Download, Users, FileDigit } from "lucide-react";
import { Spinner } from "@/components/marketing_ui/spinner";

// Helper for status badge colors
const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "applied":
    case "pending":
    case "under_verification":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800";
    case "verified":
    case "approved":
    case "enrolled":
    case "confirmed":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    case "rejected":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
    case "waitlisted":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
  }
};

export default function AdmissionsDashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  // Queries
  const { data: listData, isLoading: isLoadingList } = useGetAdmissions({ 
    search, 
    status: statusFilter, 
    limit: 50 
  });
  
  const { data: appDetails, isLoading: isLoadingDetails } = useGetApplicationDetails(selectedAppId || undefined);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateApplicationStatus();
  
  const { mutate: generatePRNs, isPending: isGeneratingPRNs } = useGeneratePRNs();
  const { mutate: allocateDivisions, isPending: isAllocating } = useAllocateDivisions();
  const { mutate: downloadExport, isPending: isDownloading } = useDownloadGovtExport();

  const handleRowClick = (id: string) => {
    setSelectedAppId(id);
    setIsSheetOpen(true);
    setReviewNotes(""); // reset notes on open
  };

  const handleStatusUpdate = (newStatus: string) => {
    if (!selectedAppId) return;
    
    updateStatus(
      { id: selectedAppId, status: newStatus, reviewNotes },
      {
        onSuccess: () => {
          toast.success(`Application successfully marked as ${newStatus}`);
          setIsSheetOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.message || "Failed to update status");
        }
      }
    );
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-[1600px] mx-auto">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admissions Control Center</h1>
          <p className="text-muted-foreground mt-1">Review and manage student applications in real-time.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name, email, or EN..." 
              className="pl-9 bg-card border-border shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ResponsiveSelect 
            className="h-10 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="applied">Applied (Pending)</option>
            <option value="under_verification">Under Verification</option>
            <option value="verified">Verified / Approved</option>
            <option value="rejected">Rejected</option>
            <option value="enrolled">Enrolled</option>
          </ResponsiveSelect>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const ids = listData?.applications?.map((a: any) => a._id);
                if (ids?.length) generatePRNs(ids);
              }}
              disabled={isGeneratingPRNs || !listData?.applications?.length}
            >
              <FileDigit className="w-4 h-4 mr-2" />
              Batch PRNs
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                // Hardcoding standard test data for demonstration
                allocateDivisions({
                  hierarchy_id: listData?.applications?.[0]?.hierarchy_id?._id,
                  method: "alphabetical",
                  divisions: [{ name: "A", capacity: 60 }, { name: "B", capacity: 60 }]
                });
              }}
              disabled={isAllocating || !listData?.applications?.length}
            >
              <Users className="w-4 h-4 mr-2" />
              Allocate Divs
            </Button>
            <ResponsiveSelect
              className="h-9 rounded-md border border-border bg-primary text-primary-foreground px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              onChange={(e) => {
                if (e.target.value) {
                  downloadExport(e.target.value as any);
                  e.target.value = "";
                }
              }}
              disabled={isDownloading}
            >
              <option value="">Govt Exports...</option>
              <option value="dte">Export DTE (Engg)</option>
              <option value="saral">Export SARAL (School)</option>
              <option value="aicte">Export AICTE</option>
              <option value="state-board">Export State Board</option>
            </ResponsiveSelect>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoadingList ? (
          <div className="h-64 flex items-center justify-center">
            <Spinner className="h-8 w-8 text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="w-[120px] font-semibold">Reg ID</TableHead>
                <TableHead className="font-semibold">Applicant</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Contact</TableHead>
                <TableHead className="font-semibold">Target Classroom</TableHead>
                <TableHead className="font-semibold">PRN & Div</TableHead>
                <TableHead className="font-semibold text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listData?.applications?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No applications found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                listData?.applications?.map((app: any) => (
                  <TableRow 
                    key={app._id} 
                    className="cursor-pointer hover:bg-muted/30 transition-colors group"
                    onClick={() => handleRowClick(app._id)}
                  >
                    <TableCell className="font-medium text-xs text-muted-foreground">
                      {app.en_number || app._id.toString().slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {app.full_name}
                      </div>
                      <div className="text-xs text-muted-foreground md:hidden mt-0.5">
                        {app.phone}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="text-sm">{app.email}</div>
                      <div className="text-xs text-muted-foreground">{app.phone}</div>
                    </TableCell>
                    <TableCell>
                      {app.hierarchy_id ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{app.hierarchy_id.course_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {app.hierarchy_id.branch_name} • {app.hierarchy_id.standard_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {app.prn ? (
                          <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded w-fit">{app.prn}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No PRN</span>
                        )}
                        {app.form_data?.assigned_division ? (
                          <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded w-fit">
                            Div: {app.form_data.assigned_division} (Roll: {app.form_data.assigned_roll_number || '-'})
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No Div</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className={`capitalize ${getStatusColor(app.status)}`}>
                        {app.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Details Sheet Component */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto bg-background p-0 border-l border-border">
          {isLoadingDetails || !appDetails ? (
            <div className="h-full flex items-center justify-center">
              <Spinner className="h-8 w-8 text-primary" />
            </div>
          ) : (
            <div className="flex flex-col min-h-full">
              
              {/* Sheet Sticky Header */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border p-6 pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <SheetTitle className="text-2xl font-bold">{appDetails.full_name}</SheetTitle>
                    <SheetDescription className="text-sm mt-1 flex items-center gap-2">
                      <Badge variant="outline" className={`capitalize ${getStatusColor(appDetails.status)}`}>
                        {appDetails.status.replace(/_/g, ' ')}
                      </Badge>
                      <span>•</span>
                      ID: {appDetails.en_number || appDetails._id.toString().slice(-6).toUpperCase()}
                    </SheetDescription>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" /> {appDetails.email}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Activity className="h-4 w-4" /> {appDetails.phone}
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 flex-1 space-y-6">
                <Tabs defaultValue="demographics" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted">
                    <TabsTrigger value="demographics" className="data-[state=active]:bg-background data-[state=active]:text-primary">Demographics</TabsTrigger>
                    <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:text-primary">Documents</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:text-primary">Audit Log</TabsTrigger>
                  </TabsList>
                  
                  {/* Demographics Tab */}
                  <TabsContent value="demographics" className="space-y-6 mt-6">
                    {/* Render the giant form_data object elegantly */}
                    {appDetails.form_data ? (
                      Object.entries(appDetails.form_data).map(([sectionKey, sectionData]: [string, any]) => {
                        if (!sectionData || typeof sectionData !== 'object' || Object.keys(sectionData).length === 0) return null;
                        
                        return (
                          <div key={sectionKey} className="rounded-lg border border-border bg-card overflow-hidden">
                            <div className="bg-muted/50 px-4 py-2 border-b border-border">
                              <h3 className="font-semibold capitalize text-foreground">
                                {sectionKey.replace(/_/g, ' ')}
                              </h3>
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                              {Object.entries(sectionData).map(([key, value]) => (
                                <div key={key} className="flex flex-col">
                                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <span className="text-sm font-medium text-foreground">
                                    {value === true ? "Yes" : value === false ? "No" : String(value || "—")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                        No expanded demographic data found.
                      </div>
                    )}
                  </TabsContent>

                  {/* Documents Tab */}
                  <TabsContent value="documents" className="space-y-4 mt-6">
                    {appDetails.documents?.length > 0 ? (
                      appDetails.documents.map((doc: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-md text-primary">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium capitalize text-foreground">{doc.name.replace(/_/g, ' ')}</p>
                                <DocumentValidityBadge documentName={doc.name} issueDate={doc.issue_date} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">Uploaded on {new Date(appDetails.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={
                            doc.status === 'verified' ? 'border-emerald-500 text-emerald-600' : 
                            doc.status === 'rejected' ? 'border-red-500 text-red-600' : 'border-amber-500 text-amber-600'
                          }>
                            {doc.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border">
                        No documents have been uploaded yet.
                      </div>
                    )}
                  </TabsContent>

                  {/* Audit Log Tab */}
                  <TabsContent value="history" className="space-y-4 mt-6">
                    <div className="relative border-l border-border ml-3 space-y-6">
                      {appDetails.stage_history?.map((stage: any, i: number) => (
                        <div key={i} className="relative pl-6">
                          <div className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                          <p className="font-semibold capitalize text-foreground">{stage.status.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground mt-1">{stage.comment}</p>
                          <p className="text-xs text-muted-foreground mt-2 opacity-60">
                            {new Date(stage.timestamp || stage.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Sticky Action Footer */}
              <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border p-6 mt-auto">
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">Admin Review Notes</label>
                  <Textarea 
                    placeholder="Add mandatory notes before approving or rejecting..." 
                    className="resize-none bg-card"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button 
                    variant="outline" 
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                    disabled={isUpdating || !reviewNotes}
                    onClick={() => handleStatusUpdate('rejected')}
                  >
                    <XCircle className="w-4 h-4 mr-2" /> Reject
                  </Button>
                  <Button 
                    className="bg-emerald-500 hover:bg-emerald-600 text-white"
                    disabled={isUpdating}
                    onClick={() => handleStatusUpdate('verified')}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Approve & Verify
                  </Button>
                </div>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
