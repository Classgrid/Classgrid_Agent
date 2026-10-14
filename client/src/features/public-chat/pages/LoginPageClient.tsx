import { Link } from "react-router-dom";
import { Github, Linkedin, Mail } from "lucide-react";
import { useState } from "react";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/marketing_ui/input-otp";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { fetchWithRescue } from "@/lib/rescue";
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

type LoginPageClientProps = {
  initialNext: string;
  redirectDiscourse: boolean;
};

const signIn = async (p: any, o: any) => { console.log("Mock signIn", p, o); return { ok: true, error: null }; };

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 3.5 14.7 2.6 12 2.6A9.4 9.4 0 0 0 2.6 12 9.4 9.4 0 0 0 12 21.4c5.4 0 9-3.8 9-9.1 0-.6-.1-1.1-.2-1.6H12Z"
      />
      <path
        fill="#34A853"
        d="M2.6 7.6 5.8 10c.9-2.6 3.3-4.4 6.2-4.4 1.9 0 3.2.8 3.9 1.5l2.6-2.5C16.9 3.5 14.7 2.6 12 2.6c-3.6 0-6.8 2-8.4 5Z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.4c2.6 0 4.8-.9 6.4-2.4l-3-2.4c-.8.6-1.9 1.1-3.4 1.1-3.9 0-5.2-2.6-5.5-3.9L3.3 16c1.5 3.1 4.7 5.4 8.7 5.4Z"
      />
      <path
        fill="#4285F4"
        d="M21 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.1 2.5-2.1 3.3l3 2.4c1.8-1.7 2.8-4.2 2.8-7Z"
      />
    </svg>
  );
}

function SocialButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-secondary/30 px-4 text-sm font-semibold text-foreground transition",
        "hover:border-primary/40 hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function mapLoginError(code?: string) {
  switch (code) {
    case "missing":
      return "That code is no longer valid. Request a fresh one and try again.";
    case "missing_otp":
      return "Enter the 6-digit code we emailed you.";
    case "expired":
      return "That code expired. Request a fresh one and try again.";
    case "attempts_exceeded":
      return "Too many incorrect attempts. Request a new code to continue.";
    case "invalid":
      return "That code did not match. Please try again.";
    case "rate_limited":
      return "Too many sign-in attempts. Please wait a bit and try again.";
    default:
      return "We couldn't sign you in. Please try again.";
  }
}

