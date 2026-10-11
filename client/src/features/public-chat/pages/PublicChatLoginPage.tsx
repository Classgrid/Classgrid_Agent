"use client";

import React, { useState, Suspense, useEffect, useRef, useMemo, lazy } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/marketing_ui/input-otp";
import { Spinner } from "@/components/marketing_ui/spinner";
import { useTheme } from "next-themes";
import { Eye, EyeOff, Check, GraduationCap, BookOpen, Shield, Code, PenTool, Database, Microscope, Target, Megaphone, TrendingUp, Headset, Settings, PenLine, Laptop, Users, Building, UserPlus, PiggyBank, Scale, Star, ChevronRight, ChevronDown, Search } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/marketing_ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/marketing_ui/popover";
import { customArray } from "country-codes-list";
import * as Flags from 'country-flag-icons/react/3x2';
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner"; // the app's mounted Toaster (components/marketing_ui/sonner)
import { getGoogleAuthUrl, loginWithPassword, requestPasswordReset, verifyDeviceOtp, resendDeviceOtp } from "../../auth/api";
import { API_BASE_URL, apiClient } from "@/lib/apiClient";
import { LoginGridBackground } from "../components/LoginGridBackground";

// How this browser last logged in (shown as a "Last used" tag) and whether it has logged in before (greeting).
// The server sets this cookie only after a login really succeeded, so a click that never finished doesn't count.
type LoginMethod = "google" | "github" | "email";
function readLastLoginMethod(): LoginMethod | null {
  try {
    const match = document.cookie.match(/(?:^|;\s*)cg_last_login_method=([a-z]+)/);
    const v = match?.[1];
    return v === "google" || v === "github" || v === "email" ? v : null;
  } catch { return null; }
}
const RETURNING_GREETINGS = [
  { title: "Welcome back to Classgrid 👋", subtitle: "Sign in to continue your learning, check your classes and stay up to date." },
  { title: "Good to see you again!", subtitle: "Log in to access your courses, schedule and updates in one place." },
];
const FIRST_GREETING = { title: "Welcome to Classgrid", subtitle: "Sign in with your email to pick up where you left off." };

