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
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Coins } from "lucide-react";
import { SuperadminFilterBar } from "@/features/superadmin/components/SuperadminFilterBar";
import { BlueSlider } from "@/components/marketing_ui/BlueSlider";
import { DataTable } from "@/components/marketing_ui/data-table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectItem } from "@/components/marketing_ui/select";
import { NikhilDateCalendar } from "@/components/marketing_ui/nikhil_date_calendar";
import { Switch } from "@/components/marketing_ui/switch";
import { useGrantAiCredits, useGrantOrgAiCredits, useRequestSecurityCode, useVerifySecurityCode } from "@/features/superadmin/queries/useAiUsage";

// ── Types ──────────────────────────────────────────────────────
export interface OrgRow {
  id: string;
  name: string;
  orgName: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface GrantCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgs?: OrgRow[];
  isOrgMode?: boolean;
}

const ROLES = ["All Roles", "Admin", "Owner", "Member"];

const formatCredits = (n: number) => {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)} L`;
  return n.toLocaleString("en-IN");
};

export function GrantCreditsModal({ isOpen, onClose, orgs = [], isOrgMode = false }: GrantCreditsModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All Roles");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [credits, setCredits] = useState(5000);
  const [isSeparateMode, setIsSeparateMode] = useState(false);
  const [rowCredits, setRowCredits] = useState<Record<string, number>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [sendEmail, setSendEmail] = useState(true);
  const grantCreditsMutation = useGrantAiCredits();
  const grantOrgCreditsMutation = useGrantOrgAiCredits();
  const requestSecurityCode = useRequestSecurityCode();
  const verifySecurityCode = useVerifySecurityCode();

  // Filter orgs
  const filteredRows = useMemo(() => {
    return orgs.filter((org) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        org.name.toLowerCase().includes(q) ||
        org.email.toLowerCase().includes(q) ||
        org.orgName.toLowerCase().includes(q);
      const matchesRole = roleFilter === "All Roles" || org.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [searchQuery, roleFilter, orgs]);

  const selectedOrgs = orgs.filter((o) => selectedIds.includes(o.id));
  const firstOrg = selectedOrgs[0];

  // ── DataTable columns ─────────────────────────────────────────
  const columns = [
    {
      key: "name",
      header: "Name",
      width: "w-72",
      accent: true,
      render: (_: any, row: OrgRow) => (
        <div className="flex items-center gap-3">
          {row.avatar ? (
            <img
              src={row.avatar}
              alt={row.name}
              className={`w-8 h-8 ${isOrgMode ? 'rounded-md object-contain p-1' : 'rounded-full object-cover'} border border-border bg-muted shrink-0`}
            />
          ) : (
            <div className={`w-8 h-8 ${isOrgMode ? 'rounded-md' : 'rounded-full'} bg-muted border border-border shrink-0 flex items-center justify-center text-xs font-semibold text-muted-foreground`}>
              {row.name[0]}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-foreground truncate">{row.name}</span>
            {(!isOrgMode || row.name !== row.orgName) && (
              <span className="text-xs text-muted-foreground truncate">{row.orgName}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      width: "w-64",
      render: (val: string) => val ? (
        <a
          href={`mailto:${val}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-blue-500 hover:underline flex items-center gap-1 w-fit"
        >
          {val}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      ) : (
        <span className="text-xs text-muted-foreground italic">No Email Provided</span>
      ),
    },
    {
      key: "role",
      header: isOrgMode ? "ID" : "Role",
      width: "w-32",
      render: (val: string, row: OrgRow) => (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground inline-block" title={isOrgMode ? row.id : val}>
          {isOrgMode ? row.id : val}
        </span>
      ),
    },
    ...(isSeparateMode
      ? [
          {
            key: "slider",
            header: "Assign Credits",
            width: "w-64",
            render: (_: any, row: OrgRow) => (
              <div className="flex items-center gap-3 w-full pr-4" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <BlueSlider
                  value={rowCredits[row.id] || 500}
                  onValueChange={(v) => setRowCredits((prev) => ({ ...prev, [row.id]: v }))}
                  min={0}
                  max={10000}
                  step={100}
                />
                <span className="text-xs font-semibold w-12 text-right">{rowCredits[row.id] || 500}</span>
              </div>
            ),
          },
        ]
      : []),
    {
      key: "select",
      header: "",
      width: "w-14",
      render: (_: any, row: OrgRow) => {
        const isSelected = selectedIds.includes(row.id);
        return (
          <div className="flex justify-end pr-2">
            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected ? "border-blue-500 bg-blue-500" : "border-border"
              }`}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="grant-credits-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 bg-black/50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-5xl h-[80vh] flex flex-col bg-background border border-border rounded-2xl shadow-xl overflow-hidden relative"
          >

            {/* ── Body ── */}
            <div className="flex-1 min-h-0 px-6 py-5 flex flex-col gap-4">

              {/* ── Filter Bar ── */}
              <div className="shrink-0">
                <SuperadminFilterBar
                  searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search by name, email or org..."
              >
                {!isOrgMode && (
                  <Select value={roleFilter} onValueChange={(val) => setRoleFilter(val as string)}>
                    <SelectTrigger className="h-9 px-3 w-[140px] rounded-full border border-dashed border-border bg-transparent shadow-sm">
                      <SelectValue placeholder="All Roles" />
                    </SelectTrigger>
                    <SelectContent className="z-[400]">
                      <SelectGroup>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
                <Select 
                  value={isSeparateMode ? "separate" : ""} 
                  onValueChange={(val) => {
                    if (val === "all") {
                      setSelectedIds(filteredRows.map(r => r.id));
                      setIsSeparateMode(false);
                    }
                    if (val === "none") {
                      setSelectedIds([]);
                      setIsSeparateMode(false);
                    }
                    if (val === "separate") {
                      setIsSeparateMode(true);
                      // Clear standard selection when entering separate mode
                      setSelectedIds([]);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 px-3 w-[150px] rounded-full border border-dashed border-border bg-transparent shadow-sm">
                    <span className="text-sm">{isSeparateMode ? "Add Separate" : "Select All / None"}</span>
                  </SelectTrigger>
                  <SelectContent className="z-[500]">
                    <SelectGroup>
                      <SelectItem value="all">Select All</SelectItem>
                      <SelectItem value="separate">Add Separate</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </SuperadminFilterBar>
              </div>

              {/* ── DataTable ── */}
              <DataTable
                columns={columns}
                rows={filteredRows}
                emptyMessage="No organizations found."
                onRowClick={(row: OrgRow) => {
                  setSelectedIds((prev) => 
                    prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id]
                  );
                }}
                className="flex-1 min-h-0 overflow-y-auto custom-scrollbar"
              />

              {/* ── Bottom Bar replacing inline slider ── */}
              <AnimatePresence>
                {selectedOrgs.length > 0 && firstOrg && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 12, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 flex items-center justify-between border-t border-border pt-4 mt-2 gap-4"
                  >
                    <div className="text-sm shrink-0">
                      <span className="font-semibold text-foreground">{selectedOrgs.length}</span>{" "}
                      <span className="text-muted-foreground">organizations selected</span>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-6 max-w-[500px]">
                        <div className="flex items-center gap-2 shrink-0">
                           <span className="text-sm font-medium whitespace-nowrap text-foreground">Send Email</span>
                           <Switch checked={sendEmail} onCheckedChange={setSendEmail} />
                        </div>
                        <div className="flex-1 min-w-[220px]">
                            <NikhilDateCalendar 
                                value={dateRange} 
                                onChange={setDateRange} 
                                popDirection="up" 
                                className="w-full" 
                                placeholder="Start Date & Expiry Date"
                            />
                        </div>
                    </div>

                    <button 
                      onClick={() => setIsConfirmModalOpen(true)}
                      className="h-10 px-8 shrink-0 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
                    >
                      Grant Credits
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-[100] p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* ── Confirmation Modal ── */}
      {isConfirmModalOpen && (
        <motion.div
          key="grant-credits-confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[600] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsConfirmModalOpen(false)}
        >
          {/* Backdrop Blur */}
          <div className="absolute inset-0 bg-black/20" />

          {/* Modal Content */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-md bg-background border border-border rounded-xl shadow-2xl overflow-hidden relative flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Confirm Grant Credits</h2>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-0 flex flex-col max-h-[85vh]">
              {/* Preview List */}
              <div className="p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                {selectedOrgs.map((org) => {
                   const orgCredits = isSeparateMode ? (rowCredits[org.id] || 500) : credits;
                   return (
                    <div key={org.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {org.avatar ? (
                          <img src={org.avatar} alt={org.name} className="w-10 h-10 rounded-full border border-border shrink-0 object-cover bg-muted" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted border border-border shrink-0 flex items-center justify-center text-sm font-semibold text-muted-foreground">
                            {org.name[0]}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground truncate">{org.name}</span>
                          <span className="text-xs text-muted-foreground truncate">{org.email} • {org.orgName}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ml-2">
                        <Coins className="w-3.5 h-3.5" />
                        {formatCredits(orgCredits)}
                      </div>
                    </div>
                   );
                })}
              </div>

              {/* Slider for Bulk Mode */}
              {!isSeparateMode && (
                <div className="px-6 py-5 border-t border-border bg-muted/30 flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                      <span>500 Cr</span>
                      <span>10,000,000 Cr</span>
                    </div>
                    <BlueSlider
                      value={credits}
                      onValueChange={setCredits}
                      min={500}
                      max={10_00_00_000}
                      step={500}
                    />
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Drag to set amount:{" "}
                      <span className="font-semibold text-foreground">
                        {credits.toLocaleString("en-IN")} credits
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Action */}
              <div className="p-4 border-t border-border bg-card">
                {!dateRange?.from || !dateRange?.to ? (
                  <div className="text-center text-sm text-red-500 mb-2 font-medium">
                    You must select a Start Date and Expiry Date to grant credits.
                  </div>
                ) : null}
                <button 
                  onClick={async () => {
                    try {
                      await requestSecurityCode.mutateAsync({ action: "GENERAL_AI_MUTATION" });
                      setShowOtpModal(true);
                      setIsConfirmModalOpen(false);
                    } catch (e) {
                      console.error("Failed to request OTP", e);
                    }
                  }}
                  disabled={grantCreditsMutation.isPending || grantOrgCreditsMutation.isPending || !dateRange?.from || !dateRange?.to}
                  className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
                >
                  {(grantCreditsMutation.isPending || grantOrgCreditsMutation.isPending) ? "Granting..." : (isSeparateMode 
                    ? `Grant Custom Credits to ${selectedOrgs.length} ${selectedOrgs.length === 1 ? 'organization' : 'organizations'}`
                    : `Grant ${formatCredits(credits)} Credits to ${selectedOrgs.length} ${selectedOrgs.length === 1 ? 'organization' : 'organizations'}`
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── OTP Security Modal ── */}
      {showOtpModal && (
        <motion.div
          key="grant-credits-otp-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[700] flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowOtpModal(false)}
        >
          {/* Backdrop Blur */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Modal Content */}
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-sm bg-background border border-border rounded-xl shadow-2xl overflow-hidden relative flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">Security Verification</h2>
              <button
                onClick={() => setShowOtpModal(false)}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-sm text-center text-muted-foreground mb-6">
                A 6-digit security code has been sent to your Super Admin email address. Enter it below to authorize this action.
              </p>
              
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono tracking-widest bg-muted/50 border border-border rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
              />

              <button 
                onClick={async () => {
                  try {
                    // 1. Verify Code
                    await verifySecurityCode.mutateAsync({ code: otpCode, action: "GENERAL_AI_MUTATION" });
                    
                    // 2. If valid, proceed with Grants
                    const promises = selectedOrgs.map(org => {
                      const orgCredits = isSeparateMode ? (rowCredits[org.id] || 500) : credits;
                      const options = {
                        sendEmail,
                        startDate: dateRange?.from ? dateRange.from.toISOString() : undefined,
                        endDate: dateRange?.to ? dateRange.to.toISOString() : undefined
                      };

                      if (isOrgMode) {
                        return grantOrgCreditsMutation.mutateAsync({ orgId: org.id, amount: orgCredits, options });
                      } else {
                        return grantCreditsMutation.mutateAsync({ userId: org.id, amount: orgCredits, options });
                      }
                    });

                    await Promise.all(promises);
                    setShowOtpModal(false);
                    onClose();
                  } catch (e) {
                    console.error("OTP Verification Failed", e);
                  }
                }}
                disabled={otpCode.length < 6 || verifySecurityCode.isPending || grantCreditsMutation.isPending || grantOrgCreditsMutation.isPending}
                className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.98]"
              >
                {verifySecurityCode.isPending ? "Verifying..." : "Verify & Grant Credits"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
