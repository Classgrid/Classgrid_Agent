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

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOrgBilling } from "../queries/useOrgAdminBilling";
import { usePayInvoice } from "../queries/usePayInvoice";
import { apiClient } from "@/lib/apiClient";
import { toast } from "sonner";

// Native UI Components (No Tremor)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/marketing_ui/card";
import { Badge } from "@/components/marketing_ui/badge";
import { Button } from "@/components/marketing_ui/button";
import { VerifiedButton } from "@/components/marketing_ui/status-button";
import { Switch } from "@/components/marketing_ui/switch";
import { Label } from "@/components/marketing_ui/label";
import { Input } from "@/components/marketing_ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/marketing_ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/marketing_ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";


// Icons & Utils
import { CreditCard, Download, IndianRupee, ShieldCheck, Plus, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";

// Data
import indiaLocations from "@/data/india-locations.json";
const statesList = Object.keys(indiaLocations.states).sort();

// Custom SVG Progress Circle to replace Tremor's
const ProgressCircle = ({ value, colorClass, children, size = 64, strokeWidth = 6 }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle className="text-gray-100 dark:text-gray-800" strokeWidth={strokeWidth} stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <circle className={`${colorClass} transition-all duration-1000 ease-in-out`} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
        {children}
      </div>
    </div>
  );
};

