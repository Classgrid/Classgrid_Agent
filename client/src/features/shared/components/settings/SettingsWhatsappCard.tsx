// Settings > Account > Verify WhatsApp number (owner, 2026-11-16): WhatsApp verification is optional at sign-up
// (Skip), so an account without a number verifies it here whenever the person wants, with the same steps sign-up
// shows. Once a number is verified this card goes and the number shows in the Profile (where it can be changed).
import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/marketing_ui/button";
import { apiClient } from "@/lib/apiClient";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { WHATSAPP_HELLO_TEXT, WHATSAPP_HELP_NUMBER_SHOWN, normalizeWhatsappInput, whatsappHelloLink } from "@/lib/whatsappVerify";

export function SettingsWhatsappCard() {
  const { data: profileData, isLoading } = useUserProfile();
  const queryClient = useQueryClient();
  const [number, setNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const meta = (profileData as any)?.metadata || {};
  // Only for an account with no verified number (the Profile shows and changes a verified one)
  if (isLoading || meta.whatsapp_number || meta.whatsappPhone) return null;

  const sendOtp = async () => {
    const digits = normalizeWhatsappInput(number);
    if (!digits) return toast.error("Please enter a valid WhatsApp number with country code.");
    setBusy(true);
    try {
      await apiClient.post("/api/user/send-whatsapp-otp", { phoneNumber: digits });
      setOtpSent(true);
      toast.success("OTP sent to WhatsApp!");
    } catch (error: any) {
      toast.error(error?.message || error?.response?.data?.message || "Failed to send OTP");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!otp.trim()) return toast.error("Please enter the OTP");
    setBusy(true);
    try {
      await apiClient.post("/api/user/verify-whatsapp-otp", { otp: otp.trim() });
      toast.success("WhatsApp number verified!");
      setOtpSent(false);
      setOtp("");
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (error: any) {
      toast.error(error?.message || error?.response?.data?.message || "Invalid OTP");
    } finally {
      setBusy(false);
    }
  };

  const field = "h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed";

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm mb-6">
      <div className="p-5 border-b border-border">
        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
          <MessageCircle size={18} className="text-foreground" /> Verify WhatsApp number
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Used for AI scheduling and important platform notifications.</p>
      </div>
      <div className="p-5 flex flex-col gap-4">
        <ol className="text-sm text-foreground space-y-2 list-decimal pl-5">
          <li>
            Send <span className="font-semibold">"{WHATSAPP_HELLO_TEXT}"</span> to our WhatsApp number{" "}
            <span className="font-semibold">{WHATSAPP_HELP_NUMBER_SHOWN}</span>, so WhatsApp can deliver your code.{" "}
            <a href={whatsappHelloLink()} target="_blank" rel="noopener noreferrer" className="underline font-medium">
              Open WhatsApp
            </a>
          </li>
          <li>Enter your WhatsApp number with its country code (India: +91) and click Send OTP.</li>
          <li>Your 6-digit code arrives in that WhatsApp chat within a few seconds. Enter it here.</li>
        </ol>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="tel"
            className={`${field} flex-1 min-w-[220px]`}
            placeholder="e.g. 919876543210 (include country code)"
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
              setOtpSent(false);
            }}
            disabled={busy || otpSent}
            aria-label="WhatsApp number"
          />
          {!otpSent && (
            <Button type="button" onClick={sendOtp} disabled={busy || !number.trim()}>
              {busy ? "Sending..." : "Send OTP"}
            </Button>
          )}
        </div>
        {otpSent && (
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className={`${field} flex-1 min-w-[160px]`}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength={6}
              inputMode="numeric"
              aria-label="WhatsApp code"
            />
            <Button type="button" onClick={verify} disabled={busy || otp.length !== 6}>
              {busy ? "Verifying..." : "Verify OTP"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setOtpSent(false); setOtp(""); }} disabled={busy}>
              Cancel
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">The code is valid for 10 minutes. You can ask for a new one after 60 seconds.</p>
      </div>
    </div>
  );
}
