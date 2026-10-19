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
import { Button } from '@/components/marketing_ui/button';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/marketing_ui/dropdown-menu';
import { Card, CardContent } from '@/components/marketing_ui/card';
import { ButtonGroup } from '@/components/marketing_ui/button-group';
import { Badge } from '@/components/marketing_ui/badge';
import { Columns, Download, Archive, Trash2, Mail } from 'lucide-react';
import { toast } from 'sonner';

// 1. ColumnVisibilityMenu
export const ColumnVisibilityMenu: React.FC<{
  columns: { id: string; label: string; isVisible: boolean }[];
  onToggle: (id: string) => void;
}> = ({ columns, onToggle }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
          <Columns className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            className="capitalize"
            checked={column.isVisible}
            onCheckedChange={() => onToggle(column.id)}
          >
            {column.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// 2. BillingExportMenu
export const BillingExportMenu: React.FC<{
  onExport: (format: 'csv' | 'pdf' | 'excel') => Promise<void>;
}> = ({ onExport }) => {
  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    toast.promise(onExport(format), {
      loading: 'Generating export...',
      success: `Exported successfully as ${format.toUpperCase()}`,
      error: 'Failed to generate export',
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>Export as Excel</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// 3. BulkActionToolbar
export const BulkActionToolbar: React.FC<{
  selectedCount: number;
  onAction: (action: 'archive' | 'delete' | 'email') => void;
}> = ({ selectedCount, onAction }) => {
  if (selectedCount === 0) return null;

  return (
    <Card className="bg-primary/5 border-primary/20 shadow-sm mb-4">
      <CardContent className="p-3 flex items-center justify-between">
        <span className="text-sm font-medium text-primary">
          {selectedCount} item(s) selected
        </span>
        <ButtonGroup>
          <Button variant="outline" size="sm" onClick={() => onAction('email')}>
            <Mail className="mr-2 h-4 w-4" /> Message
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAction('archive')}>
            <Archive className="mr-2 h-4 w-4" /> Archive
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onAction('delete')}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </ButtonGroup>
      </CardContent>
    </Card>
  );
};

// 4. BillingAuditTimeline
export const BillingAuditTimeline: React.FC<{
  events: { id: string; timestamp: Date; user: string; action: string; details?: string; status: 'success' | 'warning' | 'error' }[];
}> = ({ events }) => {
  return (
    <div className="p-4">
      <h3 className="text-lg font-medium mb-4">Audit Trail</h3>
      <div className="space-y-4 border-l pl-4">
        {events.map((event) => (
          <div key={event.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
            <div className="flex items-center gap-2">
              <span className="font-medium">{event.action}</span>
              <Badge variant={event.status === 'error' ? 'destructive' : event.status === 'warning' ? 'secondary' : 'default'}>
                {event.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{event.details || `Performed by ${event.user}`}</p>
            <time className="text-xs text-muted-foreground">{event.timestamp.toLocaleString()}</time>
          </div>
        ))}
      </div>
    </div>
  );
};

export { BillingEmptyState } from './BillingLayoutComponents';
