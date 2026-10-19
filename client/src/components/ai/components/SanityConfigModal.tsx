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
import React, { useState } from "react";
import { X, Database, Key, AlertCircle } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { Spinner } from "@/components/marketing_ui/spinner";
import { fetchWithRescue } from "@/lib/rescue";
import { motion } from "framer-motion";

interface SanityConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  backendUrl: string;
}

export function SanityConfigModal({ isOpen, onClose, onSuccess, backendUrl }: SanityConfigModalProps) {
  const [projectId, setProjectId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !apiToken) {
      toast.error("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetchWithRescue(backendUrl + "/api/sanity/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, apiToken }),
        credentials: "include"
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Sanity credentials verified successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(data.message || "Failed to verify Sanity credentials. Check your API keys.");
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
            <h2 className="text-xl font-bold text-foreground">Connect Sanity CMS</h2>
            <p className="text-sm text-muted-foreground mt-1">Enter your Sanity Project ID and API Token</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-4 rounded-lg flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Requires Sanity Admin Access</p>
              <p>You must have an active Sanity CMS project. Provide the Project ID and an Editor API Token to enable full read/write capabilities.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                Project ID
              </label>
              <Input 
                placeholder="e.g. b5v7xyz" 
                value={projectId} 
                onChange={(e) => setProjectId(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                API Token
              </label>
              <Input 
                placeholder="sk..." 
                type="password"
                value={apiToken} 
                onChange={(e) => setApiToken(e.target.value)}
                className="font-mono text-sm"
              />
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
