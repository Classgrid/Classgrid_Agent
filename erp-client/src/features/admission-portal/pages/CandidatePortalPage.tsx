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
import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2, Phone, Mail, Hash, ArrowRight, CheckCircle2,
  GraduationCap, FileText, CreditCard, Trophy, User, LogOut
} from "lucide-react";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  validateEN, sendENOTP, verifyENOTP,
  verifyPhoneOTP, sendEmailOTP, verifyEmailOTP,
} from "../api";
import { useEngineConfig, useCandidateSession } from "../queries/useAdmissionEngine";
import { WorkflowStage } from "../components/WorkflowStage";


import { Button } from "@/components/marketing_ui/button";

declare global { interface Window { recaptchaVerifier: any; } }

// ── Step definitions ─────────────────────────────────────────────
const PORTAL_STEPS = [
  { id: "welcome",   label: "Welcome",          sub: "College overview",       icon: "🏫" },
  { id: "signin",    label: "Verify Mobile",    sub: "Secure OTP login",       icon: "📱" },
  { id: "form",      label: "Fill Form",         sub: "Personal & academic",    icon: "📝" },
  { id: "documents", label: "Upload Documents",  sub: "Required certificates",  icon: "📂" },
  { id: "fee",       label: "Fee Payment",       sub: "Confirm your seat",      icon: "💳" },
  { id: "confirmed", label: "Confirmed",         sub: "Enrollment complete",    icon: "🎓" },
];

function statusToStep(status: string | undefined): number {
  if (!status) return 1;                              // show signin
  if (status === "draft" || status === "student_registered") return 2; // fill form
  if (["applied", "under_verification", "verified", "form_submitted",
       "prn_generated", "admin_verified", "shortlisted", "selected",
       "waitlisted"].includes(status)) return 3;      // documents / track
  if (["fee_pending", "allotted", "confirmed"].includes(status)) return 4;
  if (status === "enrolled") return 5;
  return 2;
}