export function BillingPage() {
  const queryClient = useQueryClient();
  const { data: billingData, isLoading, isError } = useOrgBilling();
  const { mutateAsync: payInvoice } = usePayInvoice();

  const [billingEmail, setBillingEmail] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingGstin, setBillingGstin] = useState("");
  const [billingAddress1, setBillingAddress1] = useState("");
  const [billingAddress2, setBillingAddress2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPincode, setBillingPincode] = useState("");
  const [billingContactName, setBillingContactName] = useState("");

  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [isEmailVerifyModalOpen, setIsEmailVerifyModalOpen] = useState(false);
  const [isPhoneVerifyModalOpen, setIsPhoneVerifyModalOpen] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  // Sync settings with backend data when loaded
  useEffect(() => {
    if (billingData?.billingSettings) {
      setBillingEmail(billingData.billingSettings.invoice_email || "");
      setBillingPhone(billingData.billingSettings.phone || "");
      setBillingGstin(billingData.billingSettings.gstin || "");
      setBillingAddress1(billingData.billingSettings.address_line1 || "");
      setBillingAddress2(billingData.billingSettings.address_line2 || "");
      setBillingCity(billingData.billingSettings.city || "");
      setBillingState(billingData.billingSettings.state || "");
      setBillingPincode(billingData.billingSettings.pincode || "");
      setBillingContactName(billingData.billingSettings.billing_contact_name || "");
      setEmailVerified(billingData.billingSettings.email_verified || false);
      setPhoneVerified(billingData.billingSettings.phone_verified || false);
    }
  }, [billingData]);

  const isNameSaved = Boolean(billingData?.billingSettings?.billing_contact_name);
  const isEmailSaved = Boolean(billingData?.billingSettings?.invoice_email);

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      const res = await apiClient.put("/api/org/billing/settings", {
        invoice_email: billingEmail,
        phone: billingPhone,
        gstin: billingGstin,
        address_line1: billingAddress1,
        address_line2: billingAddress2,
        city: billingCity,
        state: billingState,
        pincode: billingPincode,
        billing_contact_name: billingContactName,

      });
      toast.success("Saved successfully!");

      queryClient.invalidateQueries({ queryKey: ["orgBilling"] });
    } catch (err: any) {
      toast.error(err.message || "Could not save");
    } finally {
      setIsSavingSettings(false);
    }
  };



  const handleSendEmailVerification = async () => {
    setIsSendingEmailOtp(true);
    const promise = apiClient.post("/api/org/billing/verify-email/send", { email: billingEmail });

    toast.promise(promise, {
      loading: "Sending OTP to your email...",
      success: () => {
        setResendCooldown(60);
        setIsEmailVerifyModalOpen(true);
        setIsSendingEmailOtp(false);
        return "OTP sent! Check your inbox.";
      },
      error: (error: any) => {
        setIsSendingEmailOtp(false);
        return error.response?.data?.message || "Failed to send email";
      }
    });
  };

  const handleVerifyEmailOtp = async () => {
    try {
      setIsVerifying(true);
      await apiClient.post("/api/org/billing/verify-email/confirm", { otp: emailOtp });
      toast.success("Email verified successfully!");
      setEmailVerified(true);
      setIsEmailVerifyModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendPhoneOtp = async () => {
    setIsSendingPhoneOtp(true);
    const promise = apiClient.post("/api/org/billing/verify-phone/send", { phone: billingPhone });

    toast.promise(promise, {
      loading: "Sending OTP to your phone...",
      success: () => {
        setResendCooldown(60);
        setIsPhoneVerifyModalOpen(true);
        setIsSendingPhoneOtp(false);
        return "OTP sent to your phone number.";
      },
      error: (error: any) => {
        setIsSendingPhoneOtp(false);
        return error.response?.data?.message || "Failed to send OTP";
      }
    });
  };

  const handleVerifyPhoneOtp = async () => {
    try {
      setIsVerifying(true);
      await apiClient.post("/api/org/billing/verify-phone/confirm", { otp: phoneOtp });
      toast.success("Phone verified successfully!");
      setPhoneVerified(true);
      setIsPhoneVerifyModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 sm:p-10 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
          <div className="lg:col-span-2 h-64 bg-gray-200 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (isError || !billingData) {
    return (
      <div className="p-6 sm:p-10 max-w-7xl mx-auto">
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-red-800 dark:text-red-200">
            Failed to load billing data.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* INVOICES SECTION */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all">
        <div className="border-b border-border pb-4 flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <IndianRupee size={18} /> Invoices
          </h3>
          <p className="text-sm text-muted-foreground mt-1 opacity-80">
            View and pay your recent invoices.
          </p>
        </div>
        
        {billingData.invoices && billingData.invoices.filter((inv: any) => inv.status !== 'paid').length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingData.invoices.filter((inv: any) => inv.status !== 'paid').map((invoice: any) => (
                  <TableRow key={invoice._id}>
                    <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell>{format(new Date(invoice.createdAt || new Date()), 'dd MMM yyyy')}</TableCell>
                    <TableCell>₹{invoice.totalAmountInr?.toLocaleString('en-IN')}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'sent' ? 'warning' : 'default'}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {invoice.status !== 'paid' ? (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={async () => {
                            try {
                              await payInvoice(invoice._id);
                            } catch (e: any) {
                              toast.error(e.message || "Failed to process payment");
                            }
                          }}
                        >
                          Pay Now
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No pending invoices found.
          </div>
        )}
      </div>

      {/* BILLING METHOD */}
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all">
        <div className="border-b border-border pb-4 flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CreditCard size={18} /> Billing method
          </h3>
          <p className="text-sm text-muted-foreground mt-1 opacity-80">
            Manage your primary payment method.
          </p>
        </div>

        <div className="space-y-4">
          {billingData?.paymentMethod ? (
            <div className="flex items-start justify-between p-4 border rounded-lg bg-muted/20">
              <div className="space-y-1">
                <p className="font-medium">Primary</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} />
                    <span>•••• •••• •••• {billingData.paymentMethod.last4}</span>
                  </div>
                  <span>Expires {billingData.paymentMethod.expMonth}/{billingData.paymentMethod.expYear}</span>
                </div>
                <p className="text-sm pt-1">{billingContactName || billingData.paymentMethod.nameOnCard}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" size="sm">Update</Button>
                <Button variant="destructive" size="sm">Delete</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-2">
              No additional payment method on file
            </div>
          )}

          <Button variant="secondary" className="w-full sm:w-auto">
            <Plus size={16} className="mr-2" /> Add
          </Button>
        </div>
      </div>

      {/* BILLING SETTINGS */}
      <div className="space-y-6">

        {/* Billing Profile Card */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all">
          <div className="border-b border-border pb-4 flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <CreditCard size={18} /> Billing Profile & Verification
            </h3>
            <p className="text-sm text-muted-foreground mt-1 opacity-80">
              Manage your billing contact details and verify your communication channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Billing Name</Label>
              <div className="flex gap-2">
                <Input
                  value={billingContactName}
                  onChange={(e) => setBillingContactName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="flex-1"
                  disabled={isNameSaved}
                />
                {!isNameSaved ? (
                  <Button
                    variant="primary"
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings || !billingContactName?.trim()}
                    isLoading={isSavingSettings}
                  >
                    {isSavingSettings ? "Saving..." : "Save"}
                  </Button>
                ) : (
                  <VerifiedButton text="Saved" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">GSTIN (Optional)</Label>
              <Input
                value={billingGstin}
                onChange={(e) => setBillingGstin(e.target.value)}
                placeholder="e.g. 22AAAAA0000A1Z5"
                disabled={!phoneVerified}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Billing Email</Label>
              <div className="flex gap-2">
                <Input
                  value={billingEmail}
                  onChange={(e) => {
                    setBillingEmail(e.target.value);
                    setEmailVerified(false);
                  }}
                  placeholder="e.g. accounts@company.com"
                  className="flex-1"
                  disabled={isEmailSaved || !billingContactName?.trim()}
                />
                {emailVerified ? (
                  <VerifiedButton />
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleSendEmailVerification}
                    disabled={isSendingEmailOtp || !billingEmail?.trim()}
                    isLoading={isSendingEmailOtp}
                  >
                    {isSendingEmailOtp ? "Verifying..." : "Verify"}
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Billing Phone Number</Label>
              <div className="flex gap-2">
                <Input
                  value={billingPhone}
                  onChange={(e) => {
                    setBillingPhone(e.target.value);
                    setPhoneVerified(false);
                  }}
                  placeholder="e.g. 9999999999"
                  className="flex-1"
                  disabled={!emailVerified}
                />
                {phoneVerified ? (
                  <VerifiedButton />
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleSendPhoneOtp}
                    disabled={isSendingPhoneOtp || !billingPhone?.trim() || !emailVerified}
                    isLoading={isSendingPhoneOtp}
                  >
                    {isSendingPhoneOtp ? "Verifying..." : "Verify"}
                  </Button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Billing Address Card */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm hover:shadow-md transition-all">
          <div className="border-b border-border pb-4 flex flex-col gap-2">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <MapPin size={18} /> Billing Address
            </h3>
            <p className="text-sm text-muted-foreground mt-1 opacity-80">
              Set your primary address for invoices and tax purposes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
            <div className="space-y-3 md:col-span-2">
              <Label className="text-sm font-medium">Address Line 1</Label>
              <Input
                value={billingAddress1}
                onChange={(e) => setBillingAddress1(e.target.value)}
                placeholder="e.g. Flat, House no., Building, Company"
                disabled={!phoneVerified}
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <Label className="text-sm font-medium">Address Line 2 (Optional)</Label>
              <Input
                value={billingAddress2}
                onChange={(e) => setBillingAddress2(e.target.value)}
                placeholder="e.g. Area, Street, Sector, Village"
                disabled={!phoneVerified}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">City</Label>
              <Input
                value={billingCity}
                onChange={(e) => setBillingCity(e.target.value)}
                placeholder="e.g. New Delhi"
                disabled={!phoneVerified}
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">State / Province</Label>
              <Select value={billingState} onValueChange={setBillingState} disabled={!phoneVerified}>
                <SelectTrigger className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="Select State / UT" />
                </SelectTrigger>
                <SelectContent>
                  {statesList.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">ZIP / Postal Code</Label>
              <Input
                value={billingPincode}
                onChange={(e) => setBillingPincode(e.target.value)}
                placeholder="e.g. 110001"
                disabled={!phoneVerified}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              disabled={isSavingSettings || !phoneVerified}
              className="px-6"
              isLoading={isSavingSettings}
            >
              {isSavingSettings ? "Saving..." : "Save Address"}
            </Button>
          </div>
        </div>



      </div>

      {/* VERIFY EMAIL MODAL */}
      <Dialog open={isEmailVerifyModalOpen} onOpenChange={setIsEmailVerifyModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Verify Email Address</DialogTitle>
            <DialogDescription>
              Enter the 6-digit OTP sent to {billingEmail}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2 flex flex-col items-center">
              <Label>Enter 6-digit Code</Label>
              <InputOTP
                value={emailOtp}
                onChange={setEmailOtp}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyEmailOtp} disabled={isVerifying || emailOtp.length !== 6} className="w-full">
              Verify OTP
            </Button>
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={handleSendEmailVerification} disabled={isSendingEmailOtp || resendCooldown > 0} className="w-full">
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VERIFY PHONE MODAL */}
      <Dialog open={isPhoneVerifyModalOpen} onOpenChange={setIsPhoneVerifyModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Verify Phone Number</DialogTitle>
            <DialogDescription>
              Enter the 6-digit OTP sent to {billingPhone}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2 flex flex-col items-center">
              <Label>Enter 6-digit Code</Label>
              <InputOTP
                value={phoneOtp}
                onChange={setPhoneOtp}
                maxLength={6}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button onClick={handleVerifyPhoneOtp} disabled={isVerifying || phoneOtp.length !== 6} className="w-full">
              Verify OTP
            </Button>
            <div className="mt-4 text-center">
              <Button variant="ghost" onClick={handleSendPhoneOtp} disabled={isSendingPhoneOtp || resendCooldown > 0} className="w-full">
                {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : "Resend OTP"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
