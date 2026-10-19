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

import React, { useState } from "react";
import { 
  User as UserIcon, Phone, Users, GraduationCap, Landmark, 
  FileUp, Briefcase, Trophy, Activity, Globe, CreditCard, 
  HeartPulse, Sparkles, ShieldCheck, School, Clock, Wallet, UploadCloud, CalendarIcon,
  Eye, ExternalLink, X, File as FileIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/marketing_ui/dialog";
import { 
  getResolvedProfileStrategy, 
  UG_DEGREE_OPTIONS, UG_SPECIALIZATION_MAP, 
  PG_DEGREE_OPTIONS, PG_SPECIALIZATION_MAP, 
  PHD_SPECIALIZATION_OPTIONS 
} from "../lib/profile-strategy-selector";
import { ERPUNIVERSITYLIST } from "../lib/erp-large-options";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/marketing_ui/accordion";
import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import { ScrollArea } from "@/components/marketing_ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { Calendar } from "@/components/marketing_ui/nikhil_calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { Button } from "@/components/marketing_ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import indiaLocations from "@/data/india-locations.json";
import { Spinner } from "@/components/marketing_ui/spinner";
import { toast } from "sonner";
import { OnlineStatusDot } from "./OnlineStatusDot";
import { apiClient } from "@/lib/apiClient";
import { useDynamicDropdowns } from "@/hooks/useDynamicDropdowns";

// ── SUB-COMPONENT FOR DATE FIELD TO HANDLE LOCAL STATE ──
function DateField({ field, value, onChange, disabled }: { field: any, value: string, onChange: (val: string) => void, disabled?: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date | undefined>(value ? new Date(value) : undefined);

  return (
    <Popover open={isOpen} onOpenChange={(open) => !disabled && setIsOpen(open)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-11 w-full rounded-lg px-3 text-left font-normal outline-none transition-all flex items-center gap-2",
            disabled ? "bg-muted/30 border border-input text-foreground cursor-not-allowed opacity-70" : "border border-input bg-background focus:border-primary",
            !value && !disabled ? "text-muted-foreground" : ""
          )}
          onClick={(e) => { 
            if (disabled) { e.preventDefault(); return; }
            setTempDate(value ? new Date(value) : undefined); 
            setIsOpen(true); 
          }}
        >
          <CalendarIcon className="h-4 w-4" />
          {value ? format(new Date(value), "PPP") : (disabled ? "Not specified" : "Select date")}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 shadow-2xl rounded-xl border border-border animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95" align="start">
        <Calendar
          mode="single"
          selected={tempDate}
          onSelect={setTempDate}
          initialFocus
          fixedWeeks
          className="p-0 border-none"
        />
        <div className="p-2 border-t border-border mt-1">
          <button
            type="button"
            onClick={() => { 
              if (tempDate) onChange(tempDate.toISOString()); 
              setIsOpen(false); 
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-transparent text-foreground hover:bg-muted rounded-md transition-all border border-transparent hover:border-border hover:scale-[0.98]"
          >
            Apply <span className="opacity-50 text-[10px]">↵</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── SUB-COMPONENT FOR FILE UPLOADS TO R2 ──
function FileUploadField({ field, value, onChange, disabled }: { field: any, value: string, onChange: (val: string) => void, disabled?: boolean }) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    const loadingToast = toast.loading(`Uploading ${field.label}...`);
    try {
      const ext = file.name.split('.').pop() || "png";
      const fileName = `doc-${Date.now()}.${ext}`;

      const res = await apiClient.post("/api/user/upload-aws-url", {
        fileName,
        fileType: file.type
      });

      const { uploadUrl, publicUrl } = res.data;

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      onChange(publicUrl);
      toast.success(`${field.label} uploaded successfully`, { id: loadingToast });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document", { id: loadingToast });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isImage = field.type === "image" || (value && value.match(/\.(jpeg|jpg|gif|png)$/i) != null);

  if (value) {
    return (
      <div className="w-full flex flex-col gap-2 p-3 border border-border rounded-md bg-muted/20 relative">
        <div className="flex items-center gap-3">
          {isImage ? (
            <img src={value} alt={field.label} className="w-14 h-14 rounded-md object-cover border border-border shadow-sm cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setIsPreviewOpen(true)} />
          ) : (
            <div className="w-14 h-14 flex items-center justify-center bg-muted rounded-md border border-border cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setIsPreviewOpen(true)}>
               <FileIcon className="w-6 h-6 text-primary/70" />
            </div>
          )}
          <div className="flex flex-col flex-1">
            <span className="text-sm text-foreground font-medium">{field.label} uploaded</span>
            <div className="flex items-center gap-3 mt-1">
              <button type="button" onClick={() => setIsPreviewOpen(true)} className="text-xs text-primary hover:underline flex items-center gap-1"><Eye className="w-3 h-3"/> Preview</button>
              {!disabled && (
                <>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">Replace</button>
                  <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"><X className="w-3 h-3"/> Remove</button>
                </>
              )}
            </div>
          </div>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleUpload} disabled={disabled || isUploading} />

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-muted/30">
              <DialogTitle className="flex items-center justify-between">
                <span>{field.label} Preview</span>
                <a href={value} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1 font-normal"><ExternalLink className="w-4 h-4"/> Open Original</a>
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-black/5 flex items-center justify-center overflow-auto p-4 relative">
               {isImage ? (
                 <img src={value} alt={field.label} className="max-w-full max-h-full object-contain bg-white shadow-xl" />
               ) : (
                 <iframe src={value} className="w-full h-full bg-white rounded-md shadow-xl border-none" title={field.label} />
               )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div 
      onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      className={cn("w-full p-4 border-2 border-dashed rounded-md bg-muted/20 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2 transition-colors", !disabled && !isUploading ? "cursor-pointer hover:bg-muted/50 hover:border-primary/50" : "opacity-70 cursor-not-allowed bg-muted/30 border-input")}
    >
      {isUploading ? <Spinner className="w-6 h-6 text-primary" /> : <UploadCloud className="w-6 h-6 text-primary/70" />}
      <span className="font-medium text-foreground">{isUploading ? `Uploading...` : !disabled ? `Upload ${field.label}` : 'No file uploaded'}</span>
      {!disabled && !isUploading && <span className="text-xs">PDF, JPG, PNG up to 5MB</span>}
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/*" onChange={handleUpload} disabled={disabled || isUploading} />
    </div>
  );
}

// Map string icon names from strategy to actual Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  User: UserIcon,
  Phone: Phone,
  Users: Users,
  GraduationCap: GraduationCap,
  Landmark: Landmark,
  FileUp: FileUp,
  Briefcase: Briefcase,
  Trophy: Trophy,
  Activity: Activity,
  Globe: Globe,
  CreditCard: CreditCard,
  HeartPulse: HeartPulse,
  Sparkles: Sparkles,
  ShieldCheck: ShieldCheck,
  School: School,
  Clock: Clock,
  Wallet: Wallet,
};

interface ContextualProfileProps {
  targetRole: string;
  viewerRole: string;
  orgType: string;
  structureType: string;
  isSelfView: boolean;
  profileData?: any;
}

export function ContextualProfile({
  targetRole,
  viewerRole,
  orgType,
  structureType,
  isSelfView,
  profileData,
}: ContextualProfileProps) {
  // 1. Get the resolved strategy from our data engine
  const strategy = getResolvedProfileStrategy({
    targetRole,
    viewerRole,
    orgType,
    structureType,
    isSelfView,
  });

  const [activeSection, setActiveSection] = useState(strategy.sections[0]?.key || "");
  React.useEffect(() => { if (!activeSection && strategy.sections.length > 0) setActiveSection(strategy.sections[0].key); }, [strategy.sections, activeSection]);
  
  // Initialize from actual profile data, flattening root props and metadata
  const [formData, setFormData] = useState<Record<string, any>>({
    ...(profileData || {}),
    ...(profileData?.metadata || {})
  });
  
  // Use dynamic dropdowns hook
  const { departments, designations, isLoadingDepartments, isLoadingDesignations } = useDynamicDropdowns(
    orgType,
    targetRole,
    formData["identity.department"]
  );

  // Sync form data if profileData arrives asynchronously
  React.useEffect(() => {
    if (profileData) {
      // Split name into first/last if not already set
      const nameParts = (profileData.name || "").trim().split(/\s+/);
      const inferredFirstName = nameParts[0] || "";
      const inferredLastName = nameParts.slice(1).join(" ") || "";

      setFormData(prev => ({
        ...prev,
        ...profileData,
        ...(profileData.metadata || {}),
        // Pre-populate photo from profilePicture if no metadata photo
        profile_photo: profileData.metadata?.profile_photo || profileData.profilePicture || profileData.photoURL || prev.profile_photo || "",
        // Pre-populate name fields from user.name if not set in metadata
        "identity.first_name": profileData.metadata?.["identity.first_name"] || profileData.metadata?.first_name || profileData.first_name || inferredFirstName || prev["identity.first_name"] || "",
        "identity.last_name": profileData.metadata?.["identity.last_name"] || profileData.metadata?.last_name || profileData.last_name || inferredLastName || prev["identity.last_name"] || "",
        // Map verified credentials to contact fields if empty
        "contact.personal_email": profileData.metadata?.["contact.personal_email"] || profileData.email || prev["contact.personal_email"] || "",
        "contact.mobile_number": profileData.metadata?.["contact.mobile_number"] || profileData.phoneNumber || prev["contact.mobile_number"] || "",
        // Map Organization Details (if present)
        "organization.legal_name": profileData.metadata?.["organization.legal_name"] || profileData.organization_id?.name || prev["organization.legal_name"] || "",
        "organization.type": profileData.metadata?.["organization.type"] || profileData.organization_id?.org_type || prev["organization.type"] || "",
        "organization.short_name": profileData.metadata?.["organization.short_name"] || profileData.organization_id?.subdomain || prev["organization.short_name"] || "",
        "organization.affiliation_number": profileData.metadata?.["organization.affiliation_number"] || profileData.organization_id?.registration_number || prev["organization.affiliation_number"] || "",
        "organization.board": profileData.metadata?.["organization.board"] || profileData.organization_id?.affiliation || prev["organization.board"] || "",
        "organization.logo": profileData.metadata?.["organization.logo"] || profileData.organization_id?.logo_url || prev["organization.logo"] || "",
        "organization.address": profileData.metadata?.["organization.address"] || profileData.organization_id?.address || prev["organization.address"] || "",
        "organization.state": profileData.metadata?.["organization.state"] || profileData.organization_id?.state || prev["organization.state"] || "",
        "organization.district": profileData.metadata?.["organization.district"] || profileData.organization_id?.district || prev["organization.district"] || "",
        "organization.city": profileData.metadata?.["organization.city"] || profileData.organization_id?.city || prev["organization.city"] || "",
        "organization.pin_code": profileData.metadata?.["organization.pin_code"] || profileData.organization_id?.billing_settings?.pincode || prev["organization.pin_code"] || "",
      }));
    }
  }, [profileData]);
  // Loading & Edit States
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Only send the metadata object — never send raw system fields like abc_id, prn etc.
      // Those are managed separately by the onboarding wizard / admin.
      const metadataPayload: Record<string, any> = {};
      const knownSystemKeys = new Set(["_id", "id", "name", "email", "role", "phoneNumber", "profilePicture", "profileBanner", "photoURL", "prn", "abc_id", "branch", "batch", "department", "organization_id", "organization", "metadata", "createdAt", "lastLoginAt", "profile_completed", "verification_status", "pushNotifications", "fcmTokens"]);
      for (const [key, value] of Object.entries(formData)) {
        if (!knownSystemKeys.has(key)) {
          metadataPayload[key] = value;
        }
      }
      await apiClient.put("/api/user/update", { metadata: metadataPayload });
      toast.success("Profile details updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Failed to save profile details");
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // 2. Render Vertical Stepper (Sidebar)
  const renderSidebar = () => {
    return (
      <div className="w-64 border-r bg-background/50 flex flex-col h-full relative">
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
              Profile Sections
            </h3>
            
            <div className="relative border-l-2 border-muted ml-4 space-y-8">
              {strategy.sections.map((section, index) => {
                const Icon = ICON_MAP[section.icon] || UserIcon;
                const isActive = activeSection === section.key;

                return (
                  <div key={section.key} className="relative">
                    {/* Stepper Circle */}
                    <div 
                      className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        isActive 
                          ? "border-primary bg-primary text-primary-foreground" 
                          : "border-muted bg-background text-muted-foreground hover:border-primary/50"
                      }`}
                      onClick={() => { setActiveSection(section.key); setIsEditing(false); }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    
                    {/* Stepper Label */}
                    <div 
                      className={`ml-8 cursor-pointer py-1.5 transition-colors ${
                        isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => { setActiveSection(section.key); setIsEditing(false); }}
                    >
                      {section.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>
      </div>
    );
  };

  // 3. Render Form / Content Area
  const renderContent = () => {
    const section = strategy.sections.find(s => s.key === activeSection);
    if (!section) return null;

    return (
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              {React.createElement(ICON_MAP[section.icon] || UserIcon, { className: "w-6 h-6 text-primary" })}
              {section.label}
            </h2>
            
            <div className="flex items-center gap-4">
              {targetRole && formData._id && (
                <OnlineStatusDot userId={formData._id} showText />
              )}
              {/* Edit / Save Toggle */}
              {strategy.permissions.can_edit && (
              isEditing ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="w-4 h-4" />
                        Saving...
                      </span>
                    ) : "Save Changes"}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  Edit Details
                </Button>
              )
            )}
            </div>
          </div>

          {/* Anti-Ragging Special Banner */}
          {section.key === "anti_ragging" && (
            <div className="mb-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-[15px] text-blue-600 dark:text-blue-400">Anti-Ragging Undertaking Form</h4>
                <p className="text-sm text-muted-foreground mt-1">Click the link to fill the Anti Ragging Undertaking form on the official website, then paste your Undertaking Number below.</p>
              </div>
              <a href="https://www.antiragging.in/" target="_blank" rel="noopener noreferrer" className="shrink-0">
                <Button variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700">
                  Open antiragging.in <span className="ml-2">↗</span>
                </Button>
              </a>
            </div>
          )}

          {(() => {
            const renderFieldInput = (field: any) => {
              // Handle dependsOn dynamic fields (e.g. Other Gender, Other Nationality)
              if (field.dependsOn) {
                const dependentFieldValue = formData[field.dependsOn.field];
                if (field.dependsOn.isNotEmpty) {
                   if (!dependentFieldValue || String(dependentFieldValue).trim() === "") {
                      return null;
                   }
                } else if (dependentFieldValue !== field.dependsOn.value) {
                  return null;
                }
              }

              // Hide fields conditionally based on PhD Yes/No
              if ((field.key === "phd_specialization" || field.key === "phd_university" || field.key === "phd_year") && formData.phd_qualified !== "yes") {
                return null;
              }

              // Hide Official Contact fields for students
              if (targetRole === "student" && (field.key === "contact.work_email" || field.key === "contact.official_phone" || field.key === "contact.office_extension")) {
                return null;
              }

              // Same as Permanent Address Logic
              if (field.key === "contact.same_as_permanent_address") {
                return (
                   <label className="flex items-center gap-2 text-sm cursor-pointer mt-2 text-foreground">
                      <input 
                         type="checkbox" 
                         className="accent-primary w-4 h-4"
                         checked={formData["contact.same_as_permanent_address"] === "true"}
                         onChange={(e) => {
                            const isChecked = e.target.checked;
                            handleInputChange("contact.same_as_permanent_address", isChecked ? "true" : "false");
                            if (isChecked) {
                               handleInputChange("contact.current_country", formData["contact.permanent_country"]);
                               handleInputChange("contact.current_state", formData["contact.permanent_state"]);
                               handleInputChange("contact.current_district", formData["contact.permanent_district"]);
                               handleInputChange("contact.current_taluka", formData["contact.permanent_taluka"]);
                               handleInputChange("contact.current_city", formData["contact.permanent_city"]);
                               handleInputChange("contact.current_address", formData["contact.permanent_address"]);
                               handleInputChange("contact.current_pincode", formData["contact.permanent_pincode"]);
                            }
                         }}
                         disabled={!isEditing}
                      />
                      Same as Permanent Address
                   </label>
                )
              }

              if (field.key === "contact.whatsapp_same_as_mobile") {
                return (
                   <label className="flex items-center gap-2 text-sm cursor-pointer mt-2 text-foreground">
                      <input 
                         type="checkbox" 
                         className="accent-primary w-4 h-4"
                         checked={formData["contact.whatsapp_same_as_mobile"] === "true" || formData["contact.whatsapp_same_as_mobile"] === true}
                         onChange={(e) => {
                            const isChecked = e.target.checked;
                            handleInputChange("contact.whatsapp_same_as_mobile", isChecked ? "true" : "false");
                            if (isChecked) {
                               // Copy from the Mobile Number field (or fallback to verified phoneNumber)
                               handleInputChange("contact.whatsapp_number", formData["contact.mobile_number"] || formData.phoneNumber || "");
                            }
                         }}
                         disabled={!isEditing}
                      />
                      Same as Mobile Number
                   </label>
                )
              }

              if (field.key === "contact.use_parent_guardian_as_emergency" || field.key === "contact.use_family_member_as_emergency") {
                return (
                   <label className="flex items-center gap-2 text-sm cursor-pointer mt-2 text-foreground">
                      <input 
                         type="checkbox" 
                         className="accent-primary w-4 h-4"
                         checked={formData[field.key] === "true" || formData[field.key] === true}
                         onChange={(e) => {
                            const isChecked = e.target.checked;
                            handleInputChange(field.key, isChecked ? "true" : "false");
                            if (isChecked) {
                               // Default to Father, fallback to Mother or Local Guardian if Father is not present
                               let name = formData["family.father_name"] || formData["family.mother_name"] || formData["family.local_guardian_name"] || "";
                               let mobile = formData["family.father_mobile"] || formData["family.mother_mobile"] || formData["family.local_guardian_mobile"] || "";
                               let email = formData["family.father_email"] || formData["family.mother_email"] || "";
                               let relation = formData["family.father_name"] ? "Father" : formData["family.mother_name"] ? "Mother" : formData["family.local_guardian_name"] ? "Guardian" : "";

                               if (name) handleInputChange("contact.emergency_contact_name", name);
                               if (mobile) handleInputChange("contact.emergency_contact_mobile", mobile);
                               if (email) handleInputChange("contact.emergency_contact_email", email);
                               // Auto-fill student's primary email from parent email if not yet filled
                               if (email && !formData["contact.personal_email"]) handleInputChange("contact.personal_email", email);
                               if (relation) handleInputChange("contact.emergency_contact_relation", relation);
                            }
                         }}
                         disabled={!isEditing}
                      />
                      {field.label}
                   </label>
                )
              }

              if (field.type === "checkbox") {
                 return (
                   <label className="flex items-center gap-2 text-sm cursor-pointer mt-2 text-foreground">
                      <input 
                         type="checkbox" 
                         className="accent-primary w-4 h-4"
                         checked={formData[field.key] === "true" || formData[field.key] === true}
                         onChange={(e) => isEditing && handleInputChange(field.key, e.target.checked ? "true" : "false")}
                         disabled={!isEditing}
                      />
                      {field.label}
                   </label>
                 )
              }

              // Handle Current Address hiding when same_as_permanent_address is true
              if (field.key.startsWith("contact.current_") && formData["contact.same_as_permanent_address"] === "true") {
                 return null;
              }

              if (field.key === "ug_university" || field.key === "pg_university" || field.key === "phd_university" || field.key === "bed_university") {
                return (
                  <>
                    <ResponsiveSelect
                      value={formData[field.key] || ""}
                      onChange={(e: any) => isEditing && handleInputChange(field.key, e.target.value)}
                      disabled={!isEditing}
                      placeholder={`Select ${field.label}...`}
                      className={cn("w-full transition-all", !isEditing && "bg-muted/30 border-input text-foreground cursor-not-allowed opacity-70")}
                    >
                      <option value="">Select University...</option>
                      {ERPUNIVERSITYLIST.map((u: string) => <option key={u} value={u}>{u}</option>)}
                      <option value="Other">Other (Please specify)</option>
                    </ResponsiveSelect>
                    {formData[field.key] === "Other" && (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                        <input 
                          type="text" 
                          placeholder={isEditing ? `Enter custom ${field.label}...` : ""}
                          className={cn("w-full p-2.5 rounded-md text-sm outline-none transition-all", isEditing ? "border border-input bg-background focus:ring-2 focus:ring-primary/50" : "border border-input bg-muted/30 text-foreground cursor-not-allowed opacity-70")}
                          value={formData[field.key + "_other"] || ""}
                          onChange={(e) => isEditing && handleInputChange(field.key + "_other", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>
                    )}
                  </>
                );
              }

              // Handle dynamic dropdowns for Degrees and Specializations
              if (field.key === "ug_degree" || field.key === "pg_degree" || field.key === "ug_specialization" || field.key === "pg_specialization" || field.key === "phd_specialization") {
                let options: string[] = [];
                if (field.key === "ug_degree") options = UG_DEGREE_OPTIONS;
                else if (field.key === "pg_degree") options = PG_DEGREE_OPTIONS;
                else if (field.key === "ug_specialization") options = UG_SPECIALIZATION_MAP[formData.ug_degree] || ["Other"];
                else if (field.key === "pg_specialization") options = PG_SPECIALIZATION_MAP[formData.pg_degree] || ["Other"];
                else if (field.key === "phd_specialization") options = PHD_SPECIALIZATION_OPTIONS;

                return (
                  <>
                    <Select 
                      value={formData[field.key] || ""} 
                      onValueChange={(val) => handleInputChange(field.key, val)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className={cn("w-full transition-all", isEditing ? "bg-background border-input" : "bg-muted/30 border-input text-foreground cursor-not-allowed opacity-70")}>
                        <SelectValue placeholder={`Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {formData[field.key] === "Other" && (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                        <input 
                          type="text" 
                          placeholder={isEditing ? `Enter custom ${field.label}...` : ""}
                          className={cn("w-full p-2.5 rounded-md text-sm outline-none transition-all", isEditing ? "border border-input bg-background focus:ring-2 focus:ring-primary/50" : "border border-input bg-muted/30 text-foreground cursor-not-allowed opacity-70")}
                          value={formData[field.key + "_other"] || ""}
                          onChange={(e) => isEditing && handleInputChange(field.key + "_other", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>
                    )}
                  </>
                );
              }

              // India Locations Cascading Logic
              if (field.key === "permanent_state" || field.key === "current_state" || field.key === "contact.permanent_state" || field.key === "contact.current_state") {
                const states = Object.keys(indiaLocations.states);
                return (
                  <>
                  <Select 
                    value={formData[field.key] || ""} 
                    onValueChange={(val) => handleInputChange(field.key, val)}
                    disabled={!isEditing}
                  >
                    <SelectTrigger className={cn("w-full transition-all", isEditing ? "bg-background border-input" : "bg-muted/30 border-input text-foreground cursor-not-allowed opacity-70")}>
                      <SelectValue placeholder="Select State / Province..." />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                      <SelectItem value="Other (Please specify)">Other (Please specify)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData[field.key] === "Other (Please specify)" && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                      <input 
                        type="text" 
                        placeholder={isEditing ? `ENTER YOUR STATE / PROVINCE` : ""}
                        className={cn("w-full p-2.5 rounded-md text-sm outline-none transition-all", isEditing ? "border border-input bg-background focus:ring-2 focus:ring-primary/50" : "border border-input bg-muted/30 text-foreground cursor-not-allowed opacity-70")}
                        value={formData[field.key + "_other"] || ""}
                        onChange={(e) => isEditing && handleInputChange(field.key + "_other", e.target.value)}
                        readOnly={!isEditing}
                      />
                    </div>
                  )}
                </>
                );
              }
              if (field.key === "permanent_district" || field.key === "current_district" || field.key === "contact.permanent_district" || field.key === "contact.current_district") {
                const stateKey = field.key.includes("permanent") ? (field.key.includes("contact.") ? "contact.permanent_state" : "permanent_state") : (field.key.includes("contact.") ? "contact.current_state" : "current_state");
                const selectedState = formData[stateKey];
                // @ts-ignore
                const districts = selectedState ? Object.keys(indiaLocations.states[selectedState] || {}) : [];
                return (
                  <>
                    <Select 
                    value={formData[field.key] || ""} 
                    onValueChange={(val) => handleInputChange(field.key, val)}
                    disabled={!selectedState || !isEditing}
                  >
                    <SelectTrigger className={cn("w-full transition-all", isEditing ? "bg-background border-input" : "bg-muted/30 border-input text-foreground cursor-not-allowed opacity-70")}>
                      <SelectValue placeholder="Select District / County..." />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      <SelectItem value="Other (Please specify)">Other (Please specify)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData[field.key] === "Other (Please specify)" && (
                    <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                      <input 
                        type="text" 
                        placeholder={isEditing ? `ENTER YOUR DISTRICT / COUNTY` : ""}
                        className={cn("w-full p-2.5 rounded-md text-sm outline-none transition-all", isEditing ? "border border-input bg-background focus:ring-2 focus:ring-primary/50" : "border border-input bg-muted/30 text-foreground cursor-not-allowed opacity-70")}
                        value={formData[field.key + "_other"] || ""}
                        onChange={(e) => isEditing && handleInputChange(field.key + "_other", e.target.value)}
                        readOnly={!isEditing}
                      />
                    </div>
                  )}
                </>
                );
              }

              if (field.type === "dropdown") {
                let options = field.options || [];
                
                // Inject dynamic options if they belong to department/designation
                if (field.key === "identity.department") {
                  options = departments.map(d => d.name);
                } else if (field.key === "identity.designation") {
                  options = designations.map(d => d.name);
                }
                
                // --- Location Cascading Logic ---
                const allStates = [...Object.keys(indiaLocations.states), ...Object.keys(indiaLocations.unionTerritories)].sort();
                if (field.key.endsWith("_state")) {
                  options = allStates;
                } else if (field.key.endsWith("_district")) {
                  const prefix = field.key.split("_district")[0];
                  const stateVal = formData[`${prefix}_state`];
                  if (stateVal && (indiaLocations.states[stateVal as keyof typeof indiaLocations.states] || indiaLocations.unionTerritories[stateVal as keyof typeof indiaLocations.unionTerritories])) {
                    const stateObj = indiaLocations.states[stateVal as keyof typeof indiaLocations.states] || indiaLocations.unionTerritories[stateVal as keyof typeof indiaLocations.unionTerritories] as any;
                    options = Object.keys(stateObj).sort();
                  } else {
                    options = [];
                  }
                } else if (field.key.endsWith("_taluka")) {
                  const prefix = field.key.split("_taluka")[0];
                  const stateVal = formData[`${prefix}_state`];
                  const distVal = formData[`${prefix}_district`];
                  if (stateVal && distVal) {
                    const stateObj = indiaLocations.states[stateVal as keyof typeof indiaLocations.states] || indiaLocations.unionTerritories[stateVal as keyof typeof indiaLocations.unionTerritories] as any;
                    options = stateObj?.[distVal] || [];
                  } else {
                    options = [];
                  }
                }
                // --- End Location Logic ---

                return (
                  <>
                    <Select 
                      value={formData[field.key] || ""} 
                      onValueChange={(val) => {
                         handleInputChange(field.key, val);
                         // If changing organization type or role category, clear downstream fields
                         if (field.key === "identity.organization_type" || field.key === "identity.role_category") {
                           handleInputChange("identity.department", "");
                           handleInputChange("identity.designation", "");
                         }
                         if (field.key === "identity.department") {
                           handleInputChange("identity.designation", "");
                         }
                         // Clear dependent location fields
                         if (field.key.endsWith("_state")) {
                           const prefix = field.key.split("_state")[0];
                           handleInputChange(`${prefix}_district`, "");
                           handleInputChange(`${prefix}_taluka`, "");
                         }
                         if (field.key.endsWith("_district")) {
                           const prefix = field.key.split("_district")[0];
                           handleInputChange(`${prefix}_taluka`, "");
                         }
                      }}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className={cn("w-full transition-all", isEditing ? "bg-background border-input" : "bg-muted/30 border-input text-foreground cursor-not-allowed opacity-70")}>
                        <SelectValue placeholder={
                          (field.key === "identity.department" && isLoadingDepartments) ? "Loading..." :
                          (field.key === "identity.designation" && isLoadingDesignations) ? "Loading..." :
                          `Select ${field.label}...`
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {options.map((opt: string) => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                        <SelectItem value="Other">Other (Please specify)</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData[field.key] === "Other" && (
                      <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                        <input 
                          type="text" 
                          placeholder={isEditing ? `Enter ${field.label.toUpperCase()}` : ""}
                          className={cn("w-full p-2.5 rounded-md text-sm outline-none transition-all", isEditing ? "border border-input bg-background focus:ring-2 focus:ring-primary/50" : "border border-input bg-muted/30 text-foreground cursor-not-allowed opacity-70")}
                          value={formData[field.key + "_other"] || ""}
                          onChange={(e) => isEditing && handleInputChange(field.key + "_other", e.target.value)}
                          readOnly={!isEditing}
                        />
                      </div>
                    )}
                  </>
                );
              }
                
              if (field.type === "date") {
                return (
                  <DateField 
                    field={field} 
                    value={formData[field.key] || ""} 
                    onChange={(val) => handleInputChange(field.key, val)}
                    disabled={!isEditing}
                  />
                );
              }
                
              if (field.type === "boolean") {
                return (
                  <div className={cn("flex items-center gap-4 mt-2 transition-all", !isEditing && "opacity-70 cursor-not-allowed pointer-events-none")}>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={field.key} value="yes" className="accent-primary w-4 h-4" disabled={!isEditing} /> Yes
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name={field.key} value="no" className="accent-primary w-4 h-4" defaultChecked disabled={!isEditing} /> No
                    </label>
                  </div>
                );
              }
                
              if (field.type === "file_list" || field.type === "image") {
                let existingUrl = formData[field.key] || "";
                if (!existingUrl && (field.key === "profilePicture" || field.key === "profile_photo")) {
                    existingUrl = formData.profile_photo || formData.profilePicture || formData.photoURL || "";
                }
                
                return (
                  <FileUploadField 
                    field={field}
                    value={existingUrl}
                    onChange={(val) => handleInputChange(field.key, val)}
                    disabled={!isEditing}
                  />
                );
              }
                
              if (field.type === "textarea") {
                return (
                  <textarea 
                    placeholder={isEditing && !field.readonly ? `Enter ${field.label}...` : ""}
                    className={cn(
                      "w-full p-2.5 rounded-md text-sm outline-none transition-all min-h-[100px] resize-y",
                      (isEditing && !field.readonly)
                        ? "border border-input bg-background focus:ring-2 focus:ring-primary/50" 
                        : "border border-input bg-muted/30 text-foreground cursor-not-allowed opacity-70"
                    )}
                    value={formData[field.key] || ""}
                    onChange={(e) => isEditing && !field.readonly && handleInputChange(field.key, e.target.value)}
                    readOnly={!isEditing || field.readonly}
                  />
                );
              }

              return (
                <input 
                  type={field.type === "number" ? "number" : "text"}
                  placeholder={isEditing && !field.key.includes('same_as_permanent') && !field.readonly ? `Enter ${field.label}...` : ""}
                  className={cn(
                    "w-full p-2.5 rounded-md text-sm outline-none transition-all",
                    (isEditing && !(field.key === "contact.whatsapp_number" && formData["contact.whatsapp_same_as_mobile"] === "true") && field.key !== "contact.personal_email" && !field.readonly)
                      ? "border border-input bg-background focus:ring-2 focus:ring-primary/50" 
                      : "border border-input bg-muted/30 text-foreground cursor-not-allowed opacity-70"
                  )}
                  value={formData[field.key] || ""}
                  onChange={(e) => isEditing && !field.readonly && handleInputChange(field.key, e.target.value)}
                  readOnly={!isEditing || (field.key === "contact.whatsapp_number" && formData["contact.whatsapp_same_as_mobile"] === "true") || field.key === "contact.personal_email" || field.readonly}
                />
              );
            };

            const renderFieldWrapper = (field: any) => {
              const input = renderFieldInput(field);
              if (!input) return null;
              return (
                <div key={field.key} className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </label>
                  {input}
                </div>
              );
            };

            if (section.key === "contact_details") {
               return (
                  <div className="space-y-6">
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Primary Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => ["contact.personal_email", "contact.alternate_email", "contact.mobile_number", "contact.whatsapp_number", "contact.whatsapp_same_as_mobile"].includes(f.key)).map(renderFieldWrapper)}
                        </div>
                     </div>
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Permanent Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => f.key.includes("permanent")).map(renderFieldWrapper)}
                        </div>
                     </div>
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Current Address</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => f.key.includes("current")).map(renderFieldWrapper)}
                        </div>
                     </div>
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Emergency Contact</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => f.key.includes("emergency_contact") || f.key.includes("use_parent")).map(renderFieldWrapper)}
                        </div>
                     </div>
                     {targetRole !== "student" && (
                       <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                          <h3 className="font-semibold text-[15px]">Official Contact</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             {section.fields.filter((f: any) => ["contact.work_email", "contact.official_phone", "contact.office_extension"].includes(f.key)).map(renderFieldWrapper)}
                          </div>
                       </div>
                     )}
                  </div>
               );
            }

            if (section.key === "personal_details") {
               return (
                  <div className="space-y-6">
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Basic Identity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => ["identity.profile_photo_url", "identity.first_name", "identity.middle_name", "identity.last_name", "identity.date_of_birth", "identity.gender", "identity.gender_other"].includes(f.key)).map(renderFieldWrapper)}
                        </div>
                     </div>
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Additional Personal Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => !["identity.profile_photo_url", "identity.first_name", "identity.middle_name", "identity.last_name", "identity.date_of_birth", "identity.gender", "identity.gender_other"].includes(f.key)).map(renderFieldWrapper)}
                        </div>
                     </div>
                  </div>
               );
            }

            if (section.key === "family_details") {
               return (
                  <div className="space-y-6">
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Father's Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => f.key.includes("father_")).map(renderFieldWrapper)}
                        </div>
                     </div>
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Mother's Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => f.key.includes("mother_")).map(renderFieldWrapper)}
                        </div>
                     </div>
                     <div className="bg-muted/10 border border-border p-5 rounded-lg space-y-4">
                        <h3 className="font-semibold text-[15px]">Local Guardian</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {section.fields.filter((f: any) => f.key.includes("local_guardian")).map((field: any) => {
                              if (field.key !== "family.has_local_guardian" && formData["family.has_local_guardian"] !== "Yes") return null;
                              return renderFieldWrapper(field);
                           })}
                        </div>
                     </div>
                  </div>
               );
            }

            // ── Education Sections — Accordion UI ──
            const educationSectionKeys = ["education_details", "faculty_education_details", "admin_education_details", "staff_education_details"];
            if (educationSectionKeys.includes(section.key)) {
              // Group education fields into logical buckets
              const buckets: { label: string; icon: string; keys: string[]; fields: any[] }[] = [
                { label: "Schooling (10th / 12th)", icon: "📚", keys: ["10th_", "12th_", "pcm_", "diploma_", "previous_"], fields: [] },
                { label: "Undergraduate (UG)", icon: "🎓", keys: ["ug_"], fields: [] },
                { label: "Postgraduate (PG)", icon: "📖", keys: ["pg_"], fields: [] },
                { label: "B.Ed", icon: "👨‍🏫", keys: ["bed_"], fields: [] },
                { label: "PhD / Doctorate", icon: "🔬", keys: ["phd_"], fields: [] },
                { label: "Entrance Exams & IDs", icon: "📝", keys: ["en_number", "cet_", "jee_", "entrance_", "eligibilityNo", "abc_id", "university_prn", "net_", "slet_"], fields: [] },
              ];
              const ungrouped: any[] = [];

              section.fields.forEach((field: any) => {
                let placed = false;
                for (const bucket of buckets) {
                  if (bucket.keys.some(k => field.key.startsWith(k) || field.key === k)) {
                    bucket.fields.push(field);
                    placed = true;
                    break;
                  }
                }
                if (!placed) ungrouped.push(field);
              });

              const nonEmptyBuckets = buckets.filter(b => b.fields.length > 0);
              // Expand first bucket by default
              const defaultOpen = nonEmptyBuckets.length > 0 ? [nonEmptyBuckets[0].label] : [];

              return (
                <div className="space-y-4">
                  <Accordion defaultValue={defaultOpen}>
                    {nonEmptyBuckets.map((bucket) => (
                      <AccordionItem key={bucket.label} value={bucket.label} className="border rounded-lg px-4 mb-3 bg-muted/10">
                        <AccordionTrigger className="text-[15px] font-semibold gap-2">
                          <span className="mr-2">{bucket.icon}</span> {bucket.label}
                          <span className="ml-2 text-xs font-normal text-muted-foreground">({bucket.fields.length} fields)</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {bucket.fields.map(renderFieldWrapper)}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  {ungrouped.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {ungrouped.map(renderFieldWrapper)}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {section.fields.map(renderFieldWrapper)}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-[600px] border rounded-xl overflow-hidden shadow-sm bg-card">
      {renderSidebar()}
      {renderContent()}
    </div>
  );
}

