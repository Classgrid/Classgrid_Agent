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

import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetAdmissionStrategy, useSubmitApplication } from "../queries/usePublicAdmission";
import { Stepper, Step } from "@/components/marketing_ui/stepper";
import { SelectAdvanced } from "@/components/marketing_ui/select-advanced";
import { FileUpload } from "@/components/marketing_ui/file-upload";
import { Input } from "@/components/marketing_ui/input";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { CheckCircle, ArrowRight, ArrowLeft, Rocket } from "lucide-react";
import { toast } from "sonner";

import indiaLocations from "@/data/india-locations.json";
import { MASTER_FIELD_POOL } from "../constants/master-field-pool";

// Fallback sections if the backend strategy is empty/missing
const FALLBACK_SECTIONS = [
  { id: "student_identity", title: "Student Identity", description: "Basic applicant details" },
  { id: "demographics", title: "Demographics", description: "Address and location" },
  { id: "academic_history", title: "Academic History", description: "Previous schooling" },
  { id: "documents", title: "Document Uploads", description: "Required files and IDs" },
];

export default function PublicApplicationForm() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  // 1. API Hooks
  // We use the orgId from the URL to fetch the dynamic 4x2 DNA strategy
  const { data: strategyData, isLoading: isLoadingStrategy } = useGetAdmissionStrategy(orgId || "test-org");
  const { mutate: submitApp, isPending: isSubmitting } = useSubmitApplication();

  // 2. Local State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [documents, setDocuments] = useState<File[]>([]);

  // 3. Flatten 7000+ India Locations dynamically
  const indiaCities = useMemo(() => {
    const cities: { value: string; label: string }[] = [];
    const states = (indiaLocations as any).states;
    if (!states) return [];

    Object.keys(states).forEach((stateName) => {
      const districts = states[stateName];
      Object.keys(districts).forEach((districtName) => {
        const talukas = districts[districtName];
        talukas.forEach((taluka: string) => {
          cities.push({
            value: `${taluka}-${districtName}-${stateName}`.toLowerCase().replace(/\s+/g, "-"),
            label: `${taluka}, ${districtName}, ${stateName}`,
          });
        });
      });
    });
    return cities;
  }, []);

  // 4. Dynamic Strategy Mapping
  // We map the backend's enabled_sections to the Stepper format
  const steps: Step[] = useMemo(() => {
    if (strategyData?.enabled_sections?.length > 0) {
      return strategyData.enabled_sections.map((sectionId: string) => ({
        id: sectionId,
        title: sectionId.replace(/_/g, " "),
      }));
    }
    return FALLBACK_SECTIONS;
  }, [strategyData]);

  const activeStepId = steps[currentStepIndex]?.id;

  // 5. Handlers
  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleUpdateField = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [activeStepId]: {
        ...(prev[activeStepId] || {}),
        [field]: value,
      },
    }));
  };

  const handleSubmit = () => {
    // Construct the massive payload
    const payload = new FormData();
    payload.append("orgId", orgId || "test-org");
    payload.append("form_data", JSON.stringify(formData));
    
    // Append actual files
    documents.forEach((file, index) => {
      payload.append(`documents[${index}]`, file);
    });

    submitApp(payload, {
      onSuccess: () => {
        setIsSuccess(true);
        toast.success("Application successfully submitted!");
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to submit application");
      },
    });
  };

  // ── RENDER ENGINE ─────────────────────────────────────────────────────────

  if (isLoadingStrategy) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-muted/20">
        <Spinner className="w-10 h-10 text-emerald-500 mb-4" />
        <p className="text-muted-foreground animate-pulse">Initializing Admissions Portal...</p>
      </div>
    );
  }

  // Success Screen
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/10 p-6">
        <div className="max-w-md w-full bg-card border border-emerald-200 dark:border-emerald-900 rounded-2xl shadow-xl p-10 text-center animate-in zoom-in-95 duration-500">
          <div className="mx-auto w-24 h-24 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-12 h-12 text-emerald-600 dark:text-emerald-400 animate-in zoom-in spin-in-12 duration-700" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">Application Submitted!</h1>
          <p className="text-muted-foreground mb-8">
            Your application has been securely transmitted. Our admissions team will review your details and contact you shortly.
          </p>
          <Button 
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            onClick={() => navigate("/")}
          >
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0f0f0f] pb-24">
      {/* Premium Hero Header */}
      <div className="w-full bg-card border-b border-border shadow-sm pt-8 pb-4">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-2">
            Admissions Portal
          </h1>
          <p className="text-muted-foreground">
            Complete your application in a few simple steps. Your progress is securely saved.
          </p>
        </div>
        
        {/* Dynamic Stepper */}
        <div className="max-w-5xl mx-auto mt-6">
          <Stepper steps={steps} currentStep={currentStepIndex} />
        </div>
      </div>

      {/* Dynamic Form Body */}
      <div className="max-w-3xl mx-auto px-6 mt-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-card border border-border rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.02)] p-8 md:p-10">
          
          <div className="mb-8">
            <h2 className="text-2xl font-bold capitalize text-foreground mb-2">
              {activeStepId?.replace(/_/g, " ")}
            </h2>
            <div className="h-1 w-12 bg-emerald-500 rounded-full" />
          </div>

          <div className="space-y-6">
            {/* Dynamic Rendering of Fields based on MASTER_FIELD_POOL */}
            {activeStepId !== "documents" && MASTER_FIELD_POOL[activeStepId] && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                {MASTER_FIELD_POOL[activeStepId].fields.map((field) => (
                  <div key={field.key} className={`space-y-2 ${field.type === 'text' && field.key.includes('address') ? 'md:col-span-2' : ''}`}>
                    <label className="text-sm font-semibold">{field.label}</label>
                    
                    {field.type === 'city_search' ? (
                      <SelectAdvanced
                        options={indiaCities}
                        value={formData[activeStepId]?.[field.key] || ""}
                        onChange={(val) => handleUpdateField(field.key, val)}
                        placeholder="Search 7000+ Indian cities..."
                      />
                    ) : field.type === 'dropdown' ? (
                      <ResponsiveSelect
                        className="flex h-10 w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 text-foreground"
                        value={formData[activeStepId]?.[field.key] || ""}
                        onChange={(e) => handleUpdateField(field.key, e.target.value)}
                      >
                        <option value="">Select...</option>
                        {field.options?.map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </ResponsiveSelect>
                    ) : (
                      <Input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        value={formData[activeStepId]?.[field.key] || ""}
                        onChange={(e) => handleUpdateField(field.key, e.target.type === 'checkbox' ? e.target.checked : e.target.value)}
                        className="bg-muted/30 focus:bg-background transition-colors"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Documents Section (Special Case) */}
            {activeStepId === "documents" && (
              <div className="space-y-6 animate-in fade-in">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <p className="text-sm text-emerald-800 dark:text-emerald-300">
                    <strong>Note:</strong> Required documents are dynamically generated based on your profile. Please upload clear, legible PDFs or Images.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Upload Required Documents</label>
                  <FileUpload
                    accept=".pdf,.png,.jpg,.jpeg"
                    maxFiles={5}
                    title="Drag & Drop Marksheets and IDs"
                    onFilesSelected={(files) => setDocuments(files)}
                  />
                </div>
              </div>
            )}

            {/* Generic Fallback for unmapped dynamic sections */}
            {!MASTER_FIELD_POOL[activeStepId] && activeStepId !== "documents" && (
              <div className="py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
                <p>Dynamic fields for <strong>{activeStepId?.replace(/_/g, " ")}</strong> will render here.</p>
              </div>
            )}
          </div>

          {/* Action Engine Footer */}
          <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
            <Button
              variant="outline"
              disabled={currentStepIndex === 0 || isSubmitting}
              onClick={handlePrevious}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            {currentStepIndex === steps.length - 1 ? (
              <Button
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300"
              >
                {isSubmitting ? (
                  <Spinner className="w-4 h-4 mr-2 text-white" />
                ) : (
                  <Rocket className="w-4 h-4 mr-2" />
                )}
                Submit Application
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-foreground text-background hover:bg-foreground/90 px-8"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
