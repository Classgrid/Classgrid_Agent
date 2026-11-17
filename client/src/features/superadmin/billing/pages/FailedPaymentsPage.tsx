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
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveSelect } from '@/components/marketing_ui/responsive-select';
import { SuperadminFilterBar } from '../../components/SuperadminFilterBar';
import { NikhilTimeCalendar } from '@/components/marketing_ui/nikhil_time_calendar';
import { X } from 'lucide-react';
import { FailedPaymentsTable } from '../components/finance/FailureComponents';
import { useBreadcrumbStore } from "@/store/useBreadcrumbStore";
import { useBillingOrganizations } from '../hooks/useBillingFilters';

const FailedPaymentsPage = () => {
  const navigate = useNavigate();
  const setBreadcrumbs = useBreadcrumbStore((state) => state.setBreadcrumbs);
  
  useEffect(() => {
    setBreadcrumbs([
      { label: "Failed Payments" }
    ]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [organizationId, setOrganizationId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateType, setDateType] = useState<"created" | "updated">("created");

  const { data: organizations } = useBillingOrganizations();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = {
    organizationId: organizationId || undefined,
    startDate: dateFrom ? dateFrom.toISOString() : undefined,
    endDate: dateFrom ? (() => { const e = new Date(dateFrom); e.setHours(23, 59, 59, 999); return e.toISOString(); })() : undefined,
    search: search || undefined,
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-8">
      {/* ═══ FILTER BAR — copied from ClassgridTalkPage ═══ */}
      <SuperadminFilterBar
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        searchPlaceholder="Search here..."
      >
        {/* Org Name */}
        <div className="w-[180px]">
          <ResponsiveSelect
            className="flex h-9 w-full items-center rounded-md border border-border bg-transparent px-3 py-1 shadow-sm hover:bg-accent/50 transition-colors text-sm"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          >
            <option value="">Org: All</option>
            {organizations?.map((org: any) => (
              <option key={org._id || org.id} value={org._id || org.id}>
                {org.name}
              </option>
            ))}
          </ResponsiveSelect>
        </div>

        <div className="w-[180px] max-w-[180px] overflow-hidden relative">
          <NikhilTimeCalendar
            value={dateFrom}
            onChange={setDateFrom}
            placeholder="Select Date"
            popDirection="down"
            showTime={false}
            className="h-9 w-full pr-8"
          />
          {dateFrom && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setDateFrom(undefined); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-accent bg-background"
              title="Clear date"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </SuperadminFilterBar>

      {/* ═══ TABLE — direct render, no Card wrapper ═══ */}
      <div className="mt-4">
        <FailedPaymentsTable 
          filters={filters} 
          onViewDetail={(id) => navigate(`/super-admin/billing/failed-payments/${id}`)} 
        />
      </div>
    </div>
  );
};

export default FailedPaymentsPage;
