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

import { Input } from "@/components/marketing_ui/input";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {  Eye, MoreHorizontal } from "lucide-react";
import { DataTable } from "@/components/marketing_ui/data-table";
import { useApplications } from "../queries/useApplications";
import type { AdmissionApplication } from "../types";
import { Spinner } from "@/components/marketing_ui/spinner";

const statusOptions = [
  { label: "All Stages", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Applied", value: "applied" },
  { label: "Under Verification", value: "under_verification" },
  { label: "Verified", value: "verified" },
  { label: "Fee Pending", value: "fee_pending" },
  { label: "Enrolled", value: "enrolled" },
  { label: "Rejected", value: "rejected" },
  { label: "Waitlisted", value: "waitlisted" },
  { label: "Cancelled", value: "cancelled" },
  { label: "Withdrawn", value: "withdrawn" },
];

const statusVariant: Record<string, "success" | "info" | "warning" | "neutral" | "danger"> = {
  enrolled: "success",
  confirmed: "success",
  verified: "info",
  under_verification: "info",
  allotted: "info",
  fee_pending: "warning",
  waitlisted: "warning",
  rejected: "danger",
  cancelled: "danger",
  withdrawn: "danger",
  draft: "neutral",
  applied: "neutral" };

const columns: ColumnDef<AdmissionApplication>[] = [
  {
    accessorKey: "full_name",
    header: "Applicant",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
          {row.original.full_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div>
          <div className="font-medium truncate">{row.original.full_name}</div>
          <small className="text-muted-foreground">
            {row.original.email || row.original.phone || "—"}
          </small>
        </div>
      </div>
    ) },
  {
    accessorKey: "en_number",
    header: "EN Number",
    cell: ({ row }) => row.original.en_number || "—" },
  {
    accessorKey: "status",
    header: "Stage",
    cell: ({ row }) => {
      const v = statusVariant[row.original.status] ?? "neutral";
      let colorClass = "bg-gray-100 text-gray-800";
      if (v === "success") colorClass = "bg-emerald-100 text-emerald-800";
      if (v === "info") colorClass = "bg-blue-100 text-blue-800";
      if (v === "warning") colorClass = "bg-amber-100 text-amber-800";
      if (v === "danger") colorClass = "bg-red-100 text-red-800";
      
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
          {row.original.status.replace(/_/g, " ")}
        </span>
      );
    } },
  {
    accessorKey: "merit_score",
    header: "Merit %",
    cell: ({ row }) =>
      row.original.merit_score > 0 ? `${row.original.merit_score.toFixed(2)}%` : "—" },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => row.original.category || "—" },
  {
    accessorKey: "entry_mode",
    header: "Entry",
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-foreground">
        {row.original.entry_mode}
      </span>
    ) },
  {
    accessorKey: "fee_paid",
    header: "Fee",
    cell: ({ row }) =>
      row.original.fee_paid ? (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">Paid</span>
      ) : (
        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">Unpaid</span>
      ) },
  {
    accessorKey: "createdAt",
    header: "Applied",
    cell: ({ row }) =>
      new Date(row.original.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric" }) },
];

export function ApplicationsListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useApplications({
    status: statusFilter !== "all" ? statusFilter : undefined,
    search: search || undefined,
    page,
    limit: 20 });

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Applications</h1>
          <p className="text-muted-foreground mt-1">Complete list of admission applications for the current cycle.</p>
        </div>
      </div>

      {isError && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md border border-red-200">
          <strong>Error loading applications</strong>
          <br/>Could not fetch applications from server.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input 
          type="search" 
          placeholder="Search by name, email, EN number..." 
          className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
        <ResponsiveSelect
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </ResponsiveSelect>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Spinner size={24} className=" text-primary" />
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={data?.applications ?? []}
          />
        </div>
      )}
    </div>
  );
}
