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

import { type ColumnDef } from "@tanstack/react-table";
import {  RefreshCw } from "lucide-react";

import { useMeritList, useGenerateMerit } from "../queries/useMeritList";
import type { MeritListEntry } from "../types";

import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";

const columns: ColumnDef<MeritListEntry>[] = [
  {
    accessorKey: "general_rank",
    header: "#",
    cell: ({ row }) => (
      <span >{(row.original.general_rank ?? row.index + 1)}</span>
    ),
    size: 60 },
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => <span >{row.original.full_name}</span> },
  {
    accessorKey: "merit_score",
    header: "Merit %",
    cell: ({ row }) => `${(row.original.merit_score ?? 0).toFixed(2)}%` },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => row.original.category || "OPEN" },
  {
    accessorKey: "category_rank",
    header: "Cat. Rank",
    cell: ({ row }) => row.original.category_rank ?? "—" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const s = row.original.status;
      const v = s === "enrolled" ? "success" : s === "fee_pending" ? "warning" : "neutral";
      return <div variant={v as "success" | "warning" | "neutral"}>{s.replace(/_/g, " ")}</div>;
    } },
];

export function MeritListPage() {
  const { data, isLoading, isError } = useMeritList();
  const generate = useGenerateMerit();

  return (
    <div
      title="Merit Lists"
      description="Generated merit rankings based on admission configuration."
      breadcrumbs={[
        { label: "Admissions", to: "/dept/admissions/dashboard" },
        { label: "Merit Lists" },
      ]}
      actions={
        <Button
          variant="default"
          disabled={generate.isPending}
          onClick={() => generate.mutate(undefined)}
        >
          {generate.isPending ? <Spinner size={14}  /> : <RefreshCw size={14} />}
          Generate Merit
        </Button>
      }
    >
      {isError && (
        <div variant="danger" title="Error">Could not load merit list.</div>
      )}

      {generate.isSuccess && (
        <div variant="success" title="Merit Generated">
          Merit list regenerated successfully.
        </div>
      )}

      {isLoading ? (
        <div >
          <Spinner size={24}  />
        </div>
      ) : (
        <div
          columns={columns}
          data={data?.merit_list ?? []}
          pageSize={25}
          emptyMessage="No merit list generated yet. Click 'Generate Merit' to create one."
        />
      )}
    </div>
  );
}
