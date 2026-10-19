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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/marketing_ui/card';
import { Button } from '@/components/marketing_ui/button';
import { Badge } from '@/components/marketing_ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/marketing_ui/tabs';
import { Building2, Package, TrendingUp } from 'lucide-react';
import { MoneyDisplay, AsyncBillingState } from '../shared/BillingStateComponents';
import { useRevenueByOrg, useRevenueByModule } from '../../hooks/useBillingFinance';

// 21. RevenueViewTabs
export const RevenueViewTabs: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full mb-6">
      <TabsList className="grid w-full grid-cols-3 lg:w-[560px]">
        <TabsTrigger value="organizations" className="flex items-center gap-2">
          <Building2 className="w-4 h-4" /> By Organization
        </TabsTrigger>
        <TabsTrigger value="types" className="flex items-center gap-2">
          <Package className="w-4 h-4" /> By Payment Type
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

// 22. RevenueOrganizationTable
export const RevenueOrganizationTable: React.FC<{ filters?: any }> = ({ filters }) => {
  const { data: revenueData, isLoading, error } = useRevenueByOrg(filters);

  return (
    <div className="rounded-md border bg-card">
      <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Organization</TableHead>
              <TableHead className="text-right">Captured revenue</TableHead>
              <TableHead className="text-right">Transactions</TableHead>
              <TableHead>Latest capture</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenueData?.map((item: any) => (
              <TableRow key={item._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-xs bg-indigo-500">
                      {(item.organizationName || item._id || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-semibold text-foreground text-sm truncate" title={item.organizationName || item._id}>
                        {item.organizationName || item._id}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        ID: {item._id}
                      </span>
                    </div>
                  </div>



                </TableCell>
                <TableCell className="text-right font-medium text-primary">
                  <MoneyDisplay amountPaise={item.grossRevenuePaise} />
                </TableCell>
                <TableCell className="text-right">{item.transactionCount}</TableCell>
                <TableCell>{item.latestTransactionDate ? new Date(item.latestTransactionDate).toLocaleString() : 'Unavailable'}</TableCell>
              </TableRow>
            ))}
            {revenueData?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No revenue data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AsyncBillingState>
    </div>
  );
};

// 23. RevenueModuleTable
export const RevenueTypeTable: React.FC<{ filters?: any }> = ({ filters }) => {
  const { data: revenueData, isLoading, error } = useRevenueByModule(filters);

  return (
    <div className="rounded-md border bg-card">
      <AsyncBillingState loading={isLoading} error={error} skeletonType="table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment Type</TableHead>
              <TableHead className="text-right">Transaction Count</TableHead>
              <TableHead className="text-right">Gross Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {revenueData?.map((item: any) => (
              <TableRow key={item._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="uppercase">{item._id || 'UNKNOWN'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{item.transactionCount}</TableCell>
                <TableCell className="text-right font-medium text-primary">
                  <MoneyDisplay amountPaise={item.grossRevenuePaise} />
                </TableCell>
              </TableRow>
            ))}
            {revenueData?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                  No module revenue data found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </AsyncBillingState>
    </div>
  );
};
