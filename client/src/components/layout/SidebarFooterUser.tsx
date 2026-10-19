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

import React from "react";
import { SidebarFooter } from "@/components/marketing_ui/sidebar";
import { SidebarUserMenu } from "./SidebarUserMenu";
import { SidebarNotifications } from "./SidebarNotifications";
import type { DashboardRole } from "./DashboardLayout";

type SidebarFooterUserProps = {
  role: DashboardRole;
  user: {
    name: string;
    email?: string;
    avatar?: string;
    profilePicture?: string;
    photoURL?: string;
    pushNotifications?: {
      global?: boolean;
      sidebarPanelEnabled?: boolean;
    };
  };
};

import { useSidebar } from "@/components/marketing_ui/sidebar";

export function SidebarFooterUser({ role, user }: SidebarFooterUserProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const avatarSrc = user.avatar || user.profilePicture || user.photoURL;
  const showNotifications = user.pushNotifications?.sidebarPanelEnabled !== false;
  const settingsPath = role === "super_admin" ? "/superadmin/settings" : "/settings";

  const avatarNode = (
    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all outline-none">
      {avatarSrc ? (
        <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-emerald-700 font-bold text-xs">
          {user.name?.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  return (
    <SidebarFooter className="p-3 border-t border-sidebar-border mt-auto">
      <div className={`flex items-center w-full ${isCollapsed ? "justify-center" : "justify-between"}`}>
        {isCollapsed ? (
          <div className="flex flex-col gap-4 items-center justify-center">
            <SidebarUserMenu user={user} customTrigger={avatarNode} />
            {showNotifications && <SidebarNotifications settingsPath={settingsPath} />}
          </div>
        ) : (
          <>
            {/* Clicking the avatar or name opens the account menu (no separate three-dot button) */}
            <SidebarUserMenu
              user={user}
              customTrigger={
                <button
                  type="button"
                  className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 rounded-lg px-1 py-1 -mx-1 text-left hover:bg-accent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-emerald-700 font-bold text-xs">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="truncate text-sm font-medium">
                    {user.name}
                  </span>
                </button>
              }
            />
            <div className="flex items-center gap-0.5 shrink-0">
              {showNotifications && <SidebarNotifications settingsPath={settingsPath} />}
            </div>
          </>
        )}
      </div>
    </SidebarFooter>
  );
}