function LastUsedTag({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold leading-none text-white shadow-sm dark:bg-[#f1f1f1] dark:text-[#111] ${className}`}>
      Last used
    </span>
  );
}
const Confetti = lazy(() => import("react-confetti"));

const ROLES = [
  { value: "software_engineer", label: "Software Engineer", icon: Code },
  { value: "designer", label: "Designer", icon: PenTool },
  { value: "data_scientist", label: "Data Scientist", icon: Database },
  { value: "researcher", label: "Researcher", icon: Microscope },
  { value: "product_manager", label: "Product Manager", icon: Target },
  { value: "marketer", label: "Marketer", icon: Megaphone },
  { value: "sales", label: "Sales", icon: TrendingUp },
  { value: "customer_support", label: "Customer Support", icon: Headset },
  { value: "operations", label: "Operations", icon: Settings },
  { value: "writer", label: "Writer", icon: PenLine },
  { value: "freelancer", label: "Freelancer", icon: Laptop },
  { value: "consultant", label: "Consultant", icon: Users },
  { value: "executive", label: "Executive", icon: Building },
  { value: "hr", label: "Human Resources", icon: UserPlus },
  { value: "finance", label: "Finance", icon: PiggyBank },
  { value: "legal", label: "Legal", icon: Scale },
  { value: "other", label: "Other", icon: Star },
];

// Territories with no permanent residents (only temporary research / military staff), so nobody signs up
// from there: Antarctica, Bouvet Island, British Indian Ocean Territory, French Southern and Antarctic
// Lands, Heard Island and McDonald Islands, South Georgia and the South Sandwich Islands, US Minor
// Outlying Islands.
const UNINHABITED_TERRITORIES = new Set(["AQ", "BV", "IO", "TF", "HM", "GS", "UM"]);

const COUNTRY_CODES = customArray({
  label: "{countryNameEn}",
  code: "+{countryCallingCode}",
  flag: "{flag}",
  value: "{countryCode}",
})
  .filter((c) => !UNINHABITED_TERRITORIES.has(c.value))
  .sort((a, b) => a.label.localeCompare(b.label));

// Country code picker with search: digits ("91", "+44") match the calling code, letters match the country name.
function CountryCodePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = COUNTRY_CODES.find((c) => c.value === value);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, "");
    if (!q) return COUNTRY_CODES;
    if (/^\d+$/.test(q)) {
      return COUNTRY_CODES
        .filter((c) => c.code.slice(1).startsWith(q))
        .sort((x, y) => Number(y.code === `+${q}`) - Number(x.code === `+${q}`) || x.code.length - y.code.length);
    }
    return COUNTRY_CODES.filter((c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase() === q);
  }, [query]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    setQuery("");
  };
  const SelectedFlag = selected ? Flags[selected.value as keyof typeof Flags] : null;

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}>
      <PopoverTrigger className="flex w-full h-12 items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 transition-all outline-none focus:border-emerald-500 focus:shadow-[0_0_18px_rgba(16,185,129,0.2)] dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:focus:border-emerald-500">
        {selected ? (
          <span className="flex items-center gap-2">
            {SelectedFlag ? <SelectedFlag className="w-4 h-auto rounded-[2px]" /> : null}
            {selected.code}
          </span>
        ) : (
          <span className="text-slate-400">Code</span>
        )}
        <ChevronDown className="w-4 h-4 opacity-60" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-2 gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (results[0]) choose(results[0].value);
              }
            }}
            placeholder="Search code or country"
            className="w-full h-9 rounded-md border border-slate-200 bg-transparent pl-8 pr-2 text-sm outline-none focus:border-emerald-500 dark:border-[#2a2a2a]"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <p className="px-2 py-3 text-center text-[13px] text-slate-400">No country found</p>
          ) : (
            results.map((c) => {
              const FlagComponent = Flags[c.value as keyof typeof Flags];
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => choose(c.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-[#222] ${c.value === value ? "bg-slate-100 dark:bg-[#222]" : ""}`}
                >
                  {FlagComponent ? <FlagComponent className="w-4 h-auto shrink-0 rounded-[2px]" /> : <span>{c.flag}</span>}
                  <span className="w-12 shrink-0 font-medium">{c.code}</span>
                  <span className="truncate text-slate-500 dark:text-[#888]">{c.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}


const useSession = () => ({ data: null, status: "unauthenticated" });
const signIn = async (p: any, o: any) => { console.log("Mock signIn", p, o); return { ok: true, error: null }; };

const OTP_TTL_SECONDS = 600;
// Sign-up progress kept in the browser, so a refresh or reopened tab continues where the user stopped
// (as long as the 30-minute email verification ticket is still valid).
const ONBOARDING_STORAGE_KEY = "cg_chat_onboarding";
type SavedOnboarding = { email: string; firstName: string; lastName: string; ticket: string; step: "otp_verified" | "whatsapp" };

function ticketStillValid(ticket: string) {
  try {
    const payload = JSON.parse(atob((ticket.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

function saveOnboarding(data: SavedOnboarding) {
  try { localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data)); } catch { /* storage unavailable */ }
}

function clearOnboarding() {
  try { localStorage.removeItem(ONBOARDING_STORAGE_KEY); } catch { /* storage unavailable */ }
}

function loadOnboarding(): SavedOnboarding | null {
  try {
    const saved = JSON.parse(localStorage.getItem(ONBOARDING_STORAGE_KEY) || "null");
    if (saved?.email && saved?.ticket && ticketStillValid(saved.ticket)) return saved;
  } catch { /* storage unavailable or bad data */ }
  clearOnboarding();
  return null;
}
// A new code can be requested 60 s after the last one (the server enforces the same wait).
const RESEND_COOLDOWN_SECONDS = 60;

/** Map NextAuth URL error codes to user-friendly messages */
const OAUTH_ERROR_MAP: Record<string, string> = {
  OAuthCallback: "Sign-in was interrupted. Please try again.",
  OAuthAccountNotLinked: "Wrong account signed in. It looks like you're signed in with a different email address. Please sign in with the email address that received this email to continue.",
  OAuthSignin: "Could not start the sign-in flow. Please try again.",
  OAuthCreateAccount: "Could not create your account. Please try again.",
  Callback: "Something went wrong during sign-in. Please try again.",
  AccessDenied: "Access denied. You may not have permission to sign in.",
  default: "An unexpected error occurred. Please try again.",
};

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function LoginContent() {
  const { data: session, status } = useSession();
  const navigate = useNavigate();
  const router = { replace: (url: string) => navigate(url, { replace: true }), push: (url: string) => navigate(url) };
  const [searchParams] = useSearchParams();
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("system");
  }, [setTheme]);

  // If Discourse sent SSO params (sso + sig), complete the handshake after login
  const sso = searchParams.get("sso");
  const sig = searchParams.get("sig");

  const ssoReturnTo = (sso && sig)
    ? `/onboarding?sso=${encodeURIComponent(sso)}&sig=${encodeURIComponent(sig)}`
    : null;
  const rawCallbackUrl = searchParams.get("next") || searchParams.get("callbackUrl");
  const oauthError = searchParams.get("error");

  // IMPORTANT: When NextAuth encounters an OAuthCallback error, it replaces the original
  // callbackUrl with the homepage (https://classgrid.in). We save the REAL callbackUrl
  // to localStorage before starting OAuth, and restore it here if the URL has been mangled.
  const isHomepageCallback = !rawCallbackUrl || rawCallbackUrl === "https://classgrid.in" || rawCallbackUrl === "/";
  let explicitNext = rawCallbackUrl;
  const hasRetried = searchParams.get("retried") === "true";

  if (typeof window !== "undefined") {
    // Restore the original callbackUrl from localStorage if it was mangled
    if (oauthError && isHomepageCallback) {
      const saved = localStorage.getItem("classgrid:login-callback");
      if (saved) explicitNext = saved;
    }

    // AUTO-RECOVER: On OAuthCallback error, clear stale cookies and silently redirect
    // to a clean login page so the user never sees "Sign-in was interrupted."
    // The "retried" flag prevents infinite loops — if it fails twice, show the error.
    if ((oauthError === "OAuthCallback" || oauthError === "Callback") && !hasRetried) {
      // Clear all NextAuth cookies
      document.cookie.split(";").forEach((c) => {
        const name = c.split("=")[0].trim();
        if (name.includes("next-auth") || name.includes("__Secure-next-auth")) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure`;
        }
      });

      // Build a clean login URL with the preserved callbackUrl
      const cleanUrl = new URL(window.location.origin + "/login");
      const preservedCallback = explicitNext || localStorage.getItem("classgrid:login-callback");
      if (preservedCallback) cleanUrl.searchParams.set("callbackUrl", preservedCallback);
      cleanUrl.searchParams.set("retried", "true");

      // Silently redirect — user never sees the error
      window.location.replace(cleanUrl.toString());
    }
  }

  const intent = searchParams.get("intent");
  const unsubscribeType = searchParams.get("type");
  const targetShortCode = searchParams.get("c");

  let unsubscribeReturnTo = intent === "unsubscribe" && unsubscribeType
    ? `/api/preferences/unsubscribe?type=${unsubscribeType}`
    : null;

  if (unsubscribeReturnTo && targetShortCode) {
    unsubscribeReturnTo += `&c=${targetShortCode}`;
  }

  // After OAuth → if there's an explicit callbackUrl (e.g. from docs ?openComment=true), honour it directly.
  // Otherwise fall back to /api/auth/post-login which checks role and redirects appropriately.
  const oauthCallbackUrl = ssoReturnTo || unsubscribeReturnTo || explicitNext || "/api/auth/post-login";
  const otpSuccessUrl = ssoReturnTo || unsubscribeReturnTo || explicitNext || "/api/auth/post-login";


  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const whatsappTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRedirecting = useRef(false);

  // Pre-fetch CSRF token as soon as login page loads.
  // This ensures the next-auth CSRF cookie is properly set BEFORE the user clicks
  // any OAuth button, preventing the "Sign-in was interrupted" (OAuthCallback) error.
  useEffect(() => {
    fetch("/api/auth/csrf", { credentials: "include" }).catch(() => { });
  }, []);

  // Read once per visit: the "Last used" tag and a first-time vs welcome-back greeting
  const [lastMethod] = useState<LoginMethod | null>(() => readLastLoginMethod());
  const [greeting] = useState(() => (readLastLoginMethod() ? RETURNING_GREETINGS[Math.floor(Math.random() * RETURNING_GREETINGS.length)]! : FIRST_GREETING));

  const handleGoogle = () => {
    const loginTab = encodeURIComponent("user");
    const host = encodeURIComponent(window.location.hostname);
    // intent: only the Sign up screen may create an account; from Sign in an unknown email comes back as error=no_account
    const path = `/api/auth/google?loginTab=${loginTab}&host=${host}&intent=${mode}`;
    const url = (API_BASE_URL && !API_BASE_URL.startsWith('/')) ? new URL(path, API_BASE_URL).toString() : path;
    window.location.assign(url);
  };

  const handleGithub = () => {
    const loginTab = encodeURIComponent("user");
    const host = encodeURIComponent(window.location.hostname);
    const path = `/api/auth/chat/github?loginTab=${loginTab}&host=${host}&intent=${mode}`;
    const url = (API_BASE_URL && !API_BASE_URL.startsWith('/')) ? new URL(path, API_BASE_URL).toString() : path;
    window.location.assign(url);
  };

  // ── Redirect already-logged-in users ──
  useEffect(() => {
    if (status !== "authenticated" || !session?.user || isRedirecting.current) return;

    // If they were kicked back with an error (like wrong unsubscribe account),
    // we must kill their session and let them see the error, not redirect them again!
    if (searchParams.get("error")) {
      return;
    }

    const user = session.user as any;

    // If there's an explicit "next" param or SSO, honour it
    if (ssoReturnTo) {
      isRedirecting.current = true;
      window.location.href = ssoReturnTo;
      return;
    }
    if (unsubscribeReturnTo) {
      isRedirecting.current = true;
      window.location.href = unsubscribeReturnTo;
      return;
    }
    if (explicitNext) {
      isRedirecting.current = true;
      window.location.href = explicitNext;
      return;
    }

    // Platform users (community/staff) → raise ticket page
    if (user.isPlatformUser) {
      router.replace("/support/ticket");
    } else {
      // Non-platform (community) users → Classgrid Talk
      router.replace("/support/inquiry");
    }
  }, [status, session, router, ssoReturnTo, explicitNext, unsubscribeReturnTo]);

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"email" | "login_password" | "otp" | "otp_verified" | "password" | "whatsapp" | "whatsapp_otp" | "age" | "role" | "success">("email");
  // The OTP step is also used for the new-device code sent by password sign-in.
  const [deviceOtpMode, setDeviceOtpMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // (Variables declared above)

  const typeDisplay = unsubscribeType ? unsubscribeType.charAt(0).toUpperCase() + unsubscribeType.slice(1) : "";

  // Show OAuth error from URL (e.g. OAuthCallback)
  const urlError = searchParams.get("error");
  // no_account is shown as the red line under the email field instead (see the effect below)
  const friendlyUrlError = urlError && urlError !== "no_account"
    ? (Object.prototype.hasOwnProperty.call(OAUTH_ERROR_MAP, urlError) ? OAUTH_ERROR_MAP[urlError] : OAUTH_ERROR_MAP.default)
    : "";

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Google/GitHub from the Sign in screen with no account: the server sends us back with error=no_account.
  // Show the same red "Account does not exist" line as the email check, with the email filled in.
  useEffect(() => {
    if (searchParams.get("error") !== "no_account") return;
    const noAccountEmail = searchParams.get("email") || "";
    if (noAccountEmail) setEmail(noAccountEmail);
    setError("Account does not exist. Please sign up.");
    const clean = new URL(window.location.href);
    clean.searchParams.delete("error");
    clean.searchParams.delete("email");
    window.history.replaceState({}, "", clean.toString());
  }, [searchParams]);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [age, setAge] = useState("");
  const [role, setRole] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [whatsappCountryCode, setWhatsappCountryCode] = useState("");
  const [whatsappOtp, setWhatsappOtp] = useState("");
  const [emailVerifiedTicket, setEmailVerifiedTicket] = useState("");
  const [whatsappCountdown, setWhatsappCountdown] = useState(0);
  const [whatsappOtpExpired, setWhatsappOtpExpired] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);

  // Google/GitHub sign-in on a new device comes back here as ?device_verify=true&email=… (the server has
  // already emailed a code). Show the code step instead of the plain login screen, like the other login pages.
  useEffect(() => {
    if (searchParams.get("device_verify") !== "true") return;
    const redirectEmail = searchParams.get("email") || "";
    if (!redirectEmail) return;
    setMode("signin");
    setEmail(redirectEmail);
    setOtp("");
    setDeviceOtpMode(true);
    setStep("otp");
    startCountdown();
    toast.info("New device detected. We sent a 6-digit code to your email.");
    // Drop the query so a refresh doesn't start this again
    window.history.replaceState(null, "", window.location.pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (targetShortCode) {
      // get-email fetch bypassed
    }
  }, [targetShortCode]);

  // Handle OAuth users who need to complete onboarding
  useEffect(() => {
    const onboard = searchParams.get("onboard");
    const token = searchParams.get("token");
    const urlEmail = searchParams.get("email");
    
    if (onboard === "true" && token) {
      localStorage.setItem("token", token);
      if (urlEmail) setEmail(urlEmail);
      
      // Force Email OTP even for OAuth users
      const triggerOtp = async () => {
        try {
          await sendEmailCode(urlEmail || "");
          setStep("otp");
          startCountdown();
        } catch (err) {
          console.error("Failed to trigger OAuth Email OTP", err);
          setStep("otp"); // still go to OTP step
        }
      };
      
      if (urlEmail) {
         triggerOtp();
      } else {
         setStep("whatsapp");
      }

      // Remove query params to clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("onboard");
      url.searchParams.delete("token");
      url.searchParams.delete("email");
      window.history.replaceState({}, document.title, url.pathname + url.search);
    }
  }, [searchParams]);

  // If there's an error in the URL but they are still authenticated, sign them out
  // so they can see the error message and log in with the correct account.
  useEffect(() => {
    if (urlError && status === "authenticated") {
      // Mock signOut
    }
  }, [urlError, status]);

  // ... (keeping existing handlers up to the return statement)

  // Fast-forwarding down to the return JSX...

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (whatsappTimerRef.current) clearInterval(whatsappTimerRef.current);
  }, []);

  // Continue an unfinished sign-up after a refresh or reopened tab.
  useEffect(() => {
    if (searchParams.get("onboard") === "true") return;
    const saved = loadOnboarding();
    if (saved) {
      setEmail(saved.email);
      setFirstName(saved.firstName);
      setLastName(saved.lastName);
      setEmailVerifiedTicket(saved.ticket);
      setMode("signup");
      setStep(saved.step);
      return;
    }
    // Signed in, but WhatsApp is not verified yet (the chat sends such accounts here): go to the WhatsApp
    // step with the session token, which finalize-onboarding accepts in place of the email ticket.
    if (searchParams.get("logout") === "success") return;
    let cancelled = false;
    apiClient.get("/api/auth/me")
      .then((res: any) => {
        const me = res?.data?.user || res?.data;
        if (cancelled || !me?.needsChatOnboarding) return;
        const [first = "", ...rest] = String(me.name || "").trim().split(/\s+/);
        setEmail(me.email || "");
        setFirstName(first);
        setLastName(rest.join(" "));
        setEmailVerifiedTicket(res.data.token || localStorage.getItem("token") || "");
        setMode("signup");
        setStep("whatsapp");
      })
      .catch(() => { /* not signed in: normal sign-in page */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seconds until "Resend code" unlocks; 0 once the cooldown is over or the code has expired.
  const resendWait = otpExpired ? 0 : Math.max(0, countdown - (OTP_TTL_SECONDS - RESEND_COOLDOWN_SECONDS));
  const whatsappResendWait = whatsappOtpExpired ? 0 : Math.max(0, whatsappCountdown - (OTP_TTL_SECONDS - RESEND_COOLDOWN_SECONDS));

  // First send of an email code. A "wait N seconds" (429) reply means a code went out under a minute ago
  // (double submit or a retried request); that code is still valid, so it is not shown as an error.
  const sendingCodeRef = useRef(false);
  const sendEmailCode = async (address: string) => {
    try {
      await apiClient.post("/api/auth/chat/send-email-otp", { email: address });
    } catch (err: any) {
      if (err?.code !== "429") throw err;
    }
  };

  const startCountdown = () => {
    setCountdown(OTP_TTL_SECONDS);
    setOtpExpired(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startWhatsappCountdown = () => {
    setWhatsappCountdown(OTP_TTL_SECONDS);
    setWhatsappOtpExpired(false);
    if (whatsappTimerRef.current) clearInterval(whatsappTimerRef.current);
    whatsappTimerRef.current = setInterval(() => {
      setWhatsappCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(whatsappTimerRef.current!);
          setWhatsappOtpExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email");
      return;
    }

    if (mode === "signup" && (!firstName || !lastName)) {
      setError("Please enter your first and last name");
      return;
    }

    // Ignore a second submit while the first is still running (Enter + click sent two codes).
    if (sendingCodeRef.current) return;
    sendingCodeRef.current = true;
    setLoading(true);
    try {
      if (mode === "signin") {
        const checkRes = await apiClient.post("/api/auth/check-email", { email: email.toLowerCase() });
        if (checkRes.data.exists) {
          if (checkRes.data.hasPassword) {
            setStep("login_password");
          } else {
            // User exists but has no password (e.g. Google OAuth user) — send OTP for login
            await sendEmailCode(email.toLowerCase());
            setStep("otp");
            startCountdown();
          }
        } else {
          setError("Account does not exist. Please sign up.");
        }
      } else {
        // Signup mode — check if account already exists first
        const checkRes = await apiClient.post("/api/auth/check-email", { email: email.toLowerCase() });
        if (checkRes.data.exists) {
          // Auto switch to sign in if the user already exists
          setMode("signin");
          if (checkRes.data.hasPassword) {
            setStep("login_password");
          } else {
            await sendEmailCode(email.toLowerCase());
            setStep("otp");
            startCountdown();
          }
        } else {
          await sendEmailCode(email.toLowerCase());
          setStep("otp");
          startCountdown();
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message;
      setError(msg && typeof msg === "string" ? msg : "Failed to send OTP.");
    } finally {
      sendingCodeRef.current = false;
      setLoading(false);
    }
  };

  const handleLoginWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setLoading(true);
    try {
      const result = await loginWithPassword({
        email: email.trim(),
        password,
        audience: "user",
        role: "student",
        rememberMe: true,
        portal: "chat",
      });

      if (result.needsDeviceOtp) {
        setDeviceOtpMode(true);
        setStep("otp");
        startCountdown();
        return;
      }

      if (result.token) {
        localStorage.setItem("token", result.token);
      }

      // The chat checks the sign-up: an account without a verified WhatsApp number comes back here
      // and continues at the WhatsApp step.
      window.location.href = "/";
    } catch (err: any) {
      if (err && typeof err === "object" && "needsDeviceOtp" in err) {
        setDeviceOtpMode(true);
        setStep("otp");
        startCountdown();
        return;
      }
      setError(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first.");
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

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    if (deviceOtpMode) {
      try {
        await verifyDeviceOtp({ email: email.trim(), otp: otp.trim() });
        // Unfinished sign-ups are sent back from the chat to the WhatsApp step.
        window.location.href = "/";
      } catch (err: any) {
        setError(err?.message || "Device verification failed.");
        setLoading(false);
      }
      return;
    }
    try {
      const res = await apiClient.post("/api/auth/chat/verify-email-otp", {
        email,
        otp,
        name: mode === "signup" ? `${firstName} ${lastName}`.trim() : undefined,
      });

      if (res.data?.token || res.data?.emailVerifiedTicket) {
        const user = res.data.user;
        const needsOnboarding = mode === "signup" || (!user?.metadata?.whatsappPhone || !user?.metadata?.age) || !res.data.token;

        if (needsOnboarding) {
          // Proof of email verification, required by /chat/finalize-onboarding
          setEmailVerifiedTicket(res.data.emailVerifiedTicket || "");
          if (res.data.emailVerifiedTicket) {
            saveOnboarding({ email: email.trim(), firstName, lastName, ticket: res.data.emailVerifiedTicket, step: "otp_verified" });
          }
          setStep("otp_verified");
          setLoading(false);
        } else {
          localStorage.setItem("token", res.data.token);
          // Refresh the page or redirect so the app picks up the token and loads the chat session
          window.location.href = "/";
        }
      } else {
        setError("Failed to retrieve login session.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err?.message && typeof err.message === "string" ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

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

  const strengthStyles = {
    empty: {
      border: "border-slate-200 dark:border-[#2a2a2a]",
      glow: "",
      text: "text-slate-400",
      bar: "bg-black/10 dark:bg-white/10 w-0",
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
    ? "border-slate-200 dark:border-[#2a2a2a]"
    : isPasswordMatch
    ? "border-emerald-500/80 shadow-[0_0_18px_rgba(16,185,129,0.22)]"
    : "border-red-500/70 shadow-[0_0_18px_rgba(239,68,68,0.20)]";

  const handleSetupPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isStrongPassword) {
       setError("Password does not meet the complexity requirements.");
       return;
    }
    if (!isPasswordMatch) {
       setError("Passwords do not match.");
       return;
    }
    setLoading(true);
    try {
      // Saved now, so a user who stops at the WhatsApp step can come back and sign in with it.
      await apiClient.post("/api/auth/chat/save-password", {
        email: email.trim(),
        password,
        emailVerifiedTicket,
      });
      saveOnboarding({ email: email.trim(), firstName, lastName, ticket: emailVerifiedTicket, step: "whatsapp" });
      setStep("whatsapp");
    } catch (err: any) {
      if (err?.code === "401") {
        // The 30-minute email verification ran out: verify the email again.
        clearOnboarding();
        setPassword("");
        setConfirmPassword("");
        setOtp("");
        setStep("email");
        setError("Your email verification expired. Please enter your email to get a new code.");
      } else if (err?.code === "409") {
        // The password was already saved earlier (email is verified by the ticket): go on to WhatsApp.
        saveOnboarding({ email: email.trim(), firstName, lastName, ticket: emailVerifiedTicket, step: "whatsapp" });
        setPassword("");
        setConfirmPassword("");
        toast("Your password is already saved. Let's verify your WhatsApp.");
        setStep("whatsapp");
      } else {
        setError(err?.message || "Failed to save your password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAge = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!age || isNaN(Number(age)) || Number(age) < 13 || Number(age) > 120) {
       setError("Please enter a valid age.");
       return;
    }
    setLoading(true);
    try {
      setStep("role");
    } catch (err: any) {
      setError("Failed to save age.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsappOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!whatsappCountryCode) {
       setError("Please select a country code.");
       return;
    }
    if (!whatsappPhone || whatsappPhone.length < 5) {
       setError("Please enter a valid WhatsApp number.");
       return;
    }
    setLoading(true);
    try {
      const selected = COUNTRY_CODES.find(c => c.value === whatsappCountryCode);
      const code = selected ? selected.code.replace('+', '') : '';
      await apiClient.post("/api/auth/chat/send-whatsapp-otp", { phoneNumber: `+${code}${whatsappPhone}`, email });
      setStep("whatsapp_otp");
      startWhatsappCountdown();
    } catch (err: any) {
      if (err?.code === "429") {
        // A code was sent to this number under a minute ago and is still valid
        const wait = Number(err?.retryAfter) || whatsappResendWait;
        toast(`We already sent a code to this number. Use that code${wait > 0 ? `, or resend in ${formatCountdown(wait)}` : ""}.`);
        setStep("whatsapp_otp");
        if (!whatsappCountdown) startWhatsappCountdown();
        return;
      }
      setError(err?.message || err?.response?.data?.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyWhatsappOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (whatsappOtp.length !== 6) {
       setError("Please enter a valid 6-digit OTP.");
       return;
    }
    setLoading(true);
    try {
      const selected = COUNTRY_CODES.find(c => c.value === whatsappCountryCode);
      const code = selected ? selected.code.replace('+', '') : '';
      await apiClient.post("/api/auth/chat/verify-whatsapp-otp-step", {
        phone: `+${code}${whatsappPhone}`,
        otp: whatsappOtp
      });
      setStep("age");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!role) {
       setError("Please select a role.");
       return;
    }
    setLoading(true);
    try {
      const selected = COUNTRY_CODES.find(c => c.value === whatsappCountryCode);
      const code = selected ? selected.code.replace('+', '') : '';
      const res = await apiClient.post("/api/auth/chat/finalize-onboarding", {
        email: email.trim(),
        name: `${firstName} ${lastName}`.trim(),
        age: Number(age),
        role,
        whatsappPhone: `+${code}${whatsappPhone}`,
        whatsappOtp,
        emailVerifiedTicket,
      });
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
      }
      clearOnboarding();
      setStep("success");
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save role.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && !urlError)) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (step === ("success" as any)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center p-4 font-sans">
        <Suspense fallback={null}><Confetti width={window.innerWidth} height={window.innerHeight} /></Suspense>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden" style={{ background: "radial-gradient(ellipse at 50% 30%, #1e3a5f 0%, #0a0e1a 50%, #05070d 100%)" }}>
          {/* Starfield */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 60 }).map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-white"
                style={{
                  width: `${Math.random() * 2 + 1}px`,
                  height: `${Math.random() * 2 + 1}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  opacity: Math.random() * 0.5 + 0.1,
                }}
              />
            ))}
          </div>
          {/* Aurora Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(56,142,255,0.3) 0%, rgba(56,142,255,0.1) 40%, transparent 70%)", filter: "blur(80px)" }} />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10 text-center px-6 max-w-xl"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-emerald-400 text-lg font-semibold mb-4 tracking-wide uppercase"
            >
              Setup Complete
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="text-4xl md:text-5xl font-bold text-white mb-10 leading-tight"
            >
              Welcome to Classgrid Agent
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="flex flex-col items-center gap-5 mt-4"
            >
              <button
                onClick={() => window.location.href = "/"}
                className="h-14 px-10 flex items-center justify-center text-base font-semibold rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-sm transition-all duration-300 shadow-lg shadow-blue-500/10 cursor-pointer"
              >
                Start Chatting <ChevronRight className="ml-2 size-5" />
              </button>

            </motion.div>
          </motion.div>
          <style>{`@keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.7; } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground flex flex-col relative font-sans">
      <LoginGridBackground />

      {/* Top Left Logo */}
      {/* Logo goes to the main Classgrid website */}
      {/* The first step shows the icon inside the card instead (Mistral-style) */}
      {step !== "email" && (
        <a href="https://classgrid.in" className="absolute z-10 top-6 left-8 flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="Classgrid Logo" className="w-8 h-8 object-contain" />
        </a>
      )}

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">

        {/* Flat white card on the grid (no border, shadow or rounding) */}
        <div className={`w-full bg-white text-slate-900 dark:bg-[#141414] dark:text-[#f1f1f1] max-w-[440px] px-6 py-8 sm:px-10 sm:py-10`}>
          


          {/* Show OAuth error from URL (e.g. OAuthCallback) */}
          {friendlyUrlError && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400">
              {friendlyUrlError}
            </div>
          )}

          {/* Custom Unsubscribe Banner */}
          {intent === "unsubscribe" && typeDisplay && !friendlyUrlError && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-[13.5px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400 font-medium">
              You need to log in to unsubscribe from {typeDisplay} updates.
            </div>
          )}



          {step === "otp_verified" ? (
            <div className="flex flex-col items-center justify-center space-y-8 animate-in fade-in zoom-in-95 duration-300 py-4">
                 <div 
                   className="flex flex-col items-center justify-center gap-3"
                   style={{ animation: "popIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)" }}
                 >
                   <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                     <Check className="h-8 w-8" strokeWidth={3} />
                   </div>
                   <div className="text-center space-y-1">
                     <p className="text-[15px] font-semibold text-emerald-600 dark:text-emerald-500">OTP Verified Successfully</p>
                     <p className="text-[13px] font-medium text-slate-500 dark:text-[#888888]">{email}</p>
                   </div>
                 </div>
                 
                 <div className="w-full space-y-3">
                   <p className="text-center text-[13px] text-slate-500 dark:text-[#888888]">
                     Please set up a password for future logins.
                   </p>
                   <button
                     onClick={() => setStep("password")}
                     className="flex w-full items-center justify-center rounded-md bg-slate-900 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
                   >
                     Setup Password
                   </button>
                 </div>
            </div>
          ) : step === "password" ? (
            <form onSubmit={handleSetupPassword} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">New Password</label>
                <div className="relative mt-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    maxLength={64}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className={`w-full h-12 rounded-xl border bg-white px-4 pr-12 text-sm text-slate-900 transition-all outline-none placeholder:text-slate-400 dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] ${current.border} ${current.glow}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-[#888] dark:hover:text-[#f1f1f1] transition-colors focus:outline-none focus:ring-0 border-none"
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>

                  {isPasswordFocused && password.length >= 2 && (
                    <div className="absolute left-[calc(100%+16px)] top-1/2 z-50 w-[240px] -translate-y-1/2 rounded-xl border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] p-4 shadow-xl hidden md:block">
                      <div className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-b border-l border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e]" />
                      <p className="text-[13px] font-semibold text-slate-900 dark:text-white">Password must contain:</p>
                      <ul className="mt-2 flex flex-col gap-1 text-[12px] text-slate-500 dark:text-gray-300">
                        <li className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.minLength ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-500"}`} />
                          Between 8 and 64 characters
                        </li>
                        <li className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.uppercase && passwordRules.lowercase ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-500"}`} />
                          Uppercase & lowercase letters
                        </li>
                        <li className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.number ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-500"}`} />
                          At least 1 number
                        </li>
                        <li className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${passwordRules.special ? "bg-emerald-500" : "bg-gray-400 dark:bg-gray-500"}`} />
                          At least 1 special character
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                {password && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div className={`h-full rounded-full transition-all duration-300 ${current.bar}`} />
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Confirm Password</label>
                <div className="relative mt-3">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    maxLength={64}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full h-12 rounded-xl border bg-white px-4 pr-12 text-sm text-slate-900 transition-all outline-none placeholder:text-slate-400 dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] ${confirmBorder}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:text-[#888] dark:hover:text-[#f1f1f1] transition-colors focus:outline-none focus:ring-0 border-none"
                  >
                    {showConfirmPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {isConfirmTouched && (
                  <p className={`mt-2 text-xs font-semibold ${isPasswordMatch ? "text-emerald-500" : "text-red-500"}`}>
                    {isPasswordMatch ? "Passwords match" : "Passwords do not match"}
                  </p>
                )}
              </div>

              {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center rounded-md bg-slate-900 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
              >
                {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Saving...</> : "Save Password"}
              </button>
            </form>
          ) : step === "whatsapp" ? (
            // Own key per step: otherwise React reuses the code screen's elements, and a click on "Back"
            // finishes as a click on this form's submit button (it re-sent the OTP and jumped back).
            <form key="whatsapp" onSubmit={handleSendWhatsappOtp} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-1 mb-6">
                 <p className="text-[15px] font-semibold text-slate-900 dark:text-white mb-2">Verify WhatsApp</p>
                 <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-3 mb-4 text-left">
                   <p className="text-[13px] text-emerald-800 dark:text-emerald-300 font-medium mb-3">
                     <span className="font-bold">Step 1:</span> You MUST send a message to our WhatsApp bot to open the chat window before receiving your OTP.
                   </p>
                   <a 
                      href="https://wa.me/918149277038?text=Hi%20Classgrid" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-full bg-emerald-600 text-white rounded-md py-2 text-[13px] font-bold mb-2 hover:bg-emerald-700 transition-colors"
                   >
                     Click Here to Open WhatsApp
                   </a>
                   <p className="text-center text-[11px] text-emerald-800/80 dark:text-emerald-300/80 font-medium mb-3 mt-1">
                     (Or send 'Hi' manually to <span className="font-bold">+91 81492 77038</span>)
                   </p>
                   <p className="text-[13px] text-emerald-800 dark:text-emerald-300 font-medium">
                     <span className="font-bold">Step 2:</span> Enter your number below and click Send OTP!
                   </p>
                 </div>
              </div>
              <div className="space-y-1.5 flex gap-2">
                <div className="w-[100px] shrink-0">
                  <CountryCodePicker value={whatsappCountryCode} onChange={setWhatsappCountryCode} />
                </div>
                <div className="flex-1">
                  <input
                    type="tel"
                    placeholder="WhatsApp Number"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ""))}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:shadow-[0_0_18px_rgba(16,185,129,0.2)] dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] dark:focus:border-emerald-500"
                  />
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || !whatsappPhone}
                className="mt-6 h-12 w-full flex items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#f1f1f1] dark:text-[#111] dark:hover:bg-white"
              >
                {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Sending...</> : "Send OTP"}
              </button>
            </form>
          ) : step === "whatsapp_otp" ? (
            <form key="whatsapp_otp" onSubmit={handleVerifyWhatsappOtp} className="space-y-5 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center gap-3">
                <label className="text-center text-[13px] font-medium text-slate-500 dark:text-[#888888]">
                  Enter the 6-digit code sent to <span className="text-slate-900 dark:text-[#f1f1f1]">{COUNTRY_CODES.find(c => c.value === whatsappCountryCode)?.code} {whatsappPhone}</span>
                </label>
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  value={whatsappOtp}
                  onChange={(val) => setWhatsappOtp(val)}
                  disabled={whatsappOtpExpired}
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={1} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={2} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={3} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={4} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={5} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                  </InputOTPGroup>
                </InputOTP>

                {/* Timer / Resend */}
                <div className="text-[13px] text-center mt-2">
                  {whatsappOtpExpired ? (
                    <span className="text-red-400">Code expired. </span>
                  ) : whatsappCountdown > 0 ? (
                    <span className="text-slate-500 dark:text-[#888888]">
                      Code expires in{" "}
                      <span className={`font-mono font-semibold tabular-nums ${whatsappCountdown <= 10 ? "text-red-400" : "text-slate-900 dark:text-[#f1f1f1]"}`}>
                        {formatCountdown(whatsappCountdown)}
                      </span>
                    </span>
                  ) : null}
                  {" "}
                  <button
                    type="button"
                    onClick={async () => {
                      setError("");
                      setWhatsappOtp("");
                      setLoading(true);
                      try {
                        const selected = COUNTRY_CODES.find(c => c.value === whatsappCountryCode);
                        const code = selected ? selected.code.replace('+', '') : '';
                        await apiClient.post("/api/auth/chat/send-whatsapp-otp", { phoneNumber: `+${code}${whatsappPhone}`, email });
                        startWhatsappCountdown();
                      } catch (err: any) {
                        setError(err?.message || err?.response?.data?.message || "Failed to resend code.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || whatsappResendWait > 0}
                    className="text-slate-900 underline underline-offset-2 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#f1f1f1]"
                  >
                    {whatsappResendWait > 0 ? `Didn't get it? Resend in ${formatCountdown(whatsappResendWait)}` : "Resend code"}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || whatsappOtp.length !== 6 || whatsappOtpExpired}
                className="flex w-full items-center justify-center rounded-md bg-slate-900 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
              >
                {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Verifying...</> : "Verify OTP"}
              </button>
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault(); // Back only goes back to edit the number; it never submits
                  setWhatsappOtp("");
                  setError("");
                  setStep("whatsapp");
                }}
                className="flex w-full items-center justify-center rounded-md border border-slate-200 bg-white py-3 text-sm font-medium text-slate-900 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:hover:bg-[#222]"
              >
                Back
              </button>
            </form>
          ) : step === "age" ? (
            <form onSubmit={handleSetupAge} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-1 mb-6">
                 <p className="text-[15px] font-semibold text-slate-900 dark:text-white">Basic Information</p>
                 <p className="text-[13px] font-medium text-slate-500 dark:text-[#888888]">Please enter your age to continue.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Your Age</label>
                <input
                  type="number"
                  placeholder="Enter your age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:shadow-[0_0_18px_rgba(16,185,129,0.2)] dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] dark:focus:border-emerald-500"
                />
              </div>

              {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 h-12 w-full flex items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#f1f1f1] dark:text-[#111] dark:hover:bg-white"
              >
                {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Saving...</> : "Continue"}
              </button>
            </form>
          ) : step === "role" ? (
            <form onSubmit={handleSetupRole} className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center space-y-1 mb-6">
                 <p className="text-[22px] font-medium tracking-tight text-slate-900 dark:text-[#f1f1f1]">What kind of work do you do?</p>
                 <p className="text-[13px] font-medium text-slate-500 dark:text-[#888888]">Pick a role so Classgrid can tailor your experience.</p>
              </div>
              <div className="space-y-1.5">
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="w-full !h-12 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 transition-all outline-none focus:border-emerald-500 focus-visible:ring-0 focus-visible:border-emerald-500 focus:shadow-[0_0_18px_rgba(16,185,129,0.2)] dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:focus:border-emerald-500" size="default">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => {
                      const Icon = r.icon;
                      return (
                        <SelectItem key={r.value} value={r.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-slate-500 dark:text-[#888]" />
                            <span>{r.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || !role}
                className="mt-6 h-12 w-full flex items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#f1f1f1] dark:text-[#111] dark:hover:bg-white"
              >
                {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Saving...</> : "Continue"}
              </button>
            </form>
          ) : step === "email" ? (
            // Mistral-style first step: icon, left-aligned heading, email, Continue only once something is typed
            <div className="animate-in fade-in duration-300">
              <img src="/logo.png" alt="Classgrid" className="mb-6 h-10 w-10 object-contain" />
              <h1 className="text-[30px] leading-tight font-medium tracking-tight text-slate-900 dark:text-[#f1f1f1]">
                {mode === "signup" ? "Create your account" : greeting.title}
              </h1>
              <p className="mt-2 mb-8 text-[15px] text-slate-600 dark:text-[#9a9a9a]">
                {mode === "signup" ? "Sign up below to get started" : greeting.subtitle}
              </p>
              <form onSubmit={handleSendOTP} className="space-y-4">

              {mode === "signup" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label htmlFor="firstName" className="text-[13px] font-medium text-slate-500 dark:text-[#888888]">First name</label>
                    <input
                      id="firstName"
                      type="text"
                      placeholder="Your first name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] dark:focus:border-[#444] dark:focus:ring-[#444]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lastName" className="text-[13px] font-medium text-slate-500 dark:text-[#888888]">Last name</label>
                    <input
                      id="lastName"
                      type="text"
                      placeholder="Your last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] dark:focus:border-[#444] dark:focus:ring-[#444]"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="email" className="flex items-center gap-2 text-[15px] font-medium text-slate-900 dark:text-[#f1f1f1]">
                    Email
                    {mode === "signin" && lastMethod === "email" && <LastUsedTag />}
                  </label>
                  {mode === "signin" && (
                    <button type="button" onClick={handleForgotPassword} className="text-[15px] text-slate-500 transition-colors hover:text-slate-900 dark:text-[#888] dark:hover:text-[#f1f1f1]">Forgot password?</button>
                  )}
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-lg border border-slate-300 bg-white px-4 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-[0_0_0_4px_rgba(15,23,42,0.06)] transition-all focus:border-slate-500 focus:outline-none focus:shadow-[0_0_0_4px_rgba(15,23,42,0.10)] dark:border-[#333] dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] dark:shadow-[0_0_0_4px_rgba(255,255,255,0.04)] dark:focus:border-[#555]"
                />
              </div>

              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

              {email.trim() && (
                <div className="flex justify-end animate-in fade-in slide-in-from-top-1 duration-200">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 items-center justify-center rounded-lg bg-[#111] px-5 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-black active:scale-[0.98] disabled:opacity-50 dark:bg-[#f1f1f1] dark:text-[#111] dark:hover:bg-white"
                  >
                    {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Continue</> : "Continue"}
                  </button>
                </div>
              )}
            </form>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogle}
                  aria-label="Continue with Google"
                  title="Continue with Google"
                  className="relative flex h-12 items-center justify-center rounded-lg bg-[#f1f1ef] transition-colors duration-200 hover:bg-[#e7e7e4] active:scale-[0.98] dark:bg-[#1f1f1f] dark:hover:bg-[#2a2a2a]"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {lastMethod === "google" && <LastUsedTag className="absolute -top-2 right-2" />}
                </button>
                <button
                  type="button"
                  onClick={handleGithub}
                  aria-label="Continue with GitHub"
                  title="Continue with GitHub"
                  className="relative flex h-12 items-center justify-center rounded-lg bg-[#f1f1ef] text-slate-900 transition-colors duration-200 hover:bg-[#e7e7e4] active:scale-[0.98] dark:bg-[#1f1f1f] dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  {lastMethod === "github" && <LastUsedTag className="absolute -top-2 right-2" />}
                </button>
              </div>
            </div>
          ) : step === "login_password" ? (
            <div className="animate-in fade-in duration-300">
              <div className="mb-6 space-y-1 text-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-[#f1f1f1]">Enter Password</h3>
                <p className="text-sm text-slate-500 dark:text-[#888888] flex items-center justify-center gap-1">
                  {email}
                  <button type="button" onClick={() => setStep("email")} className="text-blue-600 hover:underline dark:text-blue-400">
                    Change
                  </button>
                </p>
              </div>
              <form onSubmit={handleLoginWithPassword} className="space-y-4">
                <div className="space-y-1.5 mt-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-[13px] font-medium text-slate-500 dark:text-[#888888]">Password</label>
                    <button type="button" onClick={handleForgotPassword} className="text-[13px] font-medium text-slate-600 hover:text-slate-900 dark:text-[#888888] dark:hover:text-[#f1f1f1]">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1] dark:placeholder:text-[#555] dark:focus:border-[#444] dark:focus:ring-[#444]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-red-400 text-sm font-medium">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 flex w-full items-center justify-center rounded-md bg-slate-900 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
                >
                  {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Signing in...</> : "Sign in"}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <label className="text-center text-[13px] font-medium text-slate-500 dark:text-[#888888]">
                  Enter the 6-digit code sent to <span className="text-slate-900 dark:text-[#f1f1f1]">{email}</span>
                </label>
                <InputOTP
                  maxLength={6}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  value={otp}
                  onChange={(val) => setOtp(val)}
                  disabled={otpExpired}
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={1} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={2} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={3} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={4} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                    <InputOTPSlot index={5} className="h-12 w-10 rounded-md border-slate-200 bg-white text-lg font-medium text-slate-900 dark:border-[#2a2a2a] dark:bg-[#161616] dark:text-[#f1f1f1]" />
                  </InputOTPGroup>
                </InputOTP>

                {/* Timer / Resend */}
                <div className="text-[13px] text-center">
                  {otpExpired ? (
                    <span className="text-red-400">Code expired. </span>
                  ) : countdown > 0 ? (
                    <span className="text-slate-500 dark:text-[#888888]">
                      Code expires in{" "}
                      <span className={`font-mono font-semibold tabular-nums ${countdown <= 10 ? "text-red-400" : "text-slate-900 dark:text-[#f1f1f1]"
                        }`}>
                        {formatCountdown(countdown)}
                      </span>
                    </span>
                  ) : null}
                  {" "}
                  <button
                    type="button"
                    onClick={async () => {
                      setError("");
                      setOtp("");
                      setLoading(true);
                      try {
                        if (deviceOtpMode) await resendDeviceOtp(email.trim());
                        else await apiClient.post("/api/auth/chat/send-email-otp", { email: email.trim() });
                        startCountdown();
                      } catch (err: any) {
                        setError(err?.response?.data?.message || err.message || "Failed to resend code.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading || resendWait > 0}
                    className="text-slate-900 underline underline-offset-2 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#f1f1f1]"
                  >
                    {resendWait > 0 ? `Didn't get it? Resend in ${formatCountdown(resendWait)}` : "Resend code"}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

              <button
                type="submit"
                disabled={loading || otp.length !== 6 || otpExpired}
                className="flex w-full items-center justify-center rounded-md bg-slate-900 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
              >
                {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Sign In</> : "Sign In"}
              </button>

              <button
                type="button"
                onClick={() => { setStep("email"); setDeviceOtpMode(false); if (timerRef.current) clearInterval(timerRef.current); }}
                className="w-full text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-[#888888] dark:hover:text-[#f1f1f1]"
              >
                Back to email
              </button>
            </form>
          )}

          {step === "email" && searchParams.get("next") !== "/support/ticket" && intent !== "unsubscribe" && (
            <div className="mt-8 text-center text-[13px]">
              {mode === "signin" ? (
                <span className="text-slate-500 dark:text-[#888888]">
                  Don&apos;t have an account?{" "}
                  <button onClick={() => setMode("signup")} className="font-medium text-slate-900 transition-colors hover:underline dark:text-[#f1f1f1]">
                    Sign up
                  </button>
                </span>
              ) : (
                <span className="text-slate-500 dark:text-[#888888]">
                  Already have an account?{" "}
                  <button onClick={() => setMode("signin")} className="font-medium text-slate-900 transition-colors hover:underline dark:text-[#f1f1f1]">
                    Sign in
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

      </div>

      <div className="relative z-10 w-full pb-6 pt-2 text-center">
        <p className="text-[13px] text-slate-400 dark:text-[#666666]">
          <a href="https://classgrid.in/terms" target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-slate-300 transition-colors hover:text-slate-900 dark:decoration-[#444] dark:hover:text-[#f1f1f1]">Terms of Service</a>
          {" "}and{" "}
          <a href="https://classgrid.in/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-slate-300 transition-colors hover:text-slate-900 dark:decoration-[#444] dark:hover:text-[#f1f1f1]">Privacy Policy</a>
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popIn {
          0% { transform: scale(0.8) translateY(10px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}} />
    </div>
  );
}

export function PublicChatLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background text-foreground flex items-center justify-center"><Spinner className="w-6 h-6 text-muted-foreground" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
