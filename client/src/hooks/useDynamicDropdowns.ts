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

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';

export function useDynamicDropdowns(organizationType: string, roleCategory: string, department: string) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingDesignations, setIsLoadingDesignations] = useState(false);

  useEffect(() => {
    if (!organizationType || !roleCategory) {
      setDepartments([]);
      return;
    }
    const fetchDepartments = async () => {
      setIsLoadingDepartments(true);
      try {
        const res = await apiClient.get('/api/dropdowns', {
          params: { type: 'DEPARTMENT', organization_type: organizationType, role_category: roleCategory }
        });
        setDepartments(res.data.options || []);
      } catch (err) {
        console.error("Failed to fetch departments", err);
      } finally {
        setIsLoadingDepartments(false);
      }
    };
    fetchDepartments();
  }, [organizationType, roleCategory]);

  useEffect(() => {
    if (!department) {
      setDesignations([]);
      return;
    }
    const fetchDesignations = async () => {
      setIsLoadingDesignations(true);
      try {
        const res = await apiClient.get('/api/dropdowns', {
          params: { type: 'DESIGNATION', organization_type: organizationType, role_category: roleCategory }
        });
        setDesignations(res.data.options || []);
      } catch (err) {
        console.error("Failed to fetch designations", err);
      } finally {
        setIsLoadingDesignations(false);
      }
    };
    fetchDesignations();
  }, [organizationType, roleCategory, department]);

  return { departments, designations, isLoadingDepartments, isLoadingDesignations };
}
