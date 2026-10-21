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



import { useAdmissionConfig } from "../queries/useAdmissionConfig";
import { Spinner } from "@/components/marketing_ui/spinner";

export function FeeStructurePage() {
  const { data: configResponse, isLoading, isError } = useAdmissionConfig();

  if (isLoading) return <div ><Spinner size={24}  /></div>;
  if (isError || !configResponse) return <div title="Fee Structure" breadcrumbs={[{ label: "Admissions", to: "/dept/admissions/dashboard" }, { label: "Fee Structure" }]}><div variant="danger" title="Error">Could not load config.</div></div>;

  const cfg = configResponse.config || {};
  const feeConfig = cfg.fee_config;

  return (
    <div title="Fee Structure" description="Application fee, category-based mappings, and refund policy."
      breadcrumbs={[{ label: "Admissions", to: "/dept/admissions/dashboard" }, { label: "Fee Structure" }]}>

      <div >
        <div title="Registration Fee">
          <div >
            <div><strong>Registration Fee:</strong> ₹{cfg.registration_fee || 0}</div>
            <div>
              <strong>Portal Status:</strong>{" "}
              {cfg.is_portal_open
                ? <div variant="success">Open</div>
                : <div variant="danger">Closed</div>}
            </div>
          </div>
        </div>

        {feeConfig && (
          <div title="Fee Configuration">
            <div >
              {feeConfig.admission_fee_structure_id && (
                <div><strong>Fee Structure ID:</strong> <code >{feeConfig.admission_fee_structure_id}</code></div>
              )}
              {(feeConfig.dynamic_fee_mapping || []).length > 0 && (
                <div>
                  <strong>Category-Based Fee Mapping:</strong>
                  <div >
                    {feeConfig.dynamic_fee_mapping!.map((m, i) => (
                      <div key={i} >
                        <div variant="info" size="sm">{m.attribute_type}</div>
                        <span>{m.attribute}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {feeConfig.refund_policy?.enabled && (
                <div>
                  <strong>Refund Policy:</strong> Enabled
                  <div >
                    {(feeConfig.refund_policy.rules || []).map((rule, i) => (
                      <div key={i} >
                        {rule.days_before_start} days before session → {rule.refund_percentage}% refund
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {feeConfig.session_start_date && (
                <div><strong>Session Start:</strong> {new Date(feeConfig.session_start_date).toLocaleDateString("en-IN")}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
