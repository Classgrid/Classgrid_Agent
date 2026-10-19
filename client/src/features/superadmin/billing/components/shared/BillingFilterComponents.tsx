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
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, Save, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/marketing_ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/marketing_ui/popover';
import { Calendar as NikhilCalendar } from '@/components/marketing_ui/nikhil_calendar';
import { SelectAdvanced } from '@/components/marketing_ui/select-advanced';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/marketing_ui/dropdown-menu';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/marketing_ui/pagination';
import { Badge } from '@/components/marketing_ui/badge';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/marketing_ui/sheet';
import { cn } from '@/lib/utils';
import { useBillingOrganizations } from '../../hooks/useBillingFilters';

export const DateRangePicker: React.FC<{
  date?: { from: Date; to?: Date };
  setDate: (date: { from: Date; to?: Date } | undefined) => void;
}> = ({ date, setDate }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button
        id="billing-date-range"
        variant="outline"
        className={cn('w-[300px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {date?.from
          ? date.to
            ? `${format(date.from, 'LLL dd, y')} - ${format(date.to, 'LLL dd, y')}`
            : format(date.from, 'LLL dd, y')
          : 'Pick a date range'}
      </Button>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <NikhilCalendar
        initialFocus
        mode="range"
        defaultMonth={date?.from}
        selected={date}
        onSelect={setDate as any}
        numberOfMonths={2}
      />
    </PopoverContent>
  </Popover>
);

export const OrganizationSelector: React.FC<{
  selectedId?: string;
  onSelect: (id: string) => void;
}> = ({ selectedId, onSelect }) => {
  const { data: organizations, isLoading } = useBillingOrganizations();
  const options = (organizations || []).map((organization: any) => ({
    label: organization.name,
    value: organization._id || organization.id,
  }));

  return (
    <SelectAdvanced
      options={options}
      value={selectedId || ''}
      onChange={onSelect}
      placeholder={isLoading ? 'Loading organizations...' : 'Search organization...'}
    />
  );
};

export const OrganizationTypeFilter: React.FC<{
  value?: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
    <SelectTrigger className="w-[180px] rounded-full border-dashed h-9"><SelectValue placeholder="Org Type" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Types</SelectItem>
      <SelectItem value="school">School</SelectItem>
      <SelectItem value="junior_college">Junior College</SelectItem>
      <SelectItem value="engineering">Engineering College</SelectItem>
      <SelectItem value="coaching">Coaching</SelectItem>
      <SelectItem value="diploma">Diploma Institution</SelectItem>
      <SelectItem value="other">Other</SelectItem>
    </SelectContent>
  </Select>
);

export const StructureTypeFilter: React.FC<{
  value?: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <Select value={value} onValueChange={(nextValue) => nextValue && onChange(nextValue)}>
    <SelectTrigger className="w-[200px] rounded-full border-dashed h-9"><SelectValue placeholder="Structure Type" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="ALL">All Structures</SelectItem>
      <SelectItem value="k12_standard">K-12 Standard</SelectItem>
      <SelectItem value="higher_ed_semester">Higher Ed (Semester)</SelectItem>
      <SelectItem value="coaching_batches">Coaching Batches</SelectItem>
    </SelectContent>
  </Select>
);

export const SavedViewSelector: React.FC<{
  views: { id: string; name: string }[];
  currentViewId?: string;
  onSelect: (id: string) => void;
  onSaveCurrent: () => void;
}> = ({ views, currentViewId, onSelect, onSaveCurrent }) => {
  const currentView = views.find((view) => view.id === currentViewId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          {currentView?.name || 'Default View'}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {views.map((view) => (
          <DropdownMenuItem key={view.id} onClick={() => onSelect(view.id)}>
            {view.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={onSaveCurrent} className="border-t mt-1 pt-1 font-medium text-primary">
          <Save className="mr-2 h-4 w-4" /> Save Current View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const BillingPagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => (
  <Pagination className="mt-4 justify-end">
    <PaginationContent>
      <PaginationItem>
        <PaginationPrevious
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          className={currentPage <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
        <PaginationItem key={page}>
          <PaginationLink
            isActive={currentPage === page}
            onClick={() => onPageChange(page)}
            className="cursor-pointer"
          >
            {page}
          </PaginationLink>
        </PaginationItem>
      ))}
      <PaginationItem>
        <PaginationNext
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        />
      </PaginationItem>
    </PaginationContent>
  </Pagination>
);

export const BillingFilterDrawer: React.FC<{
  children: React.ReactNode;
  activeFilterCount?: number;
  onApply: () => void;
  onClear?: () => void;
}> = ({ children, activeFilterCount = 0, onApply, onClear }) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" size="sm" className="gap-2">
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {activeFilterCount > 0 && <Badge variant="secondary">{activeFilterCount}</Badge>}
      </Button>
    </SheetTrigger>
    <SheetContent className="w-[400px] sm:w-[540px]">
      <SheetHeader><SheetTitle>Billing filters</SheetTitle></SheetHeader>
      <div className="space-y-6 py-6">{children}</div>
      <SheetFooter className="border-t pt-4">
        {onClear && <Button variant="ghost" onClick={onClear}>Clear all</Button>}
        <Button onClick={onApply}>Apply filters</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

export const ActiveFilterChips: React.FC<{
  filters: { id: string; label: string; value?: string }[];
  onRemove: (id: string) => void;
  onClearAll?: () => void;
}> = ({ filters, onRemove, onClearAll }) => {
  if (!filters.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Badge key={filter.id} variant="secondary" className="gap-1">
          {filter.label}{filter.value ? `: ${filter.value}` : ''}
          <button type="button" aria-label={`Remove ${filter.label} filter`} onClick={() => onRemove(filter.id)}>
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {onClearAll && <Button variant="ghost" size="sm" onClick={onClearAll}>Clear all</Button>}
    </div>
  );
};

export { BillingNavigation } from './BillingNavigation';
export { ColumnVisibilityMenu, BillingExportMenu, BulkActionToolbar } from './BillingActionComponents';
