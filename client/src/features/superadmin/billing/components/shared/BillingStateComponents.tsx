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

import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Alert, AlertDescription, AlertTitle } from '@/components/marketing_ui/alert';
import { Spinner } from '@/components/marketing_ui/spinner';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { Badge } from '@/components/marketing_ui/badge';
import { StatusButton } from '@/components/marketing_ui/status-button';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/marketing_ui/hover-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { AlertCircle, Building2, GraduationCap, Clock, CheckCircle2, XCircle, Activity, Fingerprint, Terminal } from 'lucide-react';
import { format } from 'date-fns';

// 1. BillingErrorBoundary
export const BillingErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Billing Component Error</AlertTitle>
          <AlertDescription>
            An unexpected error occurred while rendering this billing component. Please refresh the page or contact engineering if the issue persists.
          </AlertDescription>
        </Alert>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// 2. AsyncBillingState
export const AsyncBillingState: React.FC<{
  loading: boolean;
  error?: Error | null;
  skeletonType?: 'table' | 'card' | 'form';
  children?: React.ReactNode;
}> = ({ loading, error, skeletonType = 'table', children }) => {
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Failed to load billing data</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    if (skeletonType === 'table') {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }
    if (skeletonType === 'card') {
      return <Skeleton className="h-32 w-full rounded-xl" />;
    }
    return (
      <div className="flex justify-center p-8">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return <>{children}</>;
};

// 3. MoneyDisplay
export const MoneyDisplay: React.FC<{
  amountPaise: number;
  currency?: string;
  className?: string;
  showSign?: boolean;
}> = ({ amountPaise, currency = 'INR', className, showSign = false }) => {
  const amount = Math.abs(amountPaise) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  const sign = amountPaise < 0 ? '-' : (showSign && amountPaise > 0 ? '+' : '');

  return (
    <span className={`font-medium tabular-nums ${className || ''}`}>
      {sign}{formatted}
    </span>
  );
};

// 4. BillingStatusBadge
export const BillingStatusBadge: React.FC<{
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID' | 'FAILED' | 'PENDING' | 'CAPTURED' | string;
  asButton?: boolean;
  onClick?: () => void;
}> = ({ status, asButton = false, onClick }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" = "default";
  
  if (['PAID', 'CAPTURED', 'ACTIVE'].includes(status)) variant = 'success';
  if (['FAILED', 'VOID', 'CANCELLED'].includes(status)) variant = 'destructive';
  if (['PENDING', 'DRAFT'].includes(status)) variant = 'warning';
  if (['ARCHIVED'].includes(status)) variant = 'secondary';

  if (asButton) {
    return (
      <StatusButton 
        variant={variant === 'success' ? 'success' : variant === 'destructive' ? 'error' : variant === 'warning' ? 'warning' : 'default'}
        text={status.replace(/_/g, ' ')}
        onClick={onClick}
        size="sm"
      />
    );
  }

  return <Badge variant={variant as any}>{status.replace(/_/g, ' ')}</Badge>;
};

// 5. OrganizationBillingContextBadge
export const OrganizationBillingContextBadge: React.FC<{
  orgType: string;
  structureType: string;
}> = ({ orgType, structureType }) => {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="inline-flex items-center gap-1.5 cursor-pointer">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            <Building2 className="w-3 h-3 mr-1" />
            {orgType.replace(/_/g, ' ')}
          </Badge>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-64">
        <div className="flex justify-between space-x-4">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold flex items-center">
              <GraduationCap className="w-4 h-4 mr-2 text-muted-foreground" />
              Academic Structure
            </h4>
            <p className="text-sm text-muted-foreground">
              This organization operates on a <span className="font-medium text-foreground">{structureType.replace(/_/g, ' ')}</span> hierarchy.
              Billing cycles are tied to this structure.
            </p>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

// 41. SuperAdminAuditLogsTable
export const SuperAdminAuditLogsTable: React.FC<{
  events: {
    id: string;
    action: string;
    description: string;
    timestamp: string;
    status: 'success' | 'failure' | 'pending';
    orgId: string;
    userId: string;
    ipAddress: string;
    durationMs: number;
    orgType?: string;
  }[];
}> = ({ events }) => {
  if (!events || events.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center border rounded-lg bg-card">No audit events found.</div>;
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Action Performed</TableHead>
            <TableHead>Status / Duration</TableHead>
            <TableHead>Target Org ID</TableHead>
            <TableHead>Initiating User ID</TableHead>
            <TableHead className="text-right">IP Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="whitespace-nowrap text-sm">
                {format(new Date(event.timestamp), 'dd MMM yyyy, HH:mm:ss')}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" /> {event.action}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 line-clamp-1">{event.description}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {event.status === 'success' && <Badge variant="success" className="gap-1"><CheckCircle2 className="w-3 h-3" /> SUCCESS</Badge>}
                  {event.status === 'failure' && <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> FAILED</Badge>}
                  {event.status === 'pending' && <Badge variant="warning" className="gap-1"><Clock className="w-3 h-3" /> PENDING</Badge>}
                  <span className="text-xs text-muted-foreground font-mono">{event.durationMs}ms</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono text-xs text-muted-foreground bg-muted/30">
                  {event.orgId || 'N/A - SYSTEM'}
                </Badge>
                {event.orgType && <span className="text-[10px] ml-2 text-muted-foreground uppercase">{event.orgType}</span>}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <Fingerprint className="w-3 h-3" />
                  {event.userId || 'N/A - SYSTEM'}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2 text-xs font-mono text-muted-foreground">
                  <Terminal className="w-3 h-3" />
                  {event.ipAddress || 'UNKNOWN'}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
