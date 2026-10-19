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

// 🛑 AI AGENT INSTRUCTION: DO NOT EDIT OR REFACTOR THIS FILE.
// The user explicitly requested that AI agents must NEVER modify this file,
// its layout, logic, or structure without extreme explicit permission.
// 🛑 STOP AND ASK BEFORE MAKING ANY CHANGES HERE.

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/marketing_ui/card';
import { RevenueViewTabs, RevenueOrganizationTable, RevenueTypeTable } from '../components/finance/RevenueComponents';
import { RevenueExportDialog } from '../components/finance/FinanceComponents';
import { SuperadminFilterBar } from '../../components/SuperadminFilterBar';
import { OrganizationSelector, OrganizationTypeFilter } from '../components/shared/BillingFilterComponents';
import { NikhilTimeCalendar } from '@/components/marketing_ui/nikhil_time_calendar';
import { X } from 'lucide-react';

const RevenuePage = () => {
  const [activeTab, setActiveTab] = useState('organizations');
  const [searchInput, setSearchInput] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [organizationType, setOrganizationType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateType, setDateType] = useState('createdAt');

  const filters = {
    organizationId: organizationId || undefined,
    organizationType: organizationType !== 'ALL' ? organizationType : undefined,
    startDate: dateFrom ? dateFrom.toISOString() : undefined,
    endDate: dateFrom ? (() => { const e = new Date(dateFrom); e.setHours(23, 59, 59, 999); return e.toISOString(); })() : undefined,
    search: searchInput || undefined,
  };

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-card p-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Revenue Ledger</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Includes Classgrid SaaS subscriptions and AI Credit top-up revenue.
          </p>
        </div>
                <RevenueExportDialog />
      </div>

      <div className="w-full relative z-50 p-6 pb-0">
        <SuperadminFilterBar
          searchQuery={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Search by organization name..."
        >
          <div className="w-full md:w-[180px] xl:w-[200px]">
            <OrganizationSelector selectedId={organizationId} onSelect={setOrganizationId} />
          </div>
          <div className="w-full md:w-[160px] xl:w-[180px]">
            <OrganizationTypeFilter value={organizationType} onChange={setOrganizationType} />
          </div>
          <div className="w-[180px] max-w-[180px] overflow-hidden relative">
            <NikhilTimeCalendar
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="Select Date"
              popDirection="down"
              showTime={false}
              className="h-9 w-full pr-8"
              dateType={dateType}
              onDateTypeChange={setDateType}
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
      </div>

      <div className="space-y-6 p-6">
        <RevenueViewTabs activeTab={activeTab} onTabChange={setActiveTab} />
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTab === 'organizations'
                ? 'Revenue by Organization'
                : activeTab === 'types' ? 'Revenue by Payment Type' : ''}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Detailed platform subscription and AI usage revenue records.</p>
          </CardHeader>
          <CardContent className="p-0">
            {activeTab === 'organizations' && <RevenueOrganizationTable filters={filters} />}
                        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenuePage;
