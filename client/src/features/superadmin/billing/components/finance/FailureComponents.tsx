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

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { Badge } from '@/components/marketing_ui/badge';
import { Button } from '@/components/marketing_ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose, DrawerFooter } from '@/components/marketing_ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/marketing_ui/dialog';
import { Input } from '@/components/marketing_ui/input';
import { Label } from '@/components/marketing_ui/label';
import { Textarea } from '@/components/marketing_ui/textarea';
import { Checkbox } from '@/components/marketing_ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/marketing_ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { Building2, AlertTriangle, ArrowRightCircle, Terminal, Clock, StickyNote, Link as LinkIcon, UserPlus, CheckCircle, Download, MailWarning } from 'lucide-react';
import { MoneyDisplay, AsyncBillingState } from '../shared/BillingStateComponents';
import { DataTable } from '@/components/marketing_ui/data-table';
import { 
  useFailedPaymentsList, 
  useFailedPaymentDetail, 
  useGeneratePaymentLink, 
  useAssignFailure, 
  useAddFailureNote, 
  useResolveFailure,
  useFailureOverview,
  useNotifyFailureOrganization,
  useFailureDiagnosticExport
} from '../../hooks/useBillingFailures';
import { format } from 'date-fns';
import { useBillingExportDownload, useBillingExportJob } from '../../hooks/useBillingExports';

// 72. FailureStageBadge
export const FailureStageBadge: React.FC<{ stage: string }> = ({ stage }) => {
  const map: Record<string, 'destructive' | 'warning' | 'secondary'> = {
    'AUTHENTICATION': 'warning',
    'CAPTURE': 'destructive',
    'VERIFICATION': 'destructive',
    'WEBHOOK': 'secondary'
  };
  return <Badge variant={map[stage] || 'outline'}>{stage}</Badge>;
};

// 73. FailureResponsibilityBadge
export const FailureResponsibilityBadge: React.FC<{ responsibility: string }> = ({ responsibility }) => {
  const map: Record<string, string> = {
    'CUSTOMER': 'bg-orange-100 text-orange-800 border-orange-200',
    'SYSTEM': 'bg-red-100 text-red-800 border-red-200',
    'PROVIDER': 'bg-yellow-100 text-yellow-800 border-yellow-200'
  };
  return <Badge variant="outline" className={`${map[responsibility] || 'bg-gray-100 text-gray-800'}`}>{responsibility}</Badge>;
};

// 74. FailureReasonFilter
export const FailureReasonFilter: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="Filter by Reason" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Reasons</SelectItem>
      <SelectItem value="INSUFFICIENT_FUNDS">Insufficient Funds</SelectItem>
      <SelectItem value="AUTHENTICATION_FAILED">Auth Failed</SelectItem>
      <SelectItem value="CARD_DECLINED">Card Declined</SelectItem>
      <SelectItem value="TIMEOUT">Gateway Timeout</SelectItem>
    </SelectContent>
  </Select>
);

// 75. FailureStageFilter
export const FailureStageFilter: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
    <SelectTrigger className="w-[180px]">
      <SelectValue placeholder="Filter by Stage" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Stages</SelectItem>
      <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
      <SelectItem value="CAPTURE">Capture</SelectItem>
      <SelectItem value="VERIFICATION">Verification</SelectItem>
      <SelectItem value="WEBHOOK">Webhook Sync</SelectItem>
    </SelectContent>
  </Select>
);

