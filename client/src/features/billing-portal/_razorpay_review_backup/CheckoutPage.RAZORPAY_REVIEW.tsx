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

import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { Spinner } from "@/components/marketing_ui/spinner";

const OTP_TTL_SECONDS = 60;

// Demo mode flag — name/email fields only show in demo
const IS_DEMO = true; // Hardcoded for live test. Set false for production.

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function CheckoutPage() {
  const location = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "invalid" | "success">("loading");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [email, setEmail] = useState("");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  
  // Receipt data for success screen
  const [receiptData, setReceiptData] = useState<{
    name: string; email: string; amount: string; txnId: string; paidAt: string;
  } | null>(null);
  
  const [countdown, setCountdown] = useState(0);
  const [otpExpired, setOtpExpired] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    // Better approach: Read from localStorage or cross-subdomain cookie instead of ugly URL params
    const localTheme = localStorage.getItem("vite-ui-theme");
    const themeCookie = document.cookie.split('; ').find(row => row.startsWith('theme='))?.split('=')[1];
    const themeToUse = themeCookie || localTheme;

    if (themeToUse === "dark") {
      document.documentElement.classList.add("dark");
    } else if (themeToUse === "light") {
      document.documentElement.classList.remove("dark");
    }

    const searchParams = new URLSearchParams(location.search);
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setStatus("invalid");
      return;
    }
    setToken(tokenParam);
    apiClient.get(`/api/billing/checkout/session?token=${tokenParam}`)
      .then((res) => {
        if (res.data?.success) {
          setStatus("ready");
          setEmail(res.data.data?.maskedEmail || res.data.email || "your registered email");
          startCountdown();
        } else {
          setStatus("invalid");
        }
      })
      .catch(() => {
        setStatus("invalid");
      });
      
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [location.search]);

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (IS_DEMO && !payerName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (IS_DEMO && (!payerEmail.trim() || !/\S+@\S+\.\S+/.test(payerEmail))) {
      setError("Please enter a valid email address");
      return;
    }
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post("/api/billing/checkout/verify-otp", {
        token,
        otp,
        payerName: payerName.trim(),
        payerEmail: payerEmail.trim()
      });
      const { 
        razorpay_order_id, 
        razorpay_key_id, 
        amountPaise: amount, 
        currency, 
        email: customerEmail, 
        return_url 
      } = response.data.data || response.data;
      
      const options = {
        key: razorpay_key_id,
        amount,
        currency,
        name: "Classgrid",
        description: "SaaS Subscription Payment",
        image: "https://billing.classgrid.in/logo.png",
        order_id: razorpay_order_id,
        handler: async function (response: any) {
          try {
            toast.loading("Verifying payment...", { id: "payment-verify" });
            const confirmRes = await apiClient.post("/api/billing/checkout/confirm", {
              token,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success("Payment verified!", { id: "payment-verify" });
            // Store receipt data for the success screen
            const now = new Date();
            setReceiptData({
              name: payerName,
              email: payerEmail,
              amount: `₹${(amount / 100).toFixed(0)}`,
              txnId: confirmRes.data?.data?.providerPaymentId || response.razorpay_payment_id,
              paidAt: now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' - ' + now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
            });
            setStatus("success");
          } catch (confirmError) {
            console.error("Confirmation error", confirmError);
            toast.error("Payment verification failed. Please contact support.", { id: "payment-verify" });
          }
        },
        prefill: { email: customerEmail },
        theme: { 
          // Our app background stays exactly the same.
          // Razorpay's modal body doesn't have a true dark mode, but we match the header to our theme.
          color: document.documentElement.classList.contains("dark") ? "#0f172a" : "#000000" 
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        console.error(response.error);
        toast.error(response.error.description || "Payment failed");
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || "Invalid OTP or session expired.");
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Spinner className="w-6 h-6 text-muted-foreground" />
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background text-foreground flex flex-col items-center justify-center text-center p-6 font-sans">
        <h2 className="text-2xl font-bold mb-2">Payment Completed or Link Expired</h2>
        <p className="text-muted-foreground mb-6">This checkout link is no longer valid.</p>
        <button onClick={() => window.history.back()} className="h-12 rounded-xl bg-slate-900 px-6 font-semibold text-white transition hover:brightness-110 dark:bg-[#2a2a2a]">
          Go Back
        </button>
      </main>
    );
  }

  if (status === "success") {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground flex items-center justify-center p-4">
        {/* Confetti or subtle background */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_45%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:42px_42px] [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_95%)]" />
        </div>

        <section className="w-full max-w-lg">
          <div className="rounded-3xl border border-border/70 bg-background/90 p-8 sm:p-10 shadow-[0_20px_70px_-35px_rgba(16,185,129,0.35)] backdrop-blur-md flex flex-col items-center text-center">
            
            <style dangerouslySetInnerHTML={{ __html: `
              .animate-spin-once { animation: spinOnce 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
              @keyframes spinOnce {
                0% { transform: rotate(0deg); opacity: 1; border-width: 3px; }
                70% { transform: rotate(720deg); border-width: 3px; opacity: 1; }
                100% { transform: rotate(900deg); opacity: 0; border-width: 0px; }
              }
              .animate-pop-in {
                animation: popIn 0.55s cubic-bezier(0.34, 1.2, 0.64, 1) 0.75s forwards;
                transform: scale(0); opacity: 0;
              }
              @keyframes popIn {
                0% { transform: scale(0); opacity: 0; }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); opacity: 1; }
              }
              .animate-fade-up { animation: fadeUp 0.5s ease-out 0.2s both; }
              @keyframes fadeUp {
                from { opacity: 0; transform: translateY(12px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}} />

            <div className="relative flex h-24 w-24 items-center justify-center mb-6">
              <div className="animate-spin-once absolute inset-0 box-border rounded-full border-[3px] border-b-emerald-500/20 border-l-emerald-500/10 border-r-emerald-500 border-t-emerald-500"></div>
              <div className="animate-pop-in absolute inset-0 flex items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 shadow-[0_10px_20px_-5px_rgba(16,185,129,0.4)]">
                  <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="animate-fade-up space-y-4 w-full">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-500">
                Payment Successful
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Transaction Complete
              </h1>

              {/* Receipt Details */}
              {receiptData && (
                <div className="mt-4 w-full rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-5 text-left space-y-2 text-sm">
                  <div className="flex justify-between items-center border-b border-emerald-500/20 pb-2 mb-3">
                    <span className="font-bold text-foreground">Receipt</span>
                    <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{receiptData.txnId}</span>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-muted-foreground">
                    <span className="font-semibold text-foreground">Name:</span><span>{receiptData.name}</span>
                    <span className="font-semibold text-foreground">Email:</span><span>{receiptData.email}</span>
                    <span className="font-semibold text-foreground">Amount:</span><span className="font-semibold text-emerald-600 dark:text-emerald-400">{receiptData.amount}</span>
                    <span className="font-semibold text-foreground">Paid at:</span><span>{receiptData.paidAt}</span>
                  </div>
                </div>
              )}

              <p className="text-muted-foreground text-sm leading-relaxed">
                A confirmation email has been sent. You can now close this tab.
              </p>
            </div>

          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative font-sans checkout-otp-container" style={{ "--ring": "#444444", "--color-ring": "#444444" } as any}>
      <style>{`
        .checkout-otp-container *:focus-visible,
        .checkout-otp-container *:focus {
          outline: none !important;
          box-shadow: none !important;
          --tw-ring-color: transparent !important;
          --tw-ring-shadow: none !important;
        }
        /* Only target the hidden OTP input, NOT the name/email inputs */
        .checkout-otp-container .otp-hidden-input,
        .checkout-otp-container .otp-hidden-input:focus,
        .checkout-otp-container .otp-hidden-input:focus-visible {
          border: none !important;
          background: transparent !important;
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      
      {/* Top Left Logo - exactly like marketing */}
      <Link to="/" className="absolute top-6 left-8 flex items-center gap-1.5 hover:opacity-80 transition-opacity">
        <img src="/logo.png" alt="Classgrid Logo" className="h-10 w-auto object-contain" />
        <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-[#f1f1f1]">Classgrid</span>
      </Link>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        
        <div className="w-full max-w-[400px]">
          
          <div className="mb-8 text-center space-y-1">
            <h1 className="text-3xl font-medium tracking-tight text-slate-900 dark:text-[#f1f1f1]">Complete Checkout</h1>
            <p className="text-[14px] text-slate-500 dark:text-[#888888]">Enter your details and the verification code to proceed.</p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-5">
            {/* Name & Email inputs — only visible in demo/test mode */}
            {IS_DEMO && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-[#ccc] mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    placeholder="e.g. Nikhil Sharma"
                    className="w-full rounded-md border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#161616] px-3 py-2.5 text-sm text-slate-900 dark:text-[#f1f1f1] placeholder:text-slate-400 dark:placeholder:text-[#555] transition focus:border-slate-400 dark:focus:border-[#555]"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-[#ccc] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="e.g. admin@institution.edu"
                    className="w-full rounded-md border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#161616] px-3 py-2.5 text-sm text-slate-900 dark:text-[#f1f1f1] placeholder:text-slate-400 dark:placeholder:text-[#555] transition focus:border-slate-400 dark:focus:border-[#555]"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col items-center gap-3">
              <label className="block text-[13px] font-medium text-slate-700 dark:text-[#ccc] self-start">Verification Code</label>
              {/* Custom OTP implementation - click anywhere in the box area to focus */}
              <div
                className="relative flex items-center gap-2 cursor-text"
                dir="ltr"
                onClick={() => {
                  const otpInput = document.getElementById('otp-hidden-input');
                  if (otpInput) otpInput.focus();
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((index) => {
                  const isActive = otp.length === index;
                  return (
                    <div
                      key={index}
                      className={`relative flex h-12 w-10 items-center justify-center rounded-md border text-lg font-medium transition-all ${
                        isActive
                          ? "border-slate-400 dark:border-[#555] z-10"
                          : "border-slate-200 dark:border-[#2a2a2a] hover:border-slate-300 dark:hover:border-[#3a3a3a]"
                      } bg-white text-slate-900 dark:bg-[#161616] dark:text-[#f1f1f1]`}
                    >
                      {otp[index] || ""}
                      {isActive && !otpExpired && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="h-4 w-px animate-pulse bg-slate-900 dark:bg-[#f1f1f1]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <input 
                id="otp-hidden-input"
                type="text" 
                value={otp} 
                onChange={(e) => {
                  const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
                  setOtp(val);
                }}
                onFocus={() => {}}
                disabled={otpExpired}
                className="otp-hidden-input"
                style={{ position: 'absolute', opacity: 0, width: '240px', height: '48px', marginTop: '-48px', zIndex: 30, outline: 'none', border: 'none', boxShadow: 'none', cursor: 'text' }}
              />

              {/* Timer / Resend */}
              <div className="text-[13px] text-center">
                {otpExpired ? (
                  <span className="text-red-400">Code expired. </span>
                ) : countdown > 0 ? (
                  <span className="text-slate-500 dark:text-[#888888]">
                    Code expires in{" "}
                    <span className={`font-mono font-semibold tabular-nums ${
                      countdown <= 10 ? "text-red-400" : "text-slate-900 dark:text-[#f1f1f1]"
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
                      await apiClient.post("/api/billing/handoff/resend-otp", { token });
                      startCountdown();
                    } catch (err: any) {
                      setError(err.response?.data?.error || "Failed to resend");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || (countdown > 0 && !otpExpired)}
                  className="text-slate-900 underline underline-offset-2 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-30 dark:text-[#f1f1f1]"
                >
                  Resend code
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm font-medium text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || otpExpired}
              className="flex w-full items-center justify-center rounded-md bg-slate-900 py-3 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50 dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
            >
              {loading ? <><Spinner className="w-4 h-4 text-inherit mr-2" /> Verify & Pay</> : "Verify & Pay"}
            </button>
          </form>

        </div>

      </div>

      <div className="absolute bottom-6 w-full text-center">
        <p className="text-[13px] text-slate-400 dark:text-[#666666]">
          <a href="https://classgrid.in/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-slate-300 transition-colors hover:text-slate-900 dark:decoration-[#444] dark:hover:text-[#f1f1f1]">Terms of Service</a>
          {" "}and{" "}
          <a href="https://classgrid.in/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-slate-300 transition-colors hover:text-slate-900 dark:decoration-[#444] dark:hover:text-[#f1f1f1]">Privacy Policy</a>
        </p>
      </div>

    </div>
  );
}
