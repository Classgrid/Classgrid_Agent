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

import { Input } from "@/components/marketing_ui/input";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { useState, useEffect } from "react";
import {  Save, FileText, LayoutList } from "lucide-react";

import { useMasterFieldPool, useMasterDocumentPool, useAdmissionConfig, useUpdateAdmissionConfig } from "../queries/useAdmissionConfig";
import indiaLocationsData from "@/data/india-locations.json";

import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";

const COUNTRIES = [
  "India", "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", 
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", 
  "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", 
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", 
  "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", 
  "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", 
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Guatemala", 
  "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", 
  "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", 
  "Lesotho", "Liberia", "Libya", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", 
  "Malta", "Mauritius", "Mexico", "Mongolia", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands", 
  "New Zealand", "Nigeria", "North Korea", "Norway", "Oman", "Pakistan", "Palestine", "Panama", "Papua New Guinea", 
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saudi Arabia", 
  "Singapore", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Sweden", "Switzerland", "Syria", 
  "Taiwan", "Tanzania", "Thailand", "Turkey", "Uganda", "Ukraine", "United Arab Emirates (UAE)", "United Kingdom (UK)", 
  "United States of America (USA)", "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// ═══════════════════════════════════════════════════════════════
// FormBuilderPage — Phase 2.5: UI for Fields AND Documents
// ═══════════════════════════════════════════════════════════════

type FieldToggle = {
  key: string;
  admission: boolean;
  onboarding: boolean;
  is_required?: boolean;
};

type DocToggle = {
  key: string;
  admission: boolean;
  onboarding: boolean;
};

export function FormBuilderPage() {
  const { data: poolData, isLoading: poolLoading, isError: poolError } = useMasterFieldPool();
  const { data: docPoolData, isLoading: docLoading, isError: docError } = useMasterDocumentPool();
  const { data: configResponse, isLoading: configLoading, isError: configError } = useAdmissionConfig();
  const updateConfig = useUpdateAdmissionConfig();

  const [activeTab, setActiveTab] = useState<"fields" | "documents">("fields");
  const [searchQuery, setSearchQuery] = useState("");

  // Local state for the toggles before saving
  const [toggles, setToggles] = useState<Record<string, FieldToggle>>({});
  const [docToggles, setDocToggles] = useState<Record<string, DocToggle>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize state from backend data
  useEffect(() => {
    if (configResponse && poolData && docPoolData && !isInitialized) {
      const existingToggles = configResponse.config?.form_builder_config?.field_toggles || [];
      const toggleMap: Record<string, FieldToggle> = {};
      existingToggles.forEach((t: FieldToggle) => toggleMap[t.key] = t);

      const existingDocToggles = configResponse.config?.form_builder_config?.document_toggles || [];
      const docToggleMap: Record<string, DocToggle> = {};
      existingDocToggles.forEach((t: DocToggle) => docToggleMap[t.key] = t);

      setToggles(toggleMap);
      setDocToggles(docToggleMap);
      setIsInitialized(true);
    }
  }, [configResponse, poolData, docPoolData, isInitialized]);

  const handleToggleChange = (fieldKey: string, prop: keyof FieldToggle, value: boolean) => {
    setToggles(prev => {
      const current = prev[fieldKey] || { key: fieldKey, admission: false, onboarding: false, is_required: false };
      return { ...prev, [fieldKey]: { ...current, [prop]: value } };
    });
  };

  const handleDocToggleChange = (docKey: string, prop: keyof DocToggle, value: boolean) => {
    setDocToggles(prev => {
      const current = prev[docKey] || { key: docKey, admission: false, onboarding: false };
      return { ...prev, [docKey]: { ...current, [prop]: value } };
    });
  };

  const handleSave = () => {
    const fieldTogglesArray = Object.values(toggles).filter(t => t.admission || t.onboarding);
    const docTogglesArray = Object.values(docToggles).filter(t => t.admission || t.onboarding);

    updateConfig.mutate({
      admission_config: {
        form_builder_config: {
          ...configResponse?.config?.form_builder_config,
          field_toggles: fieldTogglesArray,
          document_toggles: docTogglesArray
        }
      }
    });
  };

  if (poolLoading || configLoading || docLoading) {
    return (
      <div >
        <Spinner size={24}  />
      </div>
    );
  }

  if (poolError || configError || docError) {
    return (
      <div title="Form Builder">
        <div variant="danger" title="API Error">Could not connect to backend services.</div>
      </div>
    );
  }

  return (
    <div
      title="Dynamic Form Builder"
      description="Configure both the textual fields and the required document uploads for your admission pipeline."
      breadcrumbs={[
        { label: "Admissions", to: "/dept/admissions/dashboard" },
        { label: "Form Builder" },
      ]}
    >
      {updateConfig.isSuccess && (
        <div variant="success" title="Successfully Saved!">
          Your form fields and required documents have been updated across the entire portal.
        </div>
      )}

      {/* Floating Save Bar */}
      <div >
        <div>
          <h3 >Configure Form & Documents</h3>
          <p >
            Select fields and document uploads below, then click save.
          </p>
        </div>
        <Button 
          variant="default" 
          onClick={handleSave} 
          disabled={updateConfig.isPending}
          
        >
          {updateConfig.isPending ? <Spinner size={18}  /> : <Save size={18} />}
          Save Form Configuration
        </Button>
      </div>

      {/* TABS & SEARCH BAR */}
      <div >
        <div >
          <Button
            onClick={() => setActiveTab("fields")}
            
          >
            <LayoutList size={18} /> Basic Fields
          </Button>
          <Button
            onClick={() => setActiveTab("documents")}
            
          >
            <FileText size={18} /> Document Uploads
          </Button>
        </div>

        {/* SEARCH BAR */}
        <div >
          <Input
            type="search"
            placeholder={activeTab === "fields" ? "Search 111+ fields..." : "Search documents..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            
          />
        </div>
      </div>

      {/* ── FIELDS TAB ── */}
      {activeTab === "fields" && (
        <div >
          {Object.entries(poolData || {}).map(([sectionKey, section]: [string, any]) => {
            // Filter fields in this section
            const filteredFields = section.fields.filter((field: any) => 
              (field?.label || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
              (field?.key || "").toLowerCase().includes(searchQuery.toLowerCase())
            );

            // If a search query exists and no fields match, hide the section
            if (searchQuery && filteredFields.length === 0) return null;

            return (
            <div key={sectionKey} title={section.label}>
              <div >
                <div>Field Name</div>
                <div >Admission Form</div>
                <div >Onboarding Form</div>
                <div >Required</div>
              </div>

              <div >
                {filteredFields.map((field: any) => {
                  const currentToggle = toggles[field.key] || { admission: false, onboarding: false, is_required: false };
                  const isLocked = field.locked_by_cet;

                  return (
                    <div key={field.key} >
                      <div>
                        <div >
                          {field.label}
                          {isLocked && <div variant="warning" size="sm">Locked by CET</div>}
                        </div>
                        <div >
                          <span >
                            {field?.key?.includes("_country") || field?.key?.includes("_state") || field?.key?.includes("_district") || field?.key?.includes("_taluka") ? "dropdown" : field.type}
                          </span>
                          {(field.options || field?.key?.includes("_country") || field?.key?.includes("_state") || field?.key?.includes("_district") || field?.key?.includes("_taluka")) && (
                            <span >
                              Options: {
                                field.options ? field.options.join(", ") : 
                                field?.key?.includes("_country") ? "India, USA, UK, Canada, Australia, Other" :
                                field?.key?.includes("_state") ? "Maharashtra, Gujarat, Delhi, Karnataka, Tamil Nadu, Other" :
                                field?.key?.includes("_district") ? "Pune, Mumbai, Thane, Nagpur, Nashik, Other" :
                                field?.key?.includes("_taluka") ? "7,300+ Indian Talukas" : ""
                              }
                            </span>
                          )}
                        </div>

                        {/* Interactive Dropdown Previews for Admin Verification */}
                        {field?.key?.endsWith("_country") && (
                          <div >
                            <ResponsiveSelect  defaultValue="" >
                              <option value="" disabled>Select Country</option>
                              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </ResponsiveSelect>
                          </div>
                        )}
                        
                        {field?.key?.endsWith("_state") && (
                          <div >
                            <ResponsiveSelect  defaultValue="" >
                              <option value="" disabled>Select State</option>
                              {Object.keys(indiaLocationsData.states || {}).map(s => <option key={s} value={s}>{s}</option>)}
                              <option>Other</option>
                            </ResponsiveSelect>
                          </div>
                        )}

                        {field?.key?.endsWith("_district") && (
                          <div >
                            <ResponsiveSelect  defaultValue="" >
                              <option value="" disabled>Select District</option>
                              {Object.values(indiaLocationsData.states || {}).flatMap((stateObj: any) => Object.keys(stateObj || {})).slice(0, 50).map(d => <option key={d} value={d}>{d}</option>)}
                              <option disabled>...</option>
                            </ResponsiveSelect>
                          </div>
                        )}

                        {field?.key?.endsWith("_taluka") && (
                          <div >
                            <ResponsiveSelect  defaultValue="" >
                              <option value="" disabled>Select Taluka</option>
                              <option disabled>Select a District to view Talukas</option>
                            </ResponsiveSelect>
                          </div>
                        )}

                      </div>

                      <div >
                        <Input 
                          type="checkbox" 
                          disabled={isLocked}
                          checked={currentToggle.admission || isLocked} 
                          onChange={(e) => handleToggleChange(field.key, "admission", e.target.checked)}
                          
                        />
                      </div>

                      <div >
                        <Input 
                          type="checkbox" 
                          disabled={isLocked}
                          checked={currentToggle.onboarding || isLocked} 
                          onChange={(e) => handleToggleChange(field.key, "onboarding", e.target.checked)}
                          
                        />
                      </div>

                      <div >
                        <Input 
                          type="checkbox" 
                          disabled={isLocked || (!currentToggle.admission && !currentToggle.onboarding)}
                          checked={currentToggle.is_required || isLocked} 
                          onChange={(e) => handleToggleChange(field.key, "is_required", e.target.checked)}
                          
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )})}
        </div>
      )}

      {/* ── DOCUMENTS TAB ── */}
      {activeTab === "documents" && (
        <div title="Required Documents">
          <div >
            <div>Document Name</div>
            <div >Upload in Admission Form</div>
            <div >Upload in Onboarding Form</div>
          </div>

          <div >
            {docPoolData
              ?.filter((doc: any) => doc.label.toLowerCase().includes(searchQuery.toLowerCase()) || doc.key.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((doc: any) => {
              const currentToggle = docToggles[doc.key] || { admission: false, onboarding: false };

              return (
                <div key={doc.key} >
                  <div>
                    <div >{doc.label}</div>
                    <div >
                      <span >
                        file_upload
                      </span>
                    </div>
                  </div>

                  <div >
                    <Input 
                      type="checkbox" 
                      checked={currentToggle.admission} 
                      onChange={(e) => handleDocToggleChange(doc.key, "admission", e.target.checked)}
                      
                    />
                  </div>

                  <div >
                    <Input 
                      type="checkbox" 
                      checked={currentToggle.onboarding} 
                      onChange={(e) => handleDocToggleChange(doc.key, "onboarding", e.target.checked)}
                      
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