// 76. RelatedAttemptList
export const RelatedAttemptList: React.FC<{ attempts: any[] }> = ({ attempts }) => (
  <div className="space-y-2">
    <h4 className="text-sm font-medium">Related Payment Attempts</h4>
    {attempts?.length > 0 ? (
      <div className="space-y-2">
        {attempts.map((a, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm p-2 border rounded-md">
            <span className="font-mono text-muted-foreground">{a.id}</span>
            <Badge variant={a.status === 'SUCCESS' ? 'success' : 'destructive'}>{a.status}</Badge>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">No other attempts found.</p>
    )}
  </div>
);

// 77. ContactAdministratorDialog
export const ContactAdministratorDialog: React.FC<{ failureId: string }> = ({ failureId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const notify = useNotifyFailureOrganization(failureId);
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MailWarning className="w-4 h-4" /> Notify School Admin
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Alert to School Admin</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Explain the payment failure and required action..." 
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button
            disabled={!message.trim() || notify.isPending}
            onClick={() => notify.mutate(
              { message: message.trim() },
              {
                onSuccess: () => {
                  setMessage('');
                  setIsOpen(false);
                },
              }
            )}
          >
            {notify.isPending ? 'Sending...' : 'Send notification'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 96. DiagnosticExportDialog
export const DiagnosticExportDialog: React.FC<{ failureId: string }> = ({ failureId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [includeRedactedPayload, setIncludeRedactedPayload] = useState(false);
  const [queuedJobId, setQueuedJobId] = useState('');
  const exportMutation = useFailureDiagnosticExport(failureId);
  const exportJob = useBillingExportJob(queuedJobId);
  const downloadExport = useBillingExportDownload();

  const queueExport = () => {
    exportMutation.mutate(
      { format: 'JSON', includeRedactedPayload },
      {
        onSuccess: (job) => {
          setQueuedJobId(job?._id || job?.id || '');
        },
      },
    );
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setQueuedJobId('');
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Export diagnostics
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Queue secure diagnostic export</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            The export is generated as a short-lived JSON file. Payment credentials and direct identifiers are never included.
          </p>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id={`include-redacted-payload-${failureId}`}
              checked={includeRedactedPayload}
              onCheckedChange={(checked) => setIncludeRedactedPayload(checked === true)}
            />
            <div>
              <Label htmlFor={`include-redacted-payload-${failureId}`}>Include redacted provider payload</Label>
              <p className="text-xs text-muted-foreground">
                Only the server-approved, redacted payload is added.
              </p>
            </div>
          </div>
          {queuedJobId && (
            <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <p>Export status: <span className="font-medium">{exportJob.data?.status || 'PENDING'}</span></p>
              <p>Job ID: <span className="font-mono">{queuedJobId}</span></p>
              {exportJob.data?.status === 'COMPLETED' && (
                <Button
                  size="sm"
                  onClick={() => downloadExport.mutate(queuedJobId)}
                  disabled={downloadExport.isPending}
                >
                  {downloadExport.isPending ? 'Opening...' : 'Download secure export'}
                </Button>
              )}
              {exportJob.data?.status === 'FAILED' && (
                <p className="text-destructive">{exportJob.data.errorDetails || 'Export generation failed.'}</p>
              )}
            </div>
          )}
          {exportMutation.error && (
            <p className="text-sm text-destructive">
              {exportMutation.error instanceof Error ? exportMutation.error.message : 'Could not queue the export.'}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Close</Button>
          <Button disabled={exportMutation.isPending || !!queuedJobId} onClick={queueExport}>
            {exportMutation.isPending ? 'Queuing...' : queuedJobId ? 'Queued' : 'Queue export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 27. FailedPaymentTable
export const FailedPaymentTable: React.FC<{
  onResolve: (failureId: string) => void;
  filters?: any;
}> = ({ onResolve, filters }) => {
  const { data: failures, isLoading, error } = useFailedPaymentsList(filters);

  const columns = [
    {
      key: "customer",
      header: "Customer",
      width: "w-[300px]",
      render: (_: any, fail: any) => {
        const name = fail.userName || "Unknown";
        const initial = name.charAt(0).toUpperCase();
        const picture = fail.profilePicture || fail.userId?.profilePicture || fail.user?.profilePicture;
        return (
          <div className="flex items-center gap-3 py-1">
            {picture ? (
              <img src={picture} alt={name} className="h-8 w-8 rounded-full object-cover border border-border flex-shrink-0" />
            ) : (
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-xs">
                {name?.substring(0, 2).toUpperCase() || "??"}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-medium text-sm text-foreground truncate transition-colors" title={name}>
                {name}
              </span>
              <span className="text-muted-foreground text-xs truncate" title={fail.userEmail}>
                {fail.userEmail || "No email"}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "paymentDetail",
      header: "Payment Detail",
      render: (_: any, fail: any) => (
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-sm text-foreground font-medium truncate" title={fail.providerTxId || fail.razorpayPaymentId || fail.paymentId}>
            {fail.providerTxId || fail.razorpayPaymentId || fail.paymentId || "N/A"}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              {format(new Date(fail.createdAt), 'EEE MMM dd, h:mma')} • {fail.organization?.name || fail.organizationName || fail.orgId || ""}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "w-[100px]",
      render: (_: any, fail: any) => (
        <span className="text-sm font-medium text-foreground">
          <MoneyDisplay amountPaise={fail.amountPaise || fail.amount * 100} />
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[120px]",
      render: (_: any, fail: any) => (
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-xs font-medium text-red-500 truncate">
            {fail.reason || fail.stage || "Failed"}
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "w-[90px]",
      render: (_: any, fail: any) => (
        <Button 
          variant="primary" 
          size="sm" 
          onClick={(e) => { e.stopPropagation(); onResolve(fail.id); }}
        >
          Read
        </Button>
      ),
    },
  ];

  return (
    <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
      <DataTable 
        columns={columns} 
        rows={failures || []} 
        emptyMessage="No active payment failures found."
        onRowClick={(row) => onResolve(row.id)}
      />
    </AsyncBillingState>
  );
};

// 66. ErrorPayloadPanel
export const ErrorPayloadPanel: React.FC<{ payload: any }> = ({ payload }) => (
  <Card>
    <CardHeader className="py-3 px-4 border-b">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <Terminal className="w-4 h-4 text-muted-foreground" />
        Raw Error Payload
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 bg-muted/30">
      <pre className="text-xs font-mono overflow-auto max-h-48 text-muted-foreground">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </CardContent>
  </Card>
);

// 67. RecoveryTimeline
export const RecoveryTimeline: React.FC<{ timeline: any[] }> = ({ timeline }) => (
  <div className="space-y-4">
    <h4 className="text-sm font-medium flex items-center gap-2">
      <Clock className="w-4 h-4" /> Recovery Attempts
    </h4>
    <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
      {timeline?.map((event: any, i) => (
        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
          <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-card shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
            <div className={`w-2 h-2 rounded-full ${event.status === 'SUCCESS' ? 'bg-success' : 'bg-muted-foreground'}`} />
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] border rounded-lg p-3 bg-card shadow-sm">
            <div className="flex justify-between mb-1 text-sm font-medium">
              <span>{event.action}</span>
              <span className="text-muted-foreground text-xs">{format(new Date(event.timestamp), 'MMM dd, HH:mm')}</span>
            </div>
            <p className="text-xs text-muted-foreground">{event.note}</p>
          </div>
        </div>
      ))}
      {!timeline?.length && <p className="text-sm text-muted-foreground ml-12 md:mx-auto text-center">No recovery actions recorded yet.</p>}
    </div>
  </div>
);

// 68. InternalNotePanel
export const InternalNotePanel: React.FC<{ failureId: string; notes: any[] }> = ({ failureId, notes }) => {
  const [note, setNote] = useState('');
  const addMutation = useAddFailureNote(failureId);

  return (
    <Card>
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="w-4 h-4" /> Internal Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="max-h-40 overflow-y-auto space-y-3">
          {notes?.map((n: any, i) => (
            <div key={i} className="bg-muted/50 p-3 rounded-md text-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-xs">{n.authorId}</span>
                <span className="text-xs text-muted-foreground">{format(new Date(n.timestamp), 'MMM dd, HH:mm')}</span>
              </div>
              <p className="text-muted-foreground">{n.text}</p>
            </div>
          ))}
          {!notes?.length && <p className="text-xs text-muted-foreground">No internal notes.</p>}
        </div>
        <div className="flex gap-2">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note..." className="h-8 text-sm" />
          <Button 
            size="sm" 
            className="h-8" 
            disabled={!note || addMutation.isPending}
            onClick={() => addMutation.mutate({ note: note }, { onSuccess: () => setNote('') })}
          >
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// 69. GeneratePaymentLinkDialog
export const GeneratePaymentLinkDialog: React.FC<{ failureId: string }> = ({ failureId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const generateMutation = useGeneratePaymentLink(failureId);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setGeneratedLink('');
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LinkIcon className="w-4 h-4" /> Generate Link
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate payment recovery link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            The server will use the original verified order amount and create a new provider-hosted link that expires in 24 hours.
          </p>
          {generatedLink && (
            <div className="space-y-2">
              <Label htmlFor={`payment-link-${failureId}`}>Secure payment link</Label>
              <div className="flex gap-2">
                <Input id={`payment-link-${failureId}`} readOnly value={generatedLink} />
                <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(generatedLink)}>
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button 
            disabled={generateMutation.isPending || !!generatedLink}
            onClick={() => generateMutation.mutate(
              { expiryHours: 24 },
              { onSuccess: (result) => setGeneratedLink(result.link) },
            )}
          >
            {generateMutation.isPending ? 'Generating...' : generatedLink ? 'Generated' : 'Generate Link'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// 70. FailureAssignmentPanel
export const FailureAssignmentPanel: React.FC<{ failureId: string; currentAssignee?: string }> = ({ failureId, currentAssignee }) => {
  const assignMutation = useAssignFailure(failureId);
  const [assigneeId, setAssigneeId] = useState(currentAssignee || '');

  return (
    <div className="flex items-center gap-3">
      <UserPlus className="w-4 h-4 text-muted-foreground" />
      <Input
        value={assigneeId}
        onChange={(event) => setAssigneeId(event.target.value)}
        placeholder="Investigator user ID"
        className="h-8 w-56 text-sm"
      />
      <Button
        size="sm"
        disabled={!assigneeId.trim() || assignMutation.isPending}
        onClick={() => assignMutation.mutate({ assigneeId: assigneeId.trim() })}
      >
        Assign
      </Button>
    </div>
  );
};

// 71. ResolutionStatusControl
export const ResolutionStatusControl: React.FC<{ failureId: string; status: string }> = ({ failureId, status }) => {
  const resolveMutation = useResolveFailure(failureId);

  if (status === 'RESOLVED') {
    return <Badge variant="success" className="gap-1"><CheckCircle className="w-3 h-3" /> Resolved</Badge>;
  }

  return (
    <Button 
      variant="default" 
      size="sm" 
      disabled={resolveMutation.isPending}
      onClick={() => resolveMutation.mutate({ resolution: 'Manual override via Admin Panel' })}
    >
      Mark Resolved
    </Button>
  );
};

// 65. FailureDetailDrawer (Expanded)
export const FailureDetailDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  failureId: string;
}> = ({ isOpen, onClose, failureId }) => {
  const { data: failure, isLoading, error } = useFailedPaymentDetail(failureId);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-3xl ml-auto right-0 left-auto h-full rounded-l-xl rounded-r-none">
        <DrawerHeader className="border-b pb-4 flex justify-between items-center">
          <DrawerTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Investigate Payment Failure
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="sm">Close</Button>
          </DrawerClose>
        </DrawerHeader>
        <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-muted/5">
          <AsyncBillingState loading={isLoading} error={error} skeletonType="card">
            {failure && (
              <>
                <div className="flex justify-between items-start bg-card p-6 rounded-lg border shadow-sm">
                  <div>
                    <h3 className="text-3xl font-semibold mb-2 text-destructive">
                      <MoneyDisplay amountPaise={failure.amountPaise} />
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{failure.organization?.name || failure.orgId}</span>
                      <span>•</span>
                      <span>{format(new Date(failure.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <ResolutionStatusControl failureId={failureId} status={failure.status} />
                    <div className="flex gap-2">
                      <GeneratePaymentLinkDialog failureId={failureId} />
                      <ContactAdministratorDialog failureId={failureId} />
                      <DiagnosticExportDialog failureId={failureId} />
                    </div>
                  </div>
                </div>

                <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-destructive mb-1">
                      Failure Reason (<FailureStageBadge stage={failure.stage} />)
                    </p>
                    <p className="text-sm text-foreground">
                      {failure.reason || 'Unknown error occurred during payment processing.'}
                    </p>
                  </div>
                  <FailureResponsibilityBadge responsibility={failure.responsibility || 'SYSTEM'} />
                </div>

                {failure.assigneeId && (
                  <div className="text-sm text-muted-foreground">
                    Assigned investigator: <span className="font-mono text-foreground">{failure.assigneeId}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-6">
                    <ErrorPayloadPanel payload={failure.rawPayload} />
                    <RelatedAttemptList attempts={failure.relatedAttempts} />
                    <InternalNotePanel failureId={failureId} notes={failure.notes} />
                  </div>
                  <div>
                    <RecoveryTimeline timeline={failure.recoveryAttempts} />
                  </div>
                </div>
              </>
            )}
          </AsyncBillingState>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export const FailedPaymentsTable: React.FC<{
  filters?: any;
  onViewDetail: (failureId: string) => void;
}> = ({ filters, onViewDetail }) => (
  <FailedPaymentTable filters={filters} onResolve={onViewDetail} />
);

export const FailedPaymentDetailDrawer = FailureDetailDrawer;

export const FailedPaymentsOverview: React.FC = () => {
  const { data, isLoading, error } = useFailureOverview();

  return (
    <AsyncBillingState loading={isLoading} error={error} skeletonType="card">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Open failures</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.failedPayments || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Revenue at risk</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            <MoneyDisplay amountPaise={data?.revenueAtRiskPaise || 0} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Affected organizations</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.affectedOrgs || 0}</CardContent>
        </Card>
      </div>
    </AsyncBillingState>
  );
};
