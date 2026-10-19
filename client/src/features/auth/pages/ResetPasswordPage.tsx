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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Eye, EyeOff, XCircle, AlertCircle } from "lucide-react";

import { resetPasswordWithToken, verifyResetToken } from "../api";

const CLASSGRID_LOGO =
  "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "info" } | null>(null);
  const [isSuccess, setIsSuccess] = useState(() => {
    return localStorage.getItem(`reset_success_${token}`) === "true";
  });
  const [isTokenDead, setIsTokenDead] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      return;
    }

    // Check local storage first for instant feedback if they just set it
    if (localStorage.getItem(`reset_success_${token}`) === "true") {
      setIsVerifying(false);
      return;
    }

    // Verify token with backend
    const checkToken = async () => {
      try {
        const response = await verifyResetToken(token);
        if (!response.valid) {
          setIsTokenDead(true);
        }
      } catch (err) {
        setIsTokenDead(true);
      } finally {
        setIsVerifying(false);
      }
    };
    checkToken();
  }, [token]);
  const passwordRules = useMemo(() => {
    return {
      minLength: password.length >= 8,
      maxLength: password.length > 0 && password.length <= 64,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[@#$%^&*!?_.\-]/.test(password),
    };
  }, [password]);

  const passedRules = Object.values(passwordRules).filter(Boolean).length;

  const strength = useMemo(() => {
    if (!password) return "empty";
    if (passedRules <= 3) return "weak";
    if (passedRules <= 5) return "medium";
    return "strong";
  }, [password, passedRules]);

  const isStrongPassword =
    passwordRules.minLength &&
    passwordRules.maxLength &&
    passwordRules.uppercase &&
    passwordRules.lowercase &&
    passwordRules.number &&
    passwordRules.special;

  const isConfirmTouched = confirmPassword.length > 0;
  const isPasswordMatch = password === confirmPassword && isConfirmTouched;

  const canSubmit = !!token && isStrongPassword && isPasswordMatch && !isSubmitting;

  const strengthStyles = {
    empty: {
      border: "border-border dark:border-white/10",
      glow: "",
      text: "text-gray-400",
      bar: "bg-white/10 w-0",
      label: "",
    },
    weak: {
      border: "border-red-500/70",
      glow: "shadow-[0_0_18px_rgba(239,68,68,0.20)]",
      text: "text-red-400",
      bar: "bg-red-500 w-1/3",
      label: "Weak password",
    },
    medium: {
      border: "border-orange-500/70",
      glow: "shadow-[0_0_18px_rgba(249,115,22,0.20)]",
      text: "text-orange-400",
      bar: "bg-orange-500 w-2/3",
      label: "Medium password",
    },
    strong: {
      border: "border-emerald-500/80",
      glow: "shadow-[0_0_20px_rgba(16,185,129,0.25)]",
      text: "text-emerald-400",
      bar: "bg-emerald-500 w-full",
      label: "Strong password",
    },
  };

  const current = strengthStyles[strength];

  const confirmBorder = !isConfirmTouched
    ? "border-border dark:border-white/10"
    : isPasswordMatch
      ? "border-emerald-500/80 shadow-[0_0_18px_rgba(16,185,129,0.22)]"
      : "border-red-500/70 shadow-[0_0_18px_rgba(239,68,68,0.20)]";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setFeedback(null);
    setIsSubmitting(true);

    try {
      await resetPasswordWithToken({ token, password });
      setPassword("");
      setConfirmPassword("");
      localStorage.setItem(`reset_success_${token}`, "true");
      setIsSuccess(true);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Could not reset password right now.";
      setFeedback({ message, tone: "error" });

      const lowerMsg = message.toLowerCase();
      if (lowerMsg.includes("expire") || lowerMsg.includes("invalid")) {
        setIsTokenDead(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted dark:bg-[#111111]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </main>
    );
  }

  if (isTokenDead) {
    return (
      <main
        className="relative flex min-h-screen flex-col items-center justify-center px-4"
        style={{
          backgroundColor: "#111111",
          backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.03) 25%, #111111 25%)",
          backgroundPosition: "40px 0, 40px 0, 0 0, 0 0",
          backgroundSize: "80px 80px",
          backgroundRepeat: "repeat"
        }}
      >
        <div className="flex w-full max-w-[430px] flex-col items-center justify-center rounded-[28px] border border-border dark:border-white/10 bg-muted dark:bg-[#111111] px-7 py-12 shadow-2xl relative z-10 text-center">
          <div
            className="flex h-[80px] w-[80px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/30"
          >
            <AlertCircle className="h-[40px] w-[40px] text-red-500" />
          </div>
          <h2 className="mt-5 text-[20px] font-bold text-foreground dark:text-white">Link Expired</h2>
          <p className="mt-3 text-[14px] text-gray-400">
            This password reset link is invalid or has expired. Please request a new link to reset your password.
          </p>
        </div>
        <footer className="absolute bottom-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()}, Classgrid Education. All Rights Reserved.
        </footer>
      </main>
    );
  }

  if (isSuccess) {
    return (
      <main
        className="relative flex min-h-screen flex-col items-center justify-center px-4"
        style={{
          backgroundColor: "#111111",
          backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.03) 25%, #111111 25%)",
          backgroundPosition: "40px 0, 40px 0, 0 0, 0 0",
          backgroundSize: "80px 80px",
          backgroundRepeat: "repeat"
        }}
      >
        <div className="flex w-full max-w-[430px] flex-col items-center justify-center rounded-[28px] border border-border dark:border-white/10 bg-muted dark:bg-[#111111] px-7 py-12 shadow-2xl relative z-10">
          {/* Animated tick circle */}
          <div
            className="flex h-[100px] w-[100px] items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
              border: "2px solid rgba(16,185,129,0.4)",
              animation: "scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            }}
          >
            <Check
              className="h-[48px] w-[48px] text-[#10b981]"
              strokeWidth={3}
              style={{ animation: "fadeIn 0.4s ease 0.3s both" }}
            />
          </div>

          <p
            className="mt-5 text-[18px] font-semibold text-foreground dark:text-white"
            style={{ animation: "fadeIn 0.4s ease 0.5s both" }}
          >
            Password Set
          </p>

          <Link
            to={window.location.pathname.includes("activate") ? "/onboard" : "/login"}
            className="mt-8 flex items-center justify-center h-12 w-full rounded-xl font-bold bg-emerald-500 text-white shadow-[0_0_24px_rgba(16,185,129,0.28)] hover:bg-emerald-400 transition-colors"
            style={{ animation: "fadeIn 0.4s ease 0.7s both" }}
          >
            {window.location.pathname.includes("activate") ? "Complete Profile Setup" : "Back to Login"}
          </Link>
        </div>

        <style>{`
          @keyframes scaleIn {
            0% { transform: scale(0); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
        `}</style>

        <footer className="absolute bottom-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()}, Classgrid Education. All Rights Reserved.
        </footer>
      </main>
    );
  }

  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center px-4"
      style={{
        backgroundColor: "#111111",
        backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(45deg, rgba(255,255,255,0.03) 25%, transparent 25%), linear-gradient(315deg, rgba(255,255,255,0.03) 25%, #111111 25%)",
        backgroundPosition: "40px 0, 40px 0, 0 0, 0 0",
        backgroundSize: "80px 80px",
        backgroundRepeat: "repeat"
      }}
    >
      <div className="relative z-10 w-full max-w-[430px] rounded-[28px] border border-border dark:border-white/10 bg-muted dark:bg-[#111111] p-8 shadow-2xl">
        {/* Logo */}
        <img
          src={CLASSGRID_LOGO}
          alt="Classgrid"
          className="mx-auto h-[56px] w-[56px] object-contain"
        />

        <h1 className="mt-6 text-center text-3xl font-bold text-foreground dark:text-white">
          Reset Your Password
        </h1>

        {!token && (
          <div className="mt-6 rounded-[12px] border border-red-500/35 bg-red-500/10 px-4 py-3 text-[13px] leading-5 text-red-200">
            This reset link is missing a token. Please request a new reset link.
          </div>
        )}

        {token ? (
          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(e); }} className="mt-8">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              New Password
            </label>

            <div className="relative mt-3">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                maxLength={64}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="Enter new password"
                className={`h-14 w-full rounded-2xl border bg-muted dark:bg-[#111111] px-5 pr-12 text-foreground dark:text-white outline-none transition-all duration-300 placeholder:text-gray-500 ${current.border} ${current.glow}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground dark:text-white transition-colors focus:outline-none focus:ring-0 border-none focus:border-transparent"
              >
                {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
              </button>

              {/* Floating Rules Popover */}
              {isPasswordFocused && password.length >= 2 && (
                <div className="absolute left-[calc(100%+16px)] top-1/2 z-50 w-[260px] -translate-y-1/2 rounded-xl border border-border dark:border-white/10 bg-[#1e1e1e] p-4 shadow-xl hidden md:block">
                  <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-border dark:border-white/10 bg-[#1e1e1e]" />
                  <p className="text-[13px] font-semibold text-foreground dark:text-white">Password must contain:</p>
                  <ul className="mt-2 flex flex-col gap-1 text-[12px] text-gray-300">
                    <li className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.minLength ? "bg-emerald-500" : "bg-gray-500"}`} />
                      Between 8 and 64 characters
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.uppercase && passwordRules.lowercase ? "bg-emerald-500" : "bg-gray-500"}`} />
                      Uppercase & lowercase letters
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.number ? "bg-emerald-500" : "bg-gray-500"}`} />
                      At least 1 number
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.special ? "bg-emerald-500" : "bg-gray-500"}`} />
                      At least 1 special character
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {password && (
              <>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${current.bar}`}
                  />
                </div>
              </>
            )}

            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Confirm Password
              </label>

              <div className="relative mt-3">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  maxLength={64}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className={`h-14 w-full rounded-2xl border bg-muted dark:bg-[#111111] px-5 pr-12 text-foreground dark:text-white outline-none transition-all duration-300 placeholder:text-gray-500 ${confirmBorder}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-foreground dark:text-white transition-colors focus:outline-none focus:ring-0 border-none focus:border-transparent"
                >
                  {showConfirmPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </div>

              {isConfirmTouched && (
                <p
                  className={`mt-2 text-sm font-semibold ${isPasswordMatch ? "text-emerald-400" : "text-red-400"
                    }`}
                >
                  {isPasswordMatch ? "Passwords match" : "Passwords do not match"}
                </p>
              )}
            </div>

            {feedback && (
              <div
                className={`mt-4 rounded-[12px] border px-3 py-2 text-[12px] leading-5 ${feedback.tone === "error"
                    ? "border-red-500/35 bg-red-500/10 text-red-200"
                    : "border-emerald-500/35 bg-emerald-500/10 text-emerald-200"
                  }`}
              >
                {feedback.message}
              </div>
            )}



            <button
              type="submit"
              disabled={!canSubmit}
              className={`mt-7 h-14 w-full rounded-2xl font-bold transition-all duration-300 ${canSubmit
                  ? "bg-emerald-500 text-foreground dark:text-white shadow-[0_0_24px_rgba(16,185,129,0.28)] hover:bg-emerald-400"
                  : "cursor-not-allowed bg-emerald-700/60 text-gray-400"
                }`}
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </button>
          </form>
        ) : null}
      </div>

      <footer className="absolute bottom-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()}, Classgrid Education. All Rights Reserved.
      </footer>
    </main>
  );
}
