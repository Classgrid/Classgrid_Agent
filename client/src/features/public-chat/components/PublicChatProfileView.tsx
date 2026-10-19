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
import React, { useState } from "react";
import { User, Globe } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { NikhilTimeCalendar } from "@/components/marketing_ui/nikhil_time_calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useQueryClient } from "@tanstack/react-query";

export function PublicChatProfileView({ profileData, isReadOnly }: { profileData: any, isReadOnly?: boolean }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Record<string, any>>({
    ...(profileData || {}),
    ...(profileData?.metadata || {})
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pendingWhatsappNumber, setPendingWhatsappNumber] = useState("");

  React.useEffect(() => {
    if (profileData) {
      const nameParts = (profileData.name || "").trim().split(/\s+/);
      const m = profileData.metadata || {};
      setFormData(prev => ({
        ...prev,
        ...profileData,
        ...m,
        "identity.first_name": m?.["identity.first_name"] || nameParts[0] || "",
        "identity.last_name": m?.["identity.last_name"] || nameParts.slice(1).join(" ") || "",
        "whatsapp_number": m?.["whatsapp_number"] || "",
        "age": m?.["age"] || "",
        "job_role": m?.["job_role"] || "",
        "linkedin_url": m?.["linkedin_url"] || m?.["linkedin_url"] || "",
        "github_url": m?.["github_url"] || m?.["github_url"] || "",
        "twitter_url": m?.["twitter_url"] || m?.["twitter_url"] || "",
        "coding_profile": m?.["coding_profile"] || m?.["coding_profile"] || "",
        "portfolio_url": m?.["portfolio_url"] || m?.["portfolio_url"] || "",
        "instagram_url": m?.["instagram_url"] || m?.["instagram_url"] || "",
        "facebook_url": m?.["facebook_url"] || m?.["facebook_url"] || "",
        "tech_stack": m?.["tech_stack"] || m?.["tech_stack"] || "",
      }));
    }
  }, [profileData]);

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSendWhatsappOtp = async () => {
    let num = formData["whatsapp_number"] || "";
    
    // Remove any spaces, plus signs, or dashes
    num = num.replace(/[\s+-]/g, "");

    // Check if it's empty or contains letters
    if (!num.trim() || isNaN(Number(num))) {
      return toast.error("Please enter a valid numeric phone number.");
    }

    // Check length (assuming 10 digits for India + optional country code)
    if (num.length < 10 || num.length > 15) {
      return toast.error("Please enter a valid 10-digit phone number.");
    }

    // Auto-prepend 91 if it's exactly 10 digits (assuming Indian users)
    if (num.length === 10) {
      num = "91" + num;
    }

    setIsSendingOtp(true);
    try {
      await apiClient.post("/api/user/send-whatsapp-otp", { phoneNumber: num });
      setOtpSent(true);
      setPendingWhatsappNumber(num);
      toast.success("OTP sent to WhatsApp!");
    } catch (error: any) {
      toast.error(error?.message || error?.response?.data?.message || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyWhatsappOtp = async () => {
    if (!otpValue.trim()) return toast.error("Please enter the OTP");
    setIsVerifyingOtp(true);
    try {
      await apiClient.post("/api/user/verify-whatsapp-otp", { otp: otpValue });
      toast.success("WhatsApp number verified successfully!");
      setOtpSent(false);
      setOtpValue("");
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    } catch (error: any) {
      toast.error(error?.message || error?.response?.data?.message || "Invalid OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const firstName = (formData["identity.first_name"] || "").trim();
      const lastName = (formData["identity.last_name"] || "").trim();
      const fullName = [firstName, lastName].filter(Boolean).join(" ");

      await apiClient.put("/api/user/update", {
        name: fullName || undefined,
        dob: formData["identity.date_of_birth"] || formData.dob || null,
        bio: formData["bio"] || formData.bio || "",
        hobby: formData["hobby"] || formData.hobby || "",
        metadata: {
          "identity.first_name": firstName,
          "identity.last_name": lastName,
          "identity.date_of_birth": formData["identity.date_of_birth"] || "",
          "bio": formData["bio"] || formData.bio || "",
          "hobby": formData["hobby"] || formData.hobby || "",
          "whatsapp_number": formData["whatsapp_number"] || "",
          "age": formData["age"] || "",
          "job_role": formData["job_role"] || "",
          "tech_stack": formData["tech_stack"] || "",
          "linkedin_url": formData["linkedin_url"] || "",
          "github_url": formData["github_url"] || "",
          "twitter_url": formData["twitter_url"] || "",
          "coding_profile": formData["coding_profile"] || "",
          "portfolio_url": formData["portfolio_url"] || "",
          "instagram_url": formData["instagram_url"] || "",
          "facebook_url": formData["facebook_url"] || "",
        }
      });
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || error?.response?.data?.message || "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const dobValue = formData["identity.date_of_birth"] || formData.dob || "";
  const dobDate = dobValue ? new Date(dobValue) : undefined;

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto">
      <div className="border rounded-xl bg-card shadow-sm overflow-hidden mt-2">
        <div className="border-b bg-muted/10 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Basic Information
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Your primary identity details linked to the core backend.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? <span className="flex items-center gap-2"><Spinner className="w-3 h-3" /> Saving...</span> : "Save"}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
            )}
          </div>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">First Name</label>
            <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["identity.first_name"] || ""} onChange={e => handleInputChange("identity.first_name", e.target.value)} disabled={!isEditing} placeholder="e.g. Nikhil" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Last Name</label>
            <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["identity.last_name"] || ""} onChange={e => handleInputChange("identity.last_name", e.target.value)} disabled={!isEditing} placeholder="e.g. Shinde" />
          </div>
<div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Age</label>
            <input type="number" className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["age"] || ""} onChange={e => handleInputChange("age", e.target.value)} disabled={!isEditing} placeholder="e.g. 25" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Job Role</label>
            <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["job_role"] || ""} onChange={e => handleInputChange("job_role", e.target.value)} disabled={!isEditing} placeholder="e.g. Software Engineer" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Date of Birth</label>
            <NikhilTimeCalendar
              value={dobDate}
              onChange={(date: Date | undefined) => {
                if (date) {
                  handleInputChange("identity.date_of_birth", date.toISOString());
                  handleInputChange("dob", date.toISOString());
                } else {
                  handleInputChange("identity.date_of_birth", "");
                  handleInputChange("dob", "");
                }
              }}
              showTime={false}
              placeholder="Not specified"
              className={cn("w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10", !isEditing && "pointer-events-none opacity-60")}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Bio</label>
            <textarea className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10 resize-none" rows={3} value={formData["bio"] || formData.bio || ""} onChange={e => handleInputChange("bio", e.target.value)} disabled={!isEditing} placeholder="A short bio about yourself" />
          </div>
          {(!isReadOnly || !profileData?.privacySettings?.hideHobbies) && (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Hobbies</label>
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["hobby"] || formData.hobby || ""} onChange={e => handleInputChange("hobby", e.target.value)} disabled={!isEditing} placeholder="e.g. Reading, Coding, Travel" />
            </div>
          )}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              WhatsApp Number
              {profileData?.metadata?.whatsapp_number && profileData?.metadata?.whatsapp_number === formData["whatsapp_number"] && (
                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">Verified</span>
              )}
            </label>
            <div className="flex gap-2 items-start">
              <input 
                className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" 
                value={formData["whatsapp_number"] || ""} 
                onChange={e => {
                  handleInputChange("whatsapp_number", e.target.value);
                  setOtpSent(false);
                }} 
                disabled={!isEditing || otpSent || (profileData?.metadata?.whatsapp_number && profileData?.metadata?.whatsapp_number === formData["whatsapp_number"])} 
                placeholder="e.g. 919876543210 (include country code)" 
              />
              {isEditing && profileData?.metadata?.whatsapp_number === formData["whatsapp_number"] && formData["whatsapp_number"] && (
                <Button size="sm" type="button" variant="outline" onClick={() => {
                  handleInputChange("whatsapp_number", "");
                  setOtpSent(false);
                }}>
                  Change
                </Button>
              )}
              {isEditing && profileData?.metadata?.whatsapp_number !== formData["whatsapp_number"] && !otpSent && (
                <Button size="sm" type="button" variant="secondary" onClick={handleSendWhatsappOtp} disabled={isSendingOtp || !formData["whatsapp_number"]}>
                  {isSendingOtp ? <Spinner className="w-3 h-3" /> : "Verify"}
                </Button>
              )}
            </div>
            {otpSent && isEditing && (
              <div className="mt-2 flex gap-2 items-center bg-muted/20 p-3 rounded-md border">
                <input
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter 6-digit OTP"
                  value={otpValue}
                  onChange={e => setOtpValue(e.target.value)}
                  maxLength={6}
                />
                <Button size="sm" type="button" onClick={handleVerifyWhatsappOtp} disabled={isVerifyingOtp || !otpValue}>
                  {isVerifyingOtp ? <Spinner className="w-3 h-3" /> : "Confirm"}
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => setOtpSent(false)}>Cancel</Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Used for AI scheduling and important platform notifications.</p>
          </div>
        </div>
      </div>

      <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
        <div className="border-b bg-muted/10 px-6 py-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" /> Social Status
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Your public links, developer profiles and tech stack.</p>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium text-foreground">Tech Stack</label>
            <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["tech_stack"] || ""} onChange={e => handleInputChange("tech_stack", e.target.value)} disabled={!isEditing} placeholder="e.g. React, Node.js, AWS" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">LinkedIn</label>
            <div className="relative">
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["linkedin_url"] || ""} onChange={e => handleInputChange("linkedin_url", e.target.value)} disabled={!isEditing} placeholder="https://linkedin.com/in/..." />
              {!isEditing && formData["linkedin_url"] && (
                <a href={formData["linkedin_url"]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">GitHub</label>
            <div className="relative">
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["github_url"] || ""} onChange={e => handleInputChange("github_url", e.target.value)} disabled={!isEditing} placeholder="https://github.com/..." />
              {!isEditing && formData["github_url"] && (
                <a href={formData["github_url"]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Twitter / X</label>
            <div className="relative">
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["twitter_url"] || ""} onChange={e => handleInputChange("twitter_url", e.target.value)} disabled={!isEditing} placeholder="https://x.com/..." />
              {!isEditing && formData["twitter_url"] && (
                <a href={formData["twitter_url"]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Coding Profile (LeetCode/HackerRank)</label>
            <div className="relative">
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["coding_profile"] || ""} onChange={e => handleInputChange("coding_profile", e.target.value)} disabled={!isEditing} placeholder="https://leetcode.com/..." />
              {!isEditing && formData["coding_profile"] && (
                <a href={formData["coding_profile"]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Portfolio Website</label>
            <div className="relative">
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["portfolio_url"] || ""} onChange={e => handleInputChange("portfolio_url", e.target.value)} disabled={!isEditing} placeholder="https://yourwebsite.com" />
              {!isEditing && formData["portfolio_url"] && (
                <a href={formData["portfolio_url"]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Instagram</label>
            <div className="relative">
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["instagram_url"] || ""} onChange={e => handleInputChange("instagram_url", e.target.value)} disabled={!isEditing} placeholder="https://instagram.com/..." />
              {!isEditing && formData["instagram_url"] && (
                <a href={formData["instagram_url"]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Facebook</label>
            <div className="relative">
              <input className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed placeholder:text-muted-foreground/30 disabled:text-foreground disabled:bg-muted/10" value={formData["facebook_url"] || ""} onChange={e => handleInputChange("facebook_url", e.target.value)} disabled={!isEditing} placeholder="https://facebook.com/..." />
              {!isEditing && formData["facebook_url"] && (
                <a href={formData["facebook_url"]} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10 cursor-pointer" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