export default function LoginPageClient({
  initialNext,
  redirectDiscourse,
}: LoginPageClientProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [providerLoading, setProviderLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = initialNext || "/";

  async function handleProviderSignIn(provider: "google" | "github" | "linkedin") {
    try {
      setProviderLoading(provider);
      setError(null);
      setMessage(null);
      await signIn(provider, { redirectTo });
    } finally {
      setProviderLoading(null);
    }
  }

  async function handleSendOtp() {
    setSendingOtp(true);
    setError(null);
    setMessage(null);

    try {
      if (!email.trim()) {
        setError("Enter your email address to continue.");
        return;
      }

      if (mode === "signup" && (!firstName.trim() || !lastName.trim())) {
        setError("Enter your first and last name to create your forum account.");
        return;
      }

      const response = await fetchWithRescue("/api/forum/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          intent: mode,
          firstName,
          lastName,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't send your login code.",
        );
        return;
      }

      setOtp("");
      setOtpSent(true);
      setMessage("Your 6-digit login code is on its way.");
    } catch (sendError) {
      console.error("OTP send failed:", sendError);
      setError("We couldn't send your login code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleVerifyOtp() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const result: any = await signIn("credentials", {
        email,
        otp,
        intent: mode,
        firstName,
        lastName,
        redirect: false,
        redirectTo,
      });

      if (!result?.ok) {
        setError(mapLoginError(result?.code || result?.error));
        return;
      }

      window.location.href = result.url || redirectTo;
    } catch (signInError) {
      console.error("OTP sign-in failed:", signInError);
      setError("We couldn't complete your sign-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.18),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <div className="px-6 pt-6 sm:px-8 sm:pt-8">
          <Link
            to="/"
            className="inline-flex items-center text-xl font-black tracking-tighter text-foreground"
          >
            CLASSGRID.
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[460px]">
            <div className="rounded-2xl border border-border bg-card/90 shadow-[0_30px_100px_rgba(0,0,0,0.38)] backdrop-blur-sm">
              <div className="p-8 sm:p-10">
                <div className="mb-8 space-y-3">
                  {redirectDiscourse ? (
                    <div className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      Community Access
                    </div>
                  ) : null}
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-[2.1rem]">
                      Welcome to Classgrid
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-[15px]">
                      {redirectDiscourse
                        ? "Sign in to continue to the Classgrid Community."
                        : "Unified ERP infrastructure for modern institutions"}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <SocialButton
                    disabled={Boolean(providerLoading || sendingOtp || submitting)}
                    onClick={() => handleProviderSignIn("google")}
                  >
                    <GoogleMark />
                    <span>
                      {providerLoading === "google"
                        ? "Connecting to Google..."
                        : "Continue with Google"}
                    </span>
                  </SocialButton>

                  <SocialButton
                    disabled={Boolean(providerLoading || sendingOtp || submitting)}
                    onClick={() => handleProviderSignIn("github")}
                  >
                    <Github className="h-5 w-5" />
                    <span>
                      {providerLoading === "github"
                        ? "Connecting to GitHub..."
                        : "Continue with GitHub"}
                    </span>
                  </SocialButton>

                  <SocialButton
                    disabled={Boolean(providerLoading || sendingOtp || submitting)}
                    onClick={() => handleProviderSignIn("linkedin")}
                  >
                    <Linkedin className="h-5 w-5 text-sky-400" />
                    <span>
                      {providerLoading === "linkedin"
                        ? "Connecting to LinkedIn..."
                        : "Continue with LinkedIn"}
                    </span>
                  </SocialButton>
                </div>

                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    or
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="space-y-5">
                  {mode === "signup" ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          First name
                        </label>
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          placeholder="Your first name"
                          autoComplete="given-name"
                          className="h-12 w-full rounded-xl border border-input bg-background/70 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Last name
                        </label>
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          placeholder="Your last name"
                          autoComplete="family-name"
                          className="h-12 w-full rounded-xl border border-input bg-background/70 px-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/25"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="Your email address"
                        autoComplete="email"
                        disabled={otpSent}
                        className="h-12 w-full rounded-xl border border-input bg-background/70 pl-11 pr-4 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-70"
                      />
                    </div>
                  </div>

                  {otpSent ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Enter your code
                        </label>
                        <InputOTP
                          maxLength={6}
                          value={otp}
                          onChange={setOtp as any}
                          pattern="\d*"
                          containerClassName="w-full"
                        >
                          <InputOTPGroup className="w-full justify-between gap-2">
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                className="h-12 w-full rounded-xl border border-input bg-background/80 text-base font-semibold data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/25"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => {
                            setOtpSent(false);
                            setOtp("");
                            setMessage(null);
                            setError(null);
                          }}
                          className="font-medium text-muted-foreground transition hover:text-foreground"
                        >
                          Change email
                        </button>
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={sendingOtp || submitting}
                          className="font-medium text-primary transition hover:text-primary/80 disabled:opacity-60"
                        >
                          {sendingOtp ? "Resending..." : "Resend code"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {error ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </p>
                  ) : null}

                  {message ? (
                    <p className="rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                      {message}
                    </p>
                  ) : null}

                  {otpSent ? (
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={submitting || otp.length !== 6}
                      className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Signing In..." : "Sign In"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={sendingOtp || submitting}
                      className="h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingOtp ? "Sending code..." : "Continue"}
                    </button>
                  )}
                </div>

                <div className="mt-8 text-center text-sm text-muted-foreground">
                  {mode === "signin"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(mode === "signin" ? "signup" : "signin");
                      setOtpSent(false);
                      setOtp("");
                      setError(null);
                      setMessage(null);
                    }}
                    className="font-semibold text-foreground transition hover:text-primary"
                  >
                    {mode === "signin" ? "Sign up" : "Sign in"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-7 text-center text-sm text-muted-foreground">
              <Link to="/privacy" className="transition hover:text-foreground">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link to="/terms" className="transition hover:text-foreground">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
