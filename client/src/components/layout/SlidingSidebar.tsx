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

import React, { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { SidebarMenuButton } from "@/components/marketing_ui/sidebar";

interface SlidingSidebarProps {
  showNested: boolean;
  onBack: () => void;
  nestedTitle: string;
  mainMenu: React.ReactNode;
  nestedMenu: React.ReactNode;
  activeItemId?: string;
}

export function SlidingSidebar({
  showNested,
  onBack,
  nestedTitle,
  mainMenu,
  nestedMenu,
  activeItemId = "active-main-menu-item",
}: SlidingSidebarProps) {
  // Scroll active item into view when sliding back to the main menu
  useEffect(() => {
    if (!showNested && activeItemId) {
      // Run on next frame
      requestAnimationFrame(() => {
        const activeEl = document.getElementById(activeItemId);
        if (activeEl) {
          activeEl.scrollIntoView({ block: "center", behavior: "auto" });
        }
      });
    }
  }, [showNested, activeItemId]);

  return (
    <div className="overflow-hidden relative p-0 w-full h-full">
      {/* Sliding Carousel Container */}
      <div
        className="absolute top-0 bottom-0 left-0 flex transition-transform duration-300 ease-in-out w-[200%]"
        style={{ transform: showNested ? "translateX(-50%)" : "translateX(0)" }}
      >
        {/* ==========================================
            PANE 1: MAIN MENU
            ========================================== */}
        <div className="w-1/2 h-full shrink-0 overflow-y-auto pb-10 no-scrollbar">
          {mainMenu}
        </div>

        {/* ==========================================
            PANE 2: NESTED MENU
            ========================================== */}
        <div className="w-1/2 h-full shrink-0 overflow-y-auto pb-10 pt-0 no-scrollbar">
          <div className="group-data-[collapsible=icon]:hidden px-1 pb-1 -mt-1 mx-1">
            <SidebarMenuButton
              asChild
              className="h-9 text-muted-foreground hover:text-foreground cursor-pointer rounded-md"
            >
              <a
                onClick={(e) => {
                  e.preventDefault();
                  onBack();
                }}
                className="flex items-center w-full font-medium text-[15px]"
              >
                <ChevronLeft size={16} className="mr-2" />
                <span>{nestedTitle}</span>
              </a>
            </SidebarMenuButton>
          </div>
          {nestedMenu}
        </div>
      </div>
    </div>
  );
}
