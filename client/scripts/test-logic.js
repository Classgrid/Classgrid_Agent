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
import axios from 'axios';

async function test() {
  const platformBranding = { name: "Classgrid" };
  let branding = platformBranding;
  let brandingError = false;
  let isMounted = true;
  let authType = "institution";
  let slug = "aec";

  const apiClient = axios.create({ baseURL: "https://api.classgrid.in" });
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      const normalized = { message: "Unexpected API error", code: "UNKNOWN" };
      return Promise.reject(normalized);
    }
  );

  async function getAuthBranding() {
    const response = await apiClient.get("/api/public/auth-branding", {
      params: { type: authType, slug: slug },
    });
    return response.data.branding;
  }

  try {
    const result = await getAuthBranding();
    if (isMounted) branding = result;
  } catch (error) {
    console.log("CATCH BLOCK REACHED");
    if (isMounted) {
      if (authType === "institution") {
        brandingError = true;
      } else {
        branding = platformBranding;
      }
    }
  }

  console.log({ brandingError, branding });
}

test().catch(console.error);
