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



import { useAdmissionConfig, useUpdateAdmissionConfig } from "../queries/useAdmissionConfig";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { advanceRound } from "../api";

import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";

export function AdmissionSchedulePage() {
  const { data: configResponse, isLoading, isError } = useAdmissionConfig();
  const update = useUpdateAdmissionConfig();
  const qc = useQueryClient();
  const advance = useMutation({ mutationFn: advanceRound, onSuccess: () => qc.invalidateQueries({ queryKey: ["admission-config"] }) });

  if (isLoading) return <div ><Spinner size={24}  /></div>;
  if (isError || !configResponse) return <div title="Schedule & Rounds" breadcrumbs={[{ label: "Admissions", to: "/dept/admissions/dashboard" }, { label: "Schedule" }]}><div variant="danger" title="Error">Could not load config.</div></div>;

  const cfg = configResponse.config || {};
  const round = cfg.admission_round;

  return (
    <div title="Schedule & Rounds" description="Admission round management and cycle timeline."
      breadcrumbs={[{ label: "Admissions", to: "/dept/admissions/dashboard" }, { label: "Schedule & Rounds" }]}>
      {update.isSuccess && <div variant="success" title="Updated">Round configuration saved.</div>}
      {advance.isSuccess && <div variant="success" title="Advanced">Successfully advanced to the next admission round.</div>}

      <div >
        <div title="Round Status">
          <div >
            <div>
              <strong>Current Round:</strong>{" "}
              <div variant="info">{round?.current_round || 1} / {round?.max_rounds || 3}</div>
            </div>
            <div>
              <strong>Portal Status:</strong>{" "}
              {cfg.is_portal_open
                ? <div variant="success">Open</div>
                : <div variant="danger">Closed</div>}
            </div>
            <div>
              <strong>Merit List:</strong>{" "}
              {cfg.is_merit_list_published
                ? <div variant="success">Published</div>
                : <div variant="neutral">Unpublished</div>}
            </div>
          </div>
        </div>

        <div title="Actions">
          <div >
            <Button variant="outline" onClick={() => update.mutate({
              admission_config: { is_portal_open: !cfg.is_portal_open }
            })}>
              {cfg.is_portal_open ? "Close" : "Open"} Portal
            </Button>
            <Button variant="outline" onClick={() => update.mutate({
              admission_config: { is_merit_list_published: !cfg.is_merit_list_published }
            })}>
              {cfg.is_merit_list_published ? "Unpublish" : "Publish"} Merit List
            </Button>
            <Button variant="default" disabled={advance.isPending || !cfg.is_portal_open} onClick={() => advance.mutate()}>
              {advance.isPending ? <Spinner size={14}  /> : null} Advance to Next Round
            </Button>
          </div>
        </div>

        {/* Round History */}
        {(round?.round_history || []).length > 0 && (
          <div title="Round History">
            <div >
              {round!.round_history.map((rh) => (
                <div key={rh.round_number} >
                  <span>Round {rh.round_number}</span>
                  <div >
                    <span>Filled: <strong>{rh.seats_filled || 0}</strong></span>
                    <span>Remaining: <strong>{rh.seats_remaining || 0}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
