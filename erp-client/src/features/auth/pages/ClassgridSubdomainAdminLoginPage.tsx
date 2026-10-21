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

import { useEffect, useState, type FormEvent } from "react";
import { Mail, MapPin, HelpCircle, Lock, Eye, EyeOff, GraduationCap, Users, ArrowLeft, Globe, Facebook, Instagram, Linkedin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getGoogleAuthUrl, loginWithPassword, verifyDeviceOtp, resendDeviceOtp, getAuthBranding, requestPasswordReset } from "../api";
import { navigateWithRescue } from "@/lib/rescue";
import { clearAuthCallbackError, getAuthCallbackFeedback, getPostLoginPath, redirectToBrandingFallback, saveStoredAuthRole, readStoredAuthRole, getRoleLabel, getPortalLabel, isInstitutionAdminRole } from "../auth-helpers";
import type { AuthUserRole, AuthLoginRole, AuthBranding } from "../types";
import { toast } from "sonner";

/* â”€â”€ Constants â”€â”€ */
const CLASSGRID_LOGO =
  "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png";

export function ClassgridSubdomainAdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [showPassword, setShowPassword] = useState(false);

  // â”€â”€ Branding State â”€â”€
  const [branding, setBranding] = useState<AuthBranding | null>(null);
  const [brandingError, setBrandingError] = useState(false);

  // â”€â”€ Backend State â”€â”€
  const [step, setStep] = useState<1 | "device">(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "info" } | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [rememberedRole, setRememberedRole] = useState<AuthLoginRole | null>(null);

  useEffect(() => {
    setRememberedRole(readStoredAuthRole());
  }, []);

  useEffect(() => {
    let isMounted = true;
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname.endsWith(".localhost") || hostname.startsWith("127.0.0.1");
    const isClassgrid = hostname.endsWith("classgrid.in");

    const searchParams = new URLSearchParams(location.search);
    const subdomain = (isClassgrid || isLocalhost) && hostname.includes(".") ? hostname.split(".")[0] : undefined;
    const slug = searchParams.get("slug") || searchParams.get("org") || (subdomain !== "superadmin" ? subdomain : undefined);

    getAuthBranding({ authType: "institution", slug })
      .then((result) => {
        if (isMounted) {
          setBranding(result);
          document.title = "Classgrid";
        }
      })
      .catch((error: unknown) => {
        if (redirectToBrandingFallback(error)) return;
        if (isMounted) setBrandingError(true);
      });

    return () => { isMounted = false; };
  }, [location.search]);

  useEffect(() => {
    // Handle Google OAuth device verification redirect
    const params = new URLSearchParams(location.search);
    const callbackFeedback = getAuthCallbackFeedback(location.search);
    if (callbackFeedback) {
      setFeedback({ message: callbackFeedback.message, tone: "error" });
      clearAuthCallbackError();
    }
    if (params.get("device_verify") === "true") {
      const redirectEmail = params.get("email") || "";
      if (redirectEmail) {
        setEmail(redirectEmail);
        setStep("device");
        setOtpCooldownSeconds(60);
        setFeedback({
          message: "New device detected. A verification code has been sent to your email.",
          tone: "info",
        });
      }
    }
  }, [location.search]);

  useEffect(() => {
    if (step !== "device" || otpCooldownSeconds <= 0) return;
    const timer = window.setInterval(() => setOtpCooldownSeconds((c) => Math.max(0, c - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [otpCooldownSeconds, step]);

  const effectiveRole = isInstitutionAdminRole(rememberedRole) ? rememberedRole : "org_admin";

  const titleText = isInstitutionAdminRole(rememberedRole)
    ? `Welcome back, ${getRoleLabel(rememberedRole)}`
    : "Admin Portal";

  const subtitleText = isInstitutionAdminRole(rememberedRole)
    ? `Continue to the ${getPortalLabel(rememberedRole)} for ${branding?.name || "your institution"}.`
    : `Sign in to access your administrative workspace`;

  const rememberLoggedInUser = (result: any) => {
    if (!result.user) return;
    queryClient.setQueryData(["current-user"], {
      _id: result.user.id,
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      role: result.user.role,
      organization_id: result.user.organization_id,
    });
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password || isSubmitting) return;

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await loginWithPassword({
        email: email.trim(),
        password,
        audience: "admin",
        role: effectiveRole,
        rememberMe,
      });

      if (result.needsDeviceOtp) {
        setPassword("");
        setOtp("");
        setOtpCooldownSeconds(result.retryAfterSeconds || 60);
        setFeedback({
          message: result.message || "A verification code has been sent to your registered email.",
          tone: "info",
        });
        setStep("device");
        return;
      }

      rememberLoggedInUser(result);
      saveStoredAuthRole(result.user?.role || effectiveRole);
      if (result.firstLogin) toast.success("Welcome to Classgrid.");
      navigate(getPostLoginPath(result), { replace: true });
    } catch (error: any) {
      if (error && typeof error === "object" && "needsDeviceOtp" in error) {
        setPassword("");
        setOtp("");
        setOtpCooldownSeconds(error.retryAfterSeconds || 60);
        setFeedback({
          message: error.message || "A verification code has been sent.",
          tone: "info",
        });
        setStep("device");
        return;
      }
      setFeedback({ message: error?.message || "Login failed. Please try again.", tone: "error" });
      setShowForgotPassword(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDevice = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!otp || isSubmitting) return;

    setFeedback(null);
    setIsSubmitting(true);

    try {
      const result = await verifyDeviceOtp({ email: email.trim(), otp: otp.trim() });
      rememberLoggedInUser(result);
      saveStoredAuthRole(result.user?.role || effectiveRole);
      if (result.firstLogin) toast.success("Welcome to Classgrid.");
      navigate(getPostLoginPath(result), { replace: true });
    } catch (error: any) {
      setFeedback({ message: error?.message || "Device verification failed.", tone: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email || isResendingOtp || otpCooldownSeconds > 0) return;
    setFeedback(null);
    setIsResendingOtp(true);
    try {
      const result = await resendDeviceOtp(email.trim());
      setOtpCooldownSeconds(60);
      setFeedback({ message: result.message || "OTP sent successfully.", tone: "info" });
    } catch (error: any) {
      setOtpCooldownSeconds(error?.retryAfterSeconds || 60);
      setFeedback({ message: error?.message || "Could not resend OTP.", tone: "error" });
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleForgotPasswordClick = async () => {
    if (!email) {
      toast.error("Please enter your email address first.");
      return;
    }
    const toastId = toast.loading("Sending reset link...");
    try {
      const response = await requestPasswordReset(email.trim());
      toast.success(response?.message || "If the email is registered, a password reset link has been sent.", { id: toastId });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Failed to send reset link.", { id: toastId });
    }
  };

  const handleGoogleContinue = () => {
    saveStoredAuthRole(effectiveRole);
    navigateWithRescue(getGoogleAuthUrl({ audience: "admin", role: effectiveRole }));
  };

  // Load Google reCAPTCHA v3 â€” shows official badge at bottom-right
  if (brandingError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background dark:bg-[#080808] text-white text-center">
        <img src="/logo.png" alt="Classgrid" className="h-16 w-16 object-contain mb-6 opacity-80" />
        <h2 className="text-2xl font-semibold mb-2">Institution Not Found</h2>
        <p className="text-muted-foreground dark:text-white/60">This login portal does not exist or has been moved.</p>
      </div>
    );
  }

  // Prevent flashing empty screen before branding loads
  if (!branding) {
    return <div className="h-screen w-screen bg-background dark:bg-[#080808]" />;
  }

  return (
    /* 1. Full Screen â€” fills exactly the viewport, never scrolls */
    <main className="h-screen w-screen bg-background dark:bg-[#0f0f0f]">

      {/* Container holding the 2-column grid */}
      <div className="grid h-full w-full grid-cols-1 lg:grid-cols-2 overflow-hidden">

        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        {/* 3. LEFT PANEL                               */}
        {/* â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  */}
        <section className="relative hidden lg:flex flex-col bg-background dark:bg-[#0f0f0f] border-r border-border dark:border-white/[0.15] overflow-hidden px-10">

          {/* TOP GREEN EFFECT - left to right direction */}
          <div
            className="pointer-events-none absolute -top-[90px] -left-[120px] h-[320px] w-[420px] rounded-full blur-[90px]"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.85) 0%, rgba(16,185,129,0.4) 38%, rgba(16,185,129,0) 72%)",
            }}
          />

          {/* BOTTOM ORANGE EFFECT - right to left direction */}
          <div
            className="pointer-events-none absolute -bottom-[120px] -right-[110px] h-[340px] w-[460px] rounded-full blur-[125px]"
            style={{
              background:
                "radial-gradient(circle, rgba(249,115,22,0.52) 0%, rgba(249,115,22,0.24) 40%, rgba(249,115,22,0) 75%)",
            }}
          />

          {/* WHITE DOTTED GRID â€” top-right, fades before logo */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-[160px] w-[280px]"
            style={{
              opacity: 0.5,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1.2px, transparent 1.2px)",
              backgroundSize: "16px 16px",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
            }}
            aria-hidden="true"
          />

          {/* WHITE DOTTED GRID â€” middle-right, fades left to fill gap */}
          <div
            className="pointer-events-none absolute right-0 top-[140px] h-[260px] w-[200px]"
            style={{
              opacity: 0.45,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1.2px, transparent 1.2px)",
              backgroundSize: "16px 16px",
              maskImage: "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
              WebkitMaskImage: "linear-gradient(to left, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
            }}
            aria-hidden="true"
          />

          {/* WHITE DOTTED GRID â€” middle-left, fades right to fill gap */}
          <div
            className="pointer-events-none absolute left-0 bottom-[140px] h-[240px] w-[180px]"
            style={{
              opacity: 0.45,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.65) 1.2px, transparent 1.2px)",
              backgroundSize: "16px 16px",
              maskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
              WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
            }}
            aria-hidden="true"
          />

          {/* WHITE DOTTED GRID â€” bottom-left, fades before content */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 h-[180px] w-[320px]"
            style={{
              opacity: 0.45,
              backgroundImage: "radial-gradient(rgba(255,255,255,0.65) 1.2px, transparent 1.2px)",
              backgroundSize: "16px 16px",
              maskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
              WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.4) 50%, transparent 85%)",
            }}
            aria-hidden="true"
          />

          {/* Spacer pushes content down naturally */}
          <div className="flex-1" />

          {/* 4. Classgrid Logo */}
          <img
            src={CLASSGRID_LOGO}
            alt="Classgrid"
            className="relative z-10 mx-auto h-[160px] w-[160px] object-contain"
          />

          {/* 5. Contact Information */}
          <div className="relative z-10 mx-auto mt-6 w-full max-w-[360px] [@media(max-height:750px)]:hidden">
            <h2 className="text-[22px] font-bold text-foreground dark:text-white">
              Contact Information
            </h2>

            <div className="mt-5 flex items-center gap-4">
              <Mail className="h-6 w-6 shrink-0 text-[#10b981]" />
              <p className="text-[14px] text-foreground dark:text-white">support@classgrid.in</p>
            </div>

            <div className="my-4 h-px bg-border dark:bg-white/[0.14]" />

            <div className="flex items-start gap-4">
              <MapPin className="mt-0.5 h-6 w-6 shrink-0 text-[#f97316]" />
              <p className="text-[14px] leading-[22px] text-foreground dark:text-white">
                Sector 26, Pradhikaran, Nigdi,
                <br />
                Pune, Maharashtra 411044
              </p>
            </div>
          </div>

          {/* 6. Social Media Card */}
          <div className="relative z-10 mx-auto mt-5 flex h-[90px] w-full max-w-[360px] items-center justify-center gap-7 rounded-[20px] border border-border dark:border-white/[0.14] bg-white/[0.04] [@media(max-height:750px)]:hidden">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/classgridedu/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#ededed] transition-transform hover:scale-110"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#E1306C">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </a>

            {/* GitHub */}
            <a
              href="https://github.com/nikhilnick5050"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#ededed] transition-transform hover:scale-110"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#333333">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/people/Classgrid/61588646851017/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#ededed] transition-transform hover:scale-110"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>

          {/* Spacer pushes support button to bottom */}
          <div className="flex-1" />

          {/* 7. Support Button */}
          <div className="relative z-10 pb-6 flex justify-start [@media(max-height:750px)]:hidden">
            <a
              href="https://classgrid.in/support/ticket"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit h-[46px] items-center gap-2 rounded-full border border-[#10b981]/50 bg-[#047857] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#059669]"
            >
              <HelpCircle className="h-5 w-5" />
              Support
            </a>
          </div>
        </section>

        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        {/* 8. RIGHT PANEL                              */}
        {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <section className="flex h-full flex-col bg-muted dark:bg-[#111111] px-6 overflow-y-auto py-8">

          {/* 9. Inner Login Box */}
          <div className="flex w-full max-w-[500px] flex-col justify-center rounded-[24px] border border-border dark:border-white/[0.15] bg-background dark:bg-[#0f0f0f] px-10 py-8 shadow-xl shrink-0 mx-auto my-auto [@media(max-height:750px)]:my-0">

            {step === 1 ? (
              <form onSubmit={handleLogin} className="flex flex-col" aria-busy={isSubmitting}>
                {/* 10. College Header */}
                {branding.logoUrl && (
                  <img src={branding.logoUrl} alt={branding.name} className="mx-auto max-h-[200px] w-auto max-w-[340px] object-contain rounded-[12px]" />
                )}
                <h1 className="mt-4 text-center text-[24px] font-bold text-foreground dark:text-white">
                  {branding.name || titleText}
                </h1>
                <p className="mt-1 text-center text-[13px] text-muted-foreground dark:text-white/65">Welcome back!</p>
                <p className="mt-0.5 text-center text-[13px] text-muted-foreground dark:text-white/65">{subtitleText}</p>

                {/* 12. Google Button */}
                <button type="button" onClick={handleGoogleContinue} className="mt-4 flex h-[46px] w-full items-center justify-center gap-3 rounded-[12px] border border-border dark:border-white/[0.14] bg-muted dark:bg-[#111111] text-[14px] font-medium text-foreground dark:text-white transition-colors hover:bg-zinc-200 dark:hover:bg-[#222222]">
                  <img src="https://cdn.classgrid.in/svg__logo_collection/google-icon-logo-svgrepo-com.svg" alt="Google" className="h-[18px] w-[18px]" />
                  Continue with Google
                </button>

                <div className="my-2 flex items-center gap-4">
                  <div className="h-px flex-1 bg-border dark:bg-white/[0.14]" />
                  <span className="text-[12px] text-muted-foreground dark:text-white/55">OR</span>
                  <div className="h-px flex-1 bg-border dark:bg-white/[0.14]" />
                </div>

                {/* 14. Email Input */}
                <div className="flex h-[46px] items-center gap-3 rounded-[12px] border border-border dark:border-white/[0.14] bg-background dark:bg-[#141414] px-4 transition-colors focus-within:border-emerald-500/50">
                  <Mail className="h-[18px] w-[18px] shrink-0 text-muted-foreground dark:text-white/70" />
                  <input id="subdomain-admin-email" name="email" type="email" autoComplete="email" aria-label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-transparent text-[14px] text-foreground dark:text-white outline-none placeholder:text-muted-foreground dark:placeholder-white/40 focus:ring-0 border-none focus:border-transparent" style={{ boxShadow: 'none', border: 'none', outline: 'none' }} placeholder="Email Address" />
                </div>

                {/* Password Input */}
                <div className="mt-3 flex h-[46px] items-center gap-3 rounded-[12px] border border-border dark:border-white/[0.14] bg-background dark:bg-[#141414] px-4 transition-colors focus-within:border-emerald-500/50">
                  <Lock className="h-[18px] w-[18px] shrink-0 text-muted-foreground dark:text-white/70" />
                  <input id="subdomain-admin-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-transparent text-[14px] text-foreground dark:text-white outline-none placeholder:text-muted-foreground dark:placeholder-white/40 focus:ring-0 border-none focus:border-transparent" style={{ boxShadow: 'none', border: 'none', outline: 'none' }} placeholder="Password" />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="shrink-0 text-muted-foreground dark:text-white/70 transition-colors hover:text-white">
                    {showPassword ? <Eye className="h-[18px] w-[18px]" /> : <EyeOff className="h-[18px] w-[18px]" />}
                  </button>
                </div>

                {/* 15. Remember Me & Forgot Password */}
                <div className="mt-3 flex items-center justify-between">
                  <label className="flex items-center gap-3" htmlFor="admin-remember-me">
                    <input id="admin-remember-me" name="rememberMe" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-[#10b981]" />
                    <span className="text-[13px] text-foreground dark:text-white">Remember me</span>
                  </label>
                  {showForgotPassword && (
                    <button type="button" onClick={handleForgotPasswordClick} className="text-[13px] font-medium text-[#10b981] hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>

                {feedback && (
                  <div role={feedback.tone === "error" ? "alert" : "status"} aria-live={feedback.tone === "error" ? "assertive" : "polite"} className={`mt-4 rounded-[12px] border px-3 py-2 text-[12px] leading-5 ${feedback.tone === "error" ? "border-red-500/35 bg-red-500/10 text-red-200" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"}`}>
                    {feedback.message}
                  </div>
                )}

                {/* 17. Sign In Button */}
                <button type="submit" disabled={isSubmitting || !email || !password} className="mt-4 h-[50px] w-full rounded-[14px] bg-[#10b981] text-[16px] font-bold text-white transition-colors hover:bg-[#059669] disabled:opacity-50 shadow-lg shadow-emerald-900/50">
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </button>

                {/* 18. Terms Text */}
                <p className="mt-3 text-center text-[12px] text-muted-foreground dark:text-white/55">
                  By signing in, you agree to our <a href="https://classgrid.in/terms" target="_blank" rel="noopener noreferrer" className="text-[#10b981] hover:underline">Terms</a> &amp; <a href="https://classgrid.in/privacy" target="_blank" rel="noopener noreferrer" className="text-[#10b981] hover:underline">Privacy Policy</a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleVerifyDevice} className="flex flex-col" aria-busy={isSubmitting || isResendingOtp}>
                <button type="button" onClick={() => setStep(1)} className="mb-4 inline-flex w-fit items-center gap-2 text-[14px] font-medium text-muted-foreground dark:text-white/60 transition-colors hover:text-emerald-400">
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <h2 className="text-center text-[22px] font-bold text-foreground dark:text-white">Verify this device</h2>
                <p className="mt-1 text-center text-[13px] text-muted-foreground dark:text-white/65">Enter the one-time code sent to your email.</p>

                <div className="mt-5 flex h-[46px] items-center gap-3 rounded-[12px] border border-border dark:border-white/[0.14] bg-background dark:bg-[#141414] px-4 transition-colors focus-within:border-emerald-500/50">
                  <Lock className="h-[18px] w-[18px] shrink-0 text-muted-foreground dark:text-white/70" />
                  <input id="subdomain-admin-device-code" name="deviceCode" type="text" maxLength={6} inputMode="numeric" autoComplete="one-time-code" aria-label="Six-digit device verification code" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} required className="w-full bg-transparent text-[16px] text-foreground dark:text-white outline-none placeholder:text-muted-foreground dark:placeholder-white/40 tracking-[0.25em] focus:ring-0 border-none focus:border-transparent" style={{ boxShadow: 'none', border: 'none', outline: 'none' }} placeholder="000000" />
                </div>

                {feedback && (
                  <div role={feedback.tone === "error" ? "alert" : "status"} aria-live={feedback.tone === "error" ? "assertive" : "polite"} className={`mt-4 rounded-[12px] border px-3 py-2 text-[13px] leading-5 ${feedback.tone === "error" ? "border-red-500/35 bg-red-500/10 text-red-200" : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"}`}>
                    {feedback.message}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting || otp.length !== 6} className="mt-4 h-[50px] w-full rounded-[14px] bg-[#10b981] text-[16px] font-bold text-white transition-colors hover:bg-[#059669] disabled:opacity-50 shadow-lg shadow-emerald-900/50">
                  {isSubmitting ? "Verifying..." : "Verify Device"}
                </button>

                <button type="button" onClick={handleResendOtp} disabled={isResendingOtp || otpCooldownSeconds > 0} className="mt-3 h-[46px] w-full rounded-[12px] border border-border dark:border-white/[0.14] bg-transparent text-[14px] font-medium text-foreground dark:text-white transition-colors hover:bg-white/5 disabled:opacity-50">
                  {isResendingOtp ? "Sending..." : otpCooldownSeconds > 0 ? `Resend Code in ${otpCooldownSeconds}s` : "Resend Code"}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
