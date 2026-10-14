// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useState } from "react";
import { X, Smartphone, Key, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Spinner } from "@/components/marketing_ui/spinner";
import { motion } from "framer-motion";
import { fetchWithRescue } from "@/lib/rescue";

interface WhatsappConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  backendUrl: string;
}

export function WhatsappConfigModal({ isOpen, onClose, onSuccess, backendUrl }: WhatsappConfigModalProps) {
  const [phoneId, setPhoneId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneId || !accessToken || !verifyToken) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchWithRescue(backendUrl + "/api/whatsapp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneId, accessToken, verifyToken }),
        credentials: "include"
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("WhatsApp Meta credentials verified successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(data.message || "Failed to verify Meta credentials. Check your API keys.");
      }
    } catch (err) {
      toast.error("Network error while verifying credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div>
            <h2 className="text-xl font-bold text-foreground">Connect WhatsApp Business API</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your Meta Developer App credentials</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-lg flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Requires Meta Developer Account</p>
              <p>You must have a registered WhatsApp Business App in the Meta Developer Console. The Phone Number ID and System User Access Token must have permissions to send messages.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                Phone Number ID
              </label>
              <Input 
                placeholder="e.g. 10459385938..." 
                value={phoneId} 
                onChange={(e) => setPhoneId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                Permanent Access Token (System User)
              </label>
              <Input 
                placeholder="EAAI..." 
                type="password"
                value={accessToken} 
                onChange={(e) => setAccessToken(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Webhook Verify Token
              </label>
              <Input 
                placeholder="Create a secret string (e.g. classgrid_webhook_secret)" 
                type="password"
                value={verifyToken} 
                onChange={(e) => setVerifyToken(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">You will enter this exact string in your Meta Webhook setup.</p>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isLoading ? <Spinner className="w-4 h-4 mr-2" /> : null}
                Verify & Connect
              </Button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
