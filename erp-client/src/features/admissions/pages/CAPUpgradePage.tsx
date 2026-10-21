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

import { useState } from "react";
import {  Search, ArrowUpCircle, FileText } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getApplications, requestNOC, confirmUpgrade } from "../api";

import { Button } from "@/components/marketing_ui/button";
import { Input } from "@/components/marketing_ui/input";
import { Spinner } from "@/components/marketing_ui/spinner";

export function CAPUpgradePage() {
  const [enSearch, setEnSearch] = useState("");
  const [queryEn, setQueryEn] = useState("");
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admission-applications", queryEn],
    queryFn: () => getApplications({ search: queryEn }),
    enabled: !!queryEn });

  const nocMutation = useMutation({
    mutationFn: (en: string) => requestNOC(en),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission-applications", queryEn] });
    } });

  const upgradeMutation = useMutation({
    mutationFn: (en: string) => confirmUpgrade(en),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admission-applications", queryEn] });
      qc.invalidateQueries({ queryKey: ["admission-analytics"] });
    } });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (enSearch.trim()) {
      setQueryEn(enSearch.trim());
    }
  };

  const candidate = data?.applications?.find((a: any) => a.en_number?.toLowerCase() === queryEn.toLowerCase());

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CAP Upgrades & NOC</h1>
          <p className="text-muted-foreground mt-1">Process NOC requests and confirm upgrades for candidates participating in subsequent CAP rounds.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="p-5 border-b border-border">
          <h2 className="text-lg font-bold">Find Candidate</h2>
        </div>
        <div className="p-5">
          <form onSubmit={handleSearch} >
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Enter EN Number (e.g. EN23123456)"
                value={enSearch}
                onChange={(e) => setEnSearch(e.target.value)}
              />
            </div>
            <Button type="submit" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2" disabled={!enSearch.trim() || isLoading}>
              {isLoading ? <Spinner size={16}  /> : "Search"}
            </Button>
          </form>
        </div>
      </div>

      {queryEn && !isLoading && !candidate && (
        <div className="bg-amber-100 text-amber-800 p-4 rounded-md border border-amber-200">
          <strong>Not Found</strong>
          <br/>No candidate found with EN Number "{queryEn}".
        </div>
      )}

      {queryEn && isError && (
        <div className="bg-red-100 text-red-800 p-4 rounded-md border border-red-200">
          <strong>Error</strong>
          <br/>Failed to fetch candidate information.
        </div>
      )}

      {candidate && (
        <div >
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="p-5 border-b border-border">
              <h2 className="text-lg font-bold">Candidate Status</h2>
            </div>
            <div className="p-5">
              {upgradeMutation.isSuccess && (
                <div >
                  <div className="bg-emerald-100 text-emerald-800 p-4 rounded-md border border-emerald-200">
                    <strong>Upgrade Confirmed</strong>
                    <br/>Candidate has been marked as upgraded and their seat has been vacated.
                  </div>
                </div>
              )}

              {(upgradeMutation.isError || nocMutation.isError) && (
                <div >
                  <div className="bg-red-100 text-red-800 p-4 rounded-md border border-red-200">
                    <strong>Action Failed</strong>
                    <br/>{((upgradeMutation.error || nocMutation.error) as any)?.response?.data?.error || "An error occurred while processing the request."}
                  </div>
                </div>
              )}

              <div >
                <div >
                  <div><strong>Name:</strong> {candidate.full_name}</div>
                  <div><strong>EN Number:</strong> {candidate.en_number}</div>
                  <div><strong>Category:</strong> {candidate.category || "OPEN"}</div>
                </div>
                <div >
                  <div>
                    <strong>Current Status:</strong>{" "}
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${candidate.status === "enrolled" ? "bg-emerald-100 text-emerald-800" : candidate.status === "upgraded" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                      {candidate.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div>
                    <strong>RLA Status:</strong>{" "}
                    {candidate.rla_status === "upgraded" ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800">Upgraded Out</span>
                    ) : candidate.rla_status === "reported" ? (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800">Reported</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">{candidate.rla_status || "Pending"}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div >
            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-bold">Step 1: NOC Request</h2>
              </div>
              <div className="p-5">
                <p >
                  Issue a No Objection Certificate if the candidate requests to participate in the next CAP round. This does not cancel their current admission.
                </p>
                <Button
                  variant="outline"
                  disabled={nocMutation.isPending || candidate.status === "upgraded"}
                  onClick={() => nocMutation.mutate(candidate.en_number!)}
                >
                  {nocMutation.isPending ? <Spinner size={16} className=" mr-2" /> : <FileText size={16} className="mr-2" />}
                  Generate NOC
                </Button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm">
              <div className="p-5 border-b border-border">
                <h2 className="text-lg font-bold">Step 2: Confirm Upgrade</h2>
              </div>
              <div className="p-5">
                <p >
                  If the candidate is allotted a seat elsewhere, confirm the upgrade. <strong>Warning:</strong> This will cancel their current admission and release their seat for the vacancy pool.
                </p>
                <Button
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium bg-red-600 text-white shadow hover:bg-red-700 h-9 px-4 py-2 disabled:opacity-50"
                  disabled={upgradeMutation.isPending || candidate.status === "upgraded"}
                  onClick={() => {
                    if (window.confirm("Are you sure you want to mark this candidate as upgraded? Their seat will be vacated.")) {
                      upgradeMutation.mutate(candidate.en_number!);
                    }
                  }}
                >
                  {upgradeMutation.isPending ? <Spinner size={16} className=" mr-2" /> : <ArrowUpCircle size={16} className="mr-2" />}
                  Confirm Upgrade
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