// ── Sidebar ───────────────────────────────────────────────────────
function PortalSidebar({
  orgName, instructions, currentStep, isAuth,
}: { orgName: string; instructions?: string; currentStep: number; isAuth: boolean }) {
  return (
    <aside className="cgp-sidebar">
      {/* Welcome block */}
      <div className="cgp-sidebar__welcome">
        <div className="cgp-sidebar__welcome-label">Admission Portal</div>
        <div className="cgp-sidebar__welcome-title">Welcome to {orgName}</div>
        <div className="cgp-sidebar__welcome-desc">
          {instructions || "Complete the steps below to submit your admission application. Our team will guide you through the process."}
        </div>
      </div>

      {/* Steps */}
      <nav className="cgp-steps">
        {PORTAL_STEPS.map((step, idx) => {
          const isDone = idx < currentStep;
          const isActive = idx === currentStep;
          return (
            <div
              key={step.id}
              className={[
                "cgp-step",
                isActive ? "cgp-step--active" : "",
              ].join(" ")}
            >
              {/* Vertical connector */}
              <div className={`cgp-step__connector${isDone ? " cgp-step__connector--done" : ""}`} />

              {/* Circle */}
              <div className={`cgp-step__circle${isDone ? " cgp-step__circle--done" : ""}`}>
                {isDone ? <CheckCircle2 size={12} /> : idx + 1}
              </div>

              {/* Text */}
              <div className="cgp-step__info">
                <div className={`cgp-step__name${isDone ? " cgp-step__name--done" : ""}`}>
                  {step.icon} {step.label}
                </div>
                <div className="cgp-step__sub">{step.sub}</div>
                {isDone && <span className="cgp-step__badge cgp-step__badge--done">✓ Done</span>}
                {isActive && <span className="cgp-step__badge">Current</span>}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="cgp-sidebar__footer">
        <div className="cgp-sidebar__help">
          Need help?{" "}
          <span className="cgp-sidebar__help-link">Contact Admission Office</span>
        </div>
      </div>
    </aside>
  );
}

// ── Welcome Step ──────────────────────────────────────────────────
function WelcomeStep({ orgName, config, onNext }: { orgName: string; config: any; onNext: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div className="cgp-content__header">
        <div className="cgp-content__step-label">Step 1 of 6</div>
        <h1 className="cgp-content__title">Welcome to {orgName} 🎓</h1>
        <p className="cgp-content__desc">
          We're glad you're here. Please read through this guide before starting your application.
        </p>
      </div>

      <div className="cgp-welcome-card">
        <div className="cgp-welcome-card__hero">
          <div className="cgp-welcome-card__icon">🏫</div>
          <div className="cgp-welcome-card__hero-text">
            <h2>{orgName}</h2>
            <p>Admissions open for the current academic year. Complete all steps carefully.</p>
          </div>
        </div>
        <div className="cgp-welcome-card__body">
          <div className="cgp-info-grid">
            {config?.registration_fee != null && (
              <div className="cgp-info-item">
                <div className="cgp-info-item__label">Registration Fee</div>
                <div className="cgp-info-item__value">₹{config.registration_fee}</div>
              </div>
            )}
            {config?.cutoff_date && (
              <div className="cgp-info-item">
                <div className="cgp-info-item__label">Last Date</div>
                <div className="cgp-info-item__value">
                  {new Date(config.cutoff_date).toLocaleDateString("en-IN")}
                </div>
              </div>
            )}
            {config?.merit_list_mode && (
              <div className="cgp-info-item">
                <div className="cgp-info-item__label">Selection Mode</div>
                <div className="cgp-info-item__value" >
                  {config.merit_list_mode.replace(/_/g, " ")}
                </div>
              </div>
            )}
          </div>

          <div >
            How the process works:
          </div>
          <div className="cgp-process-steps">
            {[
              { n: 1, text: "Verify mobile or email via OTP", sub: "~1 min" },
              { n: 2, text: "Fill in the application form", sub: "~10 min" },
              { n: 3, text: "Upload required documents", sub: "~5 min" },
              { n: 4, text: "Pay registration fee online", sub: "Instant" },
              { n: 5, text: "Wait for merit list & confirmation", sub: "Admin review" },
            ].map((s) => (
              <div key={s.n} className="cgp-process-step">
                <div className="cgp-process-step__num">{s.n}</div>
                <div className="cgp-process-step__text">{s.text}</div>
                <div className="cgp-process-step__sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button variant="default" onClick={onNext} id="portal-start-btn">
        Start Application <ArrowRight size={16} />
      </Button>
    </motion.div>
  );
}

// ── Auth Gate ─────────────────────────────────────────────────────
function AuthGate({
  orgId, isCetMode, onSuccess,
}: { orgId: string; isCetMode: boolean; onSuccess: () => void }) {
  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");
  const [identifier, setIdentifier] = useState("");
  const [enNumber, setEnNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "email_collect" | "otp">("input");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cetCandidate, setCetCandidate] = useState<any>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cooldown > 0) { const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }
  }, [cooldown]);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaRef.current!, { size: "invisible" });
    }
  };

  const handleNext = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true); setError("");
    try {
      if (isCetMode && step === "input") {
        const res = await validateEN(enNumber, orgId);
        if (res.candidate) setCetCandidate(res.candidate);
        setStep("email_collect");
      } else if (isCetMode && step === "email_collect") {
        await sendENOTP(enNumber, identifier, orgId);
        setCooldown(60); setStep("otp");
      } else if (authMode === "phone") {
        setupRecaptcha();
        const fmt = identifier.startsWith("+") ? identifier : `+91${identifier}`;
        const conf = await signInWithPhoneNumber(auth, fmt, window.recaptchaVerifier);
        setConfirmation(conf); setCooldown(60); setStep("otp");
      } else {
        await sendEmailOTP(identifier, orgId);
        setCooldown(60); setStep("otp");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Request failed.");
      if (window.recaptchaVerifier) { window.recaptchaVerifier.clear(); window.recaptchaVerifier = null; }
    } finally { setLoading(false); }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (attempts >= 3) { setError("Too many attempts. Request a new OTP."); setStep("input"); setAttempts(0); return; }
    setLoading(true); setError("");
    try {
      if (isCetMode) {
        const res = await verifyENOTP(enNumber, identifier, otp, orgId);
        if (res.token) localStorage.setItem("admission_token", res.token);
      } else if (authMode === "phone") {
        if (!confirmation) throw new Error("No confirmation found.");
        const result = await confirmation.confirm(otp);
        const idToken = await result.user.getIdToken();
        const res = await verifyPhoneOTP(idToken, orgId);
        if (res.token) localStorage.setItem("admission_token", res.token);
      } else {
        const res = await verifyEmailOTP(identifier, otp, orgId);
        if (res.token) localStorage.setItem("admission_token", res.token);
      }
      onSuccess();
    } catch (err: any) {
      setAttempts(a => a + 1);
      setError(err.response?.data?.error || err.message || "Invalid OTP.");
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <div className="cgp-content__header">
        <div className="cgp-content__step-label">Step 2 of 6</div>
        <h1 className="cgp-content__title">Verify Identity</h1>
        <p className="cgp-content__desc">
          {isCetMode
            ? "Enter your CET Eligibility Number (EN) to get started."
            : "Enter your mobile number or email to receive a secure OTP."}
        </p>
      </div>

      <div className="cgp-auth-gate">
        {error && <div ><div variant="danger" title="Error">{error}</div></div>}

        {/* CET: EN input */}
        {isCetMode && step === "input" && (
          <form onSubmit={handleNext} className="cgp-auth-gate__form">
            <h2 className="cgp-auth-gate__title">Enter EN Number</h2>
            <p className="cgp-auth-gate__sub">Your Engineering Application Number from CET.</p>
            <div className="cgp-form-field">
              <label className="cgp-form-label">EN Number</label>
              <div className="cgp-form-input-wrap">
                <Hash size={15} className="cgp-form-icon" />
                <Input type="text" required className="cgp-form-input" placeholder="e.g. EN25234503"
                  value={enNumber} onChange={e => setEnNumber(e.target.value.toUpperCase())} disabled={loading} />
              </div>
            </div>
            <Button type="submit" variant="default" disabled={loading} id="cet-validate-btn">
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Validate EN"} <ArrowRight size={15} />
            </Button>
          </form>
        )}

        {/* CET: Email collect */}
        {isCetMode && step === "email_collect" && (
          <form onSubmit={handleNext} className="cgp-auth-gate__form">
            {cetCandidate && (
              <div className="cgp-cet-preview">
                <div className="cgp-cet-preview__name">{cetCandidate.candidate_name || "Allotted Candidate"}</div>
                <div className="cgp-cet-preview__grid">
                  <div><strong>EN:</strong> {enNumber}</div>
                  <div><strong>Score:</strong> {cetCandidate.mht_cet_score}</div>
                  <div ><strong>Branch:</strong> {cetCandidate.branch_name}</div>
                </div>
              </div>
            )}
            <div className="cgp-form-field">
              <label className="cgp-form-label">Personal Email</label>
              <div className="cgp-form-input-wrap">
                <Mail size={15} className="cgp-form-icon" />
                <Input type="email" required className="cgp-form-input" placeholder="you@example.com"
                  value={identifier} onChange={e => setIdentifier(e.target.value)} disabled={loading} />
              </div>
            </div>
            <Button type="submit" variant="default" disabled={loading} id="cet-get-otp-btn">
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Get OTP"} <ArrowRight size={15} />
            </Button>
          </form>
        )}

        {/* Standard: phone/email */}
        {!isCetMode && step === "input" && (
          <form onSubmit={handleNext} className="cgp-auth-gate__form">
            <h2 className="cgp-auth-gate__title">Start Application</h2>
            <p className="cgp-auth-gate__sub">New or returning? Enter your number to continue.</p>
            <div className="cgp-auth-gate__mode-switch">
              <Button type="button" id="mode-phone"
                className={`cgp-auth-gate__mode-btn${authMode === "phone" ? " cgp-auth-gate__mode-btn--active" : ""}`}
                onClick={() => setAuthMode("phone")}>
                <Phone size={13} /> Phone OTP
              </Button>
              <Button type="button" id="mode-email"
                className={`cgp-auth-gate__mode-btn${authMode === "email" ? " cgp-auth-gate__mode-btn--active" : ""}`}
                onClick={() => setAuthMode("email")}>
                <Mail size={13} /> Email OTP
              </Button>
            </div>
            <div className="cgp-form-field">
              <label className="cgp-form-label">{authMode === "phone" ? "Mobile Number" : "Email Address"}</label>
              <div className="cgp-form-input-wrap">
                {authMode === "phone" ? <Phone size={15} className="cgp-form-icon" /> : <Mail size={15} className="cgp-form-icon" />}
                <Input type={authMode === "phone" ? "tel" : "email"} required className="cgp-form-input"
                  placeholder={authMode === "phone" ? "+91 9876543210" : "you@example.com"}
                  value={identifier} onChange={e => setIdentifier(e.target.value)} disabled={loading} />
              </div>
            </div>
            <Button type="submit" variant="default" disabled={loading} id="get-otp-btn">
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Get OTP"} <ArrowRight size={15} />
            </Button>
          </form>
        )}

        {/* OTP verification */}
        {step === "otp" && (
          <form onSubmit={handleVerify} className="cgp-auth-gate__form">
            <h2 className="cgp-auth-gate__title">Enter Verification Code</h2>
            <p className="cgp-auth-gate__sub">We sent a 6-digit code to <strong>{identifier}</strong></p>
            <div className="cgp-form-field">
              <label className="cgp-form-label">6-digit OTP</label>
              <Input type="text" required maxLength={6} className="cgp-form-input cgp-form-input--otp"
                placeholder="000000" value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} disabled={loading} />
            </div>
            <Button type="submit" variant="default" disabled={loading} id="verify-otp-btn">
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Verify & Continue"}
            </Button>
            <div className="cgp-auth-actions">
              <Button type="button" variant="outline" onClick={() => { setStep("input"); setOtp(""); }}>
                ← Back
              </Button>
              <Button type="button" className="cgp-auth-link" 
                onClick={() => handleNext()} disabled={loading || cooldown > 0}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
              </Button>
            </div>
          </form>
        )}

        <div id="recaptcha-container" ref={recaptchaRef} />
        <div className="cgp-auth-gate__footer">
          Are you a parent?{" "}
          <Link to={`/parent/${orgId}`} className="cgp-auth-link">Track Application</Link>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export function CandidatePortalPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const { data: engineConfig, isLoading: configLoading } = useEngineConfig(orgId);
  const { data: appState, isLoading: sessionLoading, error: sessionError, refetch } = useCandidateSession();

  // 0=welcome, 1=signin (auth gate), 2+=handed to WorkflowStage
  const [portalStep, setPortalStep] = useState(0);

  const isAuthenticated = !!appState;
  const isCetMode = engineConfig?.form_schema?.auth_method === "cet_en_otp";

  // On session error clear token
  useEffect(() => {
    if (sessionError) localStorage.removeItem("admission_token");
  }, [sessionError]);

  // On page load restore session
  useEffect(() => {
    const token = localStorage.getItem("admission_token");
    if (token && !isAuthenticated && !sessionLoading && !sessionError) refetch();
  }, [isAuthenticated, sessionLoading, sessionError, refetch]);

  // Auto-advance when authenticated
  useEffect(() => {
    if (isAuthenticated && appState) {
      const step = statusToStep(appState.status);
      setPortalStep(step + 1); // offset for welcome + signin
    }
  }, [isAuthenticated, appState]);

  const handleSignOut = () => {
    localStorage.removeItem("admission_token");
    window.location.reload();
  };

  // ── Loading ──
  if (configLoading || sessionLoading) {
    return (
      <div className="cgp-shell" >
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  if (!engineConfig) {
    return (
      <div className="cgp-shell">
        <div className="cgp-closed">
          <div className="cgp-closed__inner">
            <div className="cgp-closed__icon">⚠️</div>
            <h1 className="cgp-closed__title">Portal Not Found</h1>
            <div variant="danger" title="Configuration Missing">
              Admission portal configuration not found for this organization.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Portal Closed ──
  if (!engineConfig.config.is_portal_open && !isAuthenticated) {
    return (
      <div className="cgp-shell">
        <header className="cgp-topbar">
          <div className="cgp-topbar__brand">
            <span className="cgp-topbar__logo">⚡ Classgrid</span>
            <span className="cgp-topbar__sep">/</span>
            <span className="cgp-topbar__org">{engineConfig.organization}</span>
          </div>
        </header>
        <div className="cgp-closed">
          <div className="cgp-closed__inner">
            <div className="cgp-closed__icon">🔒</div>
            <h1 className="cgp-closed__title">Admissions Closed</h1>
            <div variant="warning" title="Portal Closed">
              The admission portal is currently closed. Please check back later or contact the institution.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Determine sidebar step index ──
  let sidebarStep = portalStep;
  if (isAuthenticated && appState) {
    sidebarStep = statusToStep(appState.status) + 1;
  }

  return (
    <div className="cgp-shell">
      {/* Top bar */}
      <header className="cgp-topbar">
        <div className="cgp-topbar__brand">
          <span className="cgp-topbar__logo">⚡ Classgrid</span>
          <span className="cgp-topbar__sep">/</span>
          <span className="cgp-topbar__org">{engineConfig.organization}</span>
        </div>
        <div className="cgp-topbar__right">
          {isAuthenticated && appState && (
            <div className="cgp-topbar__user">
              <User size={14} />
              <span>{appState.full_name || appState.phone || appState.email}</span>
            </div>
          )}
          {isAuthenticated && (
            <Button variant="outline" onClick={handleSignOut} id="portal-signout-btn">
              <LogOut size={14} /> Sign Out
            </Button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="cgp-layout">
        {/* Left sidebar */}
        <PortalSidebar
          orgName={engineConfig.organization}
          instructions={engineConfig.config.instructions}
          currentStep={sidebarStep}
          isAuth={isAuthenticated}
        />

        {/* Main content */}
        <main className="cgp-content">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome */}
            {!isAuthenticated && portalStep === 0 && (
              <WelcomeStep
                key="welcome"
                orgName={engineConfig.organization}
                config={engineConfig.config}
                onNext={() => setPortalStep(1)}
              />
            )}

            {/* Step 1: Auth Gate */}
            {!isAuthenticated && portalStep === 1 && (
              <AuthGate
                key="auth"
                orgId={orgId!}
                isCetMode={isCetMode}
                onSuccess={() => refetch()}
              />
            )}

            {/* Authenticated: workflow stage */}
            {isAuthenticated && appState && (
              <motion.div
                key="workflow"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="cgp-content__header">
                  <div className="cgp-content__step-label">
                    Application ID: {appState._id?.toString().slice(-6).toUpperCase()}
                  </div>
                  <h1 className="cgp-content__title">
                    {appState.status === "enrolled"
                      ? "🎓 Admission Confirmed!"
                      : appState.status === "fee_pending" || appState.status === "allotted"
                      ? "💳 Complete Fee Payment"
                      : appState.status === "draft" || appState.status === "student_registered"
                      ? "📝 Complete Your Application"
                      : "📋 Application Status"}
                  </h1>
                  <p className="cgp-content__desc">
                    {appState.status === "enrolled"
                      ? "Congratulations! You are now enrolled."
                      : "Your application is being processed. Track progress below."}
                  </p>
                </div>
                <div
                  app={appState}
                  engineConfig={engineConfig}
                  onRefresh={refetch}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
