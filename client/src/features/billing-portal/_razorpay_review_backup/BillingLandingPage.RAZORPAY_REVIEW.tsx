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

import { useEffect, useState } from "react";
import { Spinner } from "@/components/marketing_ui/spinner";
import { fetchWithRescue } from "@/lib/rescue";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/marketing_ui/card";

const steps = [
  {
    number: "01",
    title: "Get your invoice",
    desc: "Classgrid sends an invoice to your registered email when a payment is due.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Click Pay Now",
    desc: "Open the invoice on your admin dashboard and click the Pay Now button. You'll be redirected here.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Verify with OTP",
    desc: "A 6-digit code is sent to your admin email. Enter it to confirm your identity.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Complete payment",
    desc: "Razorpay checkout opens. Pay via UPI, card, or net banking. You're redirected back to your dashboard with a receipt.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
];

const DEMO_ENABLED = true; // Hardcoded for live test
const API_BASE = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold transition bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DemoCard() {
  const [loading, setLoading] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [showPurposeModal, setShowPurposeModal] = useState(true);

  // On mount, check if active session exists
  useEffect(() => {
    fetchWithRescue(`${API_BASE}/api/billing/demo/status`)
      .then(r => r.json())
      .then(d => { if (d.enabled && d.has_active_session) setCheckoutUrl(null); })
      .catch(() => {});
  }, []);

  const createSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRescue(`${API_BASE}/api/billing/demo/session`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed");
      setCheckoutUrl(data.data.checkout_url);
      setCreated(true);
      window.location.href = data.data.checkout_url;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
        </span>
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-[0.15em]">
          Razorpay Review — Test Checkout
        </p>
      </div>

      <p className="text-xs text-muted-foreground leading-5">
        This creates a real Razorpay test session. Enter the OTP below, then complete checkout with the test card credentials.
      </p>

      <button
        id="demo-create-session-btn"
        onClick={() => setShowPurposeModal(true)}
        disabled={loading || created}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 disabled:opacity-60"
      >
        {loading || created ? (
          <>
            <Spinner className="h-4 w-4 text-black" /> {created ? "Redirecting…" : "Creating session…"}
          </>
        ) : (
          "Open Test Checkout →"
        )}
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Test credentials — always visible */}
      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Test Credentials</p>

        {[
          { label: "OTP", value: "123456" },
          { label: "Card Number", value: "4111 1111 1111 1111" },
          { label: "Card Expiry", value: "12/27" },
          { label: "CVV", value: "123" },
          { label: "Card OTP", value: "123456" },
          { label: "UPI ID", value: "success@razorpay" },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{item.label}</span>
            <div className="flex items-center">
              <code className="text-xs font-mono font-bold text-foreground">{item.value}</code>
              <CopyButton value={item.value} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center">
        This test session expires in 48 hours. No real money is charged.
      </p>

      {/* Purpose Modal for Payment Gateways */}
      {showPurposeModal && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 sm:p-6 bg-background/95">
          <Card className="relative flex w-full max-w-3xl max-h-[90vh] flex-col shadow-2xl">
            
            {/* Header */}
            <CardHeader className="border-b border-border bg-muted/30 pb-4">
              <CardTitle className="text-xl tracking-tight">Classgrid: Platform Purpose & Operational Flow</CardTitle>
              <CardDescription>Please review our flow before testing the integration.</CardDescription>
            </CardHeader>
            
            {/* Scrollable Content */}
            <CardContent className="flex-1 overflow-y-scroll p-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
              
              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[11px] text-primary">1</span>
                  Our Purpose
                </h3>
                <p>Classgrid Technologies provides a comprehensive, cloud-based ERP (Enterprise Resource Planning) and SaaS platform tailored specifically for educational institutions (schools, colleges, and coaching centers). Our mission is to digitize and streamline school administration, student management, and internal communications into a single unified platform.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[11px] text-primary">2</span>
                  Our Core Services
                </h3>
                <p className="mb-2">The Classgrid platform offers the following modules to institutions:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Fee Management System:</strong> Automated fee collection, receipt generation, and tracking.</li>
                  <li><strong>Admission Portal:</strong> End-to-end digital admission engine for processing student applications.</li>
                  <li><strong>Live Interactive Classes:</strong> Integration with Agora and Zoom for seamless online lectures.</li>
                  <li><strong>Student Documentation:</strong> Secure storage for student records and notes via AWS S3.</li>
                  <li><strong>Campus Canteen Management:</strong> Digital ordering and payment processing for campus cafeterias.</li>
                  <li><strong>Unified Chat:</strong> Real-time communication for students and staff (powered by Supabase).</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[11px] text-primary">3</span>
                  Pricing (B2B SaaS — 3-Layer Billing)
                </h3>
                <p className="mb-3">Classgrid operates a dynamic, usage-based billing model. There are no fixed annual fees. Each institution is billed monthly across three layers:</p>
                
                <div className="bg-muted/30 p-3 rounded-lg border border-border mb-3">
                  <h4 className="font-semibold text-foreground text-xs mb-1 uppercase tracking-wider">Layer 1 — Base Platform Fee</h4>
                  <p className="text-xs">A nominal monthly fee covering core cloud hosting and platform maintenance. Set per institution by the Super Admin.</p>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border mb-3">
                  <h4 className="font-semibold text-foreground text-xs mb-2 uppercase tracking-wider">Layer 2 — Add-on Module Fees</h4>
                  <p className="text-xs mb-2">Institutions toggle modules ON/OFF. They are billed only for active modules. Our full module catalog:</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                    <span>• Attendance System</span>
                    <span>• Admission Management</span>
                    <span>• Digital Classroom</span>
                    <span>• Fee Collection System</span>
                    <span>• Automated Timetable</span>
                    <span>• Staff Leave & Payroll</span>
                    <span>• Academic Planning</span>
                    <span>• Canteen Management</span>
                    <span>• Homework & Assignments</span>
                    <span>• AI Assistant</span>
                    <span>• Student Notes Sharing</span>
                    <span>• Advanced Analytics</span>
                    <span>• Teacher Planner</span>
                    <span>• Institution Website</span>
                    <span>• Subject Management</span>
                    <span>• Digital Certificates</span>
                    <span>• Online Exam Platform</span>
                    <span>• Holiday Management</span>
                    <span>• Examination Management</span>
                    <span>• Digital ID Cards</span>
                    <span>• Grade Entry & Results</span>
                    <span>• Events Management</span>
                    <span>• Feedback System</span>
                    <span>• 7+ Dedicated Dashboards</span>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border mb-3">
                  <h4 className="font-semibold text-foreground text-xs mb-1 uppercase tracking-wider">Layer 3 — Infrastructure Resource Usage</h4>
                  <p className="text-xs mb-2">Micro-billing for actual infrastructure consumed. Tracked daily, aggregated monthly:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                    <li><strong>Cloud storage</strong> — billed per GB-day of files stored</li>
                    <li><strong>Transactional emails</strong> — billed per email sent</li>
                    <li><strong>SMS notifications</strong> — billed per SMS segment</li>
                    <li><strong>AI assistant tokens</strong> — billed per token consumed</li>
                    <li><strong>Live class minutes</strong> — billed per participant-minute</li>
                    <li><strong>API requests</strong> — billed per request served</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">A sample calculated invoice demonstrating all three layers is available for download below.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[11px] text-primary">4</span>
                  Understanding Our Domains (Security Architecture)
                </h3>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                  <li><strong><a href="https://classgrid.in" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">classgrid.in</a> (Marketing Site):</strong> This is simply our public brochure and marketing website, exactly like how <em>razorpay.com</em> is your public marketing site. Our actual software is not hosted here.</li>
                  <li><strong>[school-name].classgrid.in (The Product):</strong> Every school gets their own secure subdomain to manage their ERP, staff, and students. This is a highly secure, closed system that requires a strict login, exactly like how your <em>dashboard.razorpay.com</em> works.</li>
                  <li><strong>billing.classgrid.in (Payment Microservice):</strong> For maximum security and compliance, we completely decoupled the checkout flow. When an admin is inside their school's dashboard and clicks "Pay Subscription", they are securely redirected to this isolated portal to process the payment safely.</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[11px] text-primary">5</span>
                  The Payment Flow (Why we need Razorpay)
                </h3>
                <p className="mb-2">Classgrid utilizes Razorpay for two distinct payment flows:</p>
                
                <div className="bg-muted/30 p-3 rounded-lg border border-border mb-3">
                  <h4 className="font-semibold text-foreground text-xs mb-1 uppercase tracking-wider">A. B2B Flow (SaaS Subscription Payments) - Current Demo</h4>
                  <p className="text-xs mb-2">When an educational institution subscribes to Classgrid's ERP software:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-xs">
                    <li>Classgrid generates a SaaS subscription invoice for the institution.</li>
                    <li>The institution's administrator receives an email with a secure billing link.</li>
                    <li>The administrator clicks the link and arrives at this Billing Landing Page.</li>
                    <li>To ensure security, the administrator must authenticate their identity using a 6-digit OTP sent to their registered email.</li>
                    <li>Upon successful OTP verification, the Razorpay Checkout modal opens.</li>
                    <li>The administrator completes the payment (via UPI, Card, or Netbanking).</li>
                    <li>The Classgrid backend verifies the Razorpay signature and provisions the software license for the institution.</li>
                  </ol>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border">
                  <h4 className="font-semibold text-foreground text-xs mb-1 uppercase tracking-wider">B. B2C/B2B2C Flow (Institution Fee Collection)</h4>
                  <p className="text-xs">For student fee payments (tuition, admission, examination), Classgrid uses an RBI-licensed Payment Aggregator's Sub-Merchant API. Each institution is onboarded as a sub-merchant. Student payments are settled directly to the institution's bank account via the PA's escrow. Classgrid never holds or settles institutional funds — we are purely the technology layer.</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[11px] text-primary">6</span>
                  Refund & Cancellation Policy
                </h3>
                <p>As a SaaS provider, subscriptions can be cancelled at any time from the admin dashboard. Refunds for software subscriptions are processed on a pro-rata basis within 5-7 business days in accordance with our Terms of Service.</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/20 text-[11px] text-primary">7</span>
                  Invoice Generation Engine
                </h3>
                <p className="mb-3">Our backend dynamically calculates institutional usage via scheduled Node.js workers. We utilize <strong>Puppeteer</strong> (headless Chrome) to render raw HTML line items into a high-fidelity PDF invoice, which is securely emailed to the administrator before they ever reach this checkout page.</p>
                <a 
                  href="/sample-invoice.pdf" 
                  download="Classgrid_Sample_SaaS_Invoice.pdf"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary/20"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download Sample ₹2 Invoice
                </a>
              </div>

            </CardContent>

            {/* Footer */}
            <CardFooter className="border-t border-border bg-muted/30 p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-3 rounded-b-lg">
              <div className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                </svg>
                <span>Test Card OTP: <strong className="text-foreground tracking-widest bg-muted px-1.5 py-0.5 rounded border border-border">123456</strong></span>
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <button 
                  onClick={() => setShowPurposeModal(false)}
                  className="w-full sm:w-auto rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition text-center border border-border sm:border-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPurposeModal(false);
                    createSession();
                  }}
                  className="w-full sm:w-auto rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400 text-center shadow-md"
                >
                  I Understand — Proceed
                </button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

export function BillingLandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground font-sans">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.12),transparent_65%)]" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative flex min-h-screen flex-col">

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
            <a
              href="https://classgrid.in"
              className="flex items-center gap-1.5 text-foreground transition-colors hover:text-foreground/90"
            >
              <img src="/logo.png" alt="Classgrid" className="h-10 w-auto object-contain" />
              <span className="text-xl font-semibold tracking-tight">Classgrid</span>
            </a>
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground">
              <span className="relative inline-flex h-2 w-2 rounded-[2px] bg-emerald-500">
                <span className="absolute inset-0 animate-ping rounded-[2px] bg-emerald-500 opacity-70" />
              </span>
              <span className="font-medium">Billing Portal</span>
            </div>
          </div>
        </header>

        {/* Main */}
        <div className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="w-full max-w-[480px] space-y-6">

            {/* Hero block */}
            <div className="space-y-3 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-500">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Classgrid Billing Portal
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-[2rem]">
                SaaS Subscription Payments
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                This portal is for institution admins to pay their<br />
                Classgrid subscription invoice. All payments go via Razorpay.
              </p>
            </div>

            {/* Demo card — only visible when VITE_BILLING_DEMO_MODE=true */}
            {DEMO_ENABLED && <DemoCard />}

            {/* How it works card */}
            <div className="rounded-2xl border border-border bg-card/80 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-sm">
              <div className="p-7 sm:p-8">

                <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  How it works
                </p>

                <div className="space-y-0">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                          {step.icon}
                        </div>
                        {i < steps.length - 1 && (
                          <div className="my-1 w-px flex-1 bg-border" />
                        )}
                      </div>

                      <div className={`pb-5 ${i === steps.length - 1 ? "pb-0" : ""}`}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold tracking-widest text-muted-foreground/60">{step.number}</span>
                          <p className="text-sm font-semibold text-foreground">{step.title}</p>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Verified by</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "256-bit SSL", sub: "Encrypted" },
                    { label: "PCI-DSS", sub: "Via Razorpay" },
                    { label: "OTP-verified", sub: "Identity check" },
                  ].map((badge) => (
                    <div
                      key={badge.label}
                      className="flex flex-col items-center rounded-xl border border-border bg-muted/40 px-3 py-3 text-center"
                    >
                      <span className="text-xs font-semibold text-foreground">{badge.label}</span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">{badge.sub}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                  To pay your invoice, open it from your admin dashboard and click Pay Now.
                </p>
              </div>
            </div>

            {/* Compliance & Contact Footer for Payment Gateways */}
            <div className="flex flex-col items-center gap-2 text-center text-[11px] text-muted-foreground mt-8">
              <p className="text-foreground/80 font-medium text-xs">Classgrid Technologies</p>
              <p>Support: <a href="mailto:support@classgrid.in" className="transition hover:text-foreground">support@classgrid.in</a></p>
              
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-2 mt-2">
                <a href="https://classgrid.in/refund-policy" target="_blank" className="transition hover:text-foreground underline-offset-2 hover:underline">
                  Refund & Cancellation Policy
                </a>
                <span className="text-border">•</span>
                <a href="https://classgrid.in/privacy" target="_blank" className="transition hover:text-foreground underline-offset-2 hover:underline">
                  Privacy Policy
                </a>
                <span className="text-border">•</span>
                <a href="https://classgrid.in/terms" target="_blank" className="transition hover:text-foreground underline-offset-2 hover:underline">
                  Terms & Conditions
                </a>
                <span className="text-border">•</span>
                <a href="https://classgrid.in/contact" target="_blank" className="transition hover:text-foreground underline-offset-2 hover:underline">
                  Contact Us
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
