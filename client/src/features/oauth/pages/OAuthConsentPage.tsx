// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ShieldCheck, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

const backendUrl = import.meta.env.VITE_API_URL || "https://api.classgrid.in";

// Same rule as the server: https, loopback http (desktop MCP clients) or Cursor's own callback
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
function isSafeRedirectUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "cursor:") return url.host === "anysphere.cursor-mcp" && url.pathname === "/oauth/callback";
    if (url.username || url.password) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function OAuthConsentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  
  const [clientData, setClientData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  useEffect(() => {
    if (isUserLoading) return;
    
    if (!user) {
      // The RequireAuth wrapper handles redirecting to login, 
      // but we add this safeguard.
      return;
    }

    if (!clientId) {
      toast.error("Missing client_id in URL");
      setIsLoading(false);
      return;
    }

    const fetchClientDetails = async () => {
      try {
        const queryParams = new URLSearchParams({
          client_id: clientId,
        });
        if (redirectUri) queryParams.append("redirect_uri", redirectUri);

        // Fetch using generic cookies since it's an authenticated route on the backend
        // Note: The backend uses `isAuthenticated` which reads from Bearer token or cookies.
        // `useCurrentUser` typically means we have standard session management via cookies.
        const res = await fetch(`${backendUrl}/oauth/client-details?${queryParams.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include" // Important for sending the auth cookie
        });

        const data = await res.json();
        if (res.ok) {
          setClientData(data.client);
        } else {
          toast.error(data.message || data.error || "Failed to load app details");
        }
      } catch (err) {
        toast.error("Connection error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchClientDetails();
  }, [clientId, redirectUri, user, isUserLoading]);

  const handleConsent = async (allow: boolean) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/oauth/authorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          state,
          allow
        })
      });

      const data = await res.json();
      if (data.redirect_url) {
        // Never navigate to anything but a normal web address (a "javascript:" URL would run as script here)
        if (!isSafeRedirectUrl(data.redirect_url)) {
          toast.error("This app has an unsafe return address, so access was not granted.");
          setIsSubmitting(false);
          return;
        }
        window.location.href = data.redirect_url;
      } else if (data.error) {
        toast.error(data.error);
        setIsSubmitting(false);
      }
    } catch (err) {
      toast.error("Failed to process authorization");
      setIsSubmitting(false);
    }
  };

  if (isUserLoading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md p-6 bg-card border border-border rounded-xl shadow-sm">
          <X className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Invalid Request</h1>
          <p className="text-muted-foreground text-sm">We couldn't verify the application requesting access. Please ensure the link is correct.</p>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-xl overflow-hidden relative">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 border border-border">
                <img src="/logo.png" alt="Classgrid" className="w-6 h-6 object-contain" />
              </div>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">
            Connect to {clientData.name}
          </h2>
          <p className="text-center text-muted-foreground text-sm mb-8">
            <span className="font-semibold text-foreground">{clientData.name}</span> would like to connect to your Classgrid account ({user?.email}).
          </p>

          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">This application will be able to:</h3>
            
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Read your profile and organizational data</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Access your connected integrations and resources</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>Perform actions on your behalf across the platform</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
            <Button 
              variant="outline" 
              className="w-full order-2 sm:order-1"
              onClick={() => handleConsent(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              className="w-full order-1 sm:order-2 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => handleConsent(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Allow Access
            </Button>
          </div>
        </div>
        <div className="bg-muted/50 p-4 text-center text-xs text-muted-foreground border-t border-border">
          By allowing access, you are granting this application permission to interact with your Classgrid data. You can revoke this access at any time from your settings.
        </div>
      </div>
    </div>
  );
}
