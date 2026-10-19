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


import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Spinner } from "@/components/marketing_ui/spinner";
import { apiClient } from "@/lib/apiClient";
import { clearChatCache } from "@/features/chat/services/chatCache";

export function LogoutPage() {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    let isMounted = true;
    
    const performLogout = async () => {
      // 1. Wait exactly 3 seconds to show the UI
      const waitPromise = new Promise(resolve => setTimeout(resolve, 3000));
      
      // 2. Call backend logout API
      const logoutPromise = apiClient.post("/api/auth/logout").catch(console.error);
      
      await Promise.all([waitPromise, logoutPromise]);
      
      if (!isMounted) return;
      
      // 3. Clear all stored user data
      const pushDismissed = localStorage.getItem("push_banner_dismissed");
      localStorage.clear();
      if (pushDismissed) localStorage.setItem("push_banner_dismissed", pushDismissed);
      
      sessionStorage.clear();
      await clearChatCache(); // Grids chats saved in this browser
      // Clear cookies safely
      document.cookie.split(";").forEach(c => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // 4. Redirect to the correct login page
      const redirectTo = searchParams.get("redirectTo") || "/platform-login";
      
      // Hard redirect to clear React Query cache and memory state completely
      window.location.href = redirectTo + "?logout=success";
    };
    
    performLogout();
    
    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center bg-background z-[999999]"
    >
      {/* Top-left Classgrid Logo */}
      <div className="absolute top-8 left-8">
        <img 
          src="https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/android-chrome-512x512.png" 
          alt="Classgrid Logo" 
          className="w-10 h-10 object-contain"
        />
      </div>
      
      {/* Center Spinner & Text */}
      <Spinner className="w-8 h-8 text-foreground mb-6" />
      <p className="text-lg font-semibold text-foreground tracking-tight">Logging out</p>
    </div>
  );
}
