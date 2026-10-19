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

import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Globe, Trash2, Eye, Upload, Plus, X, Palette, Image as ImageIcon, Link as LinkIcon, Building2, Layout, LayoutTemplate, Home, Users, User, ArrowLeft, ArrowRight, RotateCw, Lock, Pencil, ChevronsUpDown, Search, LayoutGrid, Megaphone, Briefcase } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { Dialog, DialogContent, DialogTrigger } from "@/components/marketing_ui/dialog";
import { Skeleton } from "@/components/marketing_ui/skeleton";
import { toast } from "sonner";

type BrandColorSettings = {
  primary?: string;
  secondary?: string;
};

type BrandingData = {
  logo_url: string;
  sidebar_logo_url?: string;
  favicon_url: string;
  campus_photo_url: string;
  social_links: {
    instagram_url?: string;
    youtube_url?: string;
    facebook_url?: string;
    linkedin_url?: string;
    twitter_url?: string;
    github_url?: string;
    website_url?: string;
  };
  site_title: string;
  has_custom_domain?: boolean;
  has_erp_domain: boolean;
  name: string;
  sidebar_name: string;
  brand_colors?: BrandColorSettings;
  theme_colors?: BrandColorSettings;
  branding?: {
    theme_colors?: BrandColorSettings;
  };
};

const DEFAULT_BRAND_COLORS = {
  primary: "#10b981", // Emerald 500
  secondary: "#059669", // Emerald 600
};
const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const normalizeHexInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
};

const isValidHexColor = (value: string) => HEX_COLOR_PATTERN.test(normalizeHexInput(value));

const toColorPickerValue = (value: string) => {
  const color = normalizeHexInput(value);
  const shortHex = color.match(/^#([0-9a-fA-F]{3})$/);
  if (shortHex?.[1]) {
    const [r = "", g = "", b = ""] = shortHex[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^#[0-9a-fA-F]{6}/.test(color)) return color.slice(0, 7);
  return "#000000";
};

const resolveBrandColors = (branding?: BrandingData) => {
  // If the user has explicitly saved their own colors in brand_colors, always respect them.
  if (branding?.brand_colors?.primary) {
    return {
      primary: normalizeHexInput(branding.brand_colors.primary),
      secondary: normalizeHexInput(branding.brand_colors.secondary || DEFAULT_BRAND_COLORS.secondary),
    };
  }

  // Otherwise, fallback to the system theme_colors or default colors.
  let primary = normalizeHexInput(
    branding?.theme_colors?.primary ||
    branding?.branding?.theme_colors?.primary ||
    DEFAULT_BRAND_COLORS.primary
  );
  
  let secondary = normalizeHexInput(
    branding?.theme_colors?.secondary ||
    branding?.branding?.theme_colors?.secondary ||
    DEFAULT_BRAND_COLORS.secondary
  );

  // If the backend returns the old system default blue and the user hasn't overridden it, show emerald green for previews.
  if (primary.toLowerCase() === "#6366f1") primary = "#10b981";
  if (secondary.toLowerCase() === "#4f46e5") secondary = "#059669";

  return { primary, secondary };
};

const SOCIAL_ICONS: Record<string, string> = {
  instagram_url: "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/instagram-2-1-logo-svgrepo-com.svg",
  youtube_url: "https://cdn.classgrid.in/youtube-icon.svg",
  facebook_url: "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/facebook-icon-logo-svgrepo-com.svg",
  linkedin_url: "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/linkedin-svgrepo-com.svg",
  twitter_url: "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/Untitled%20folder/new-twitter-x-logo-twitter-icon-x-social-media-icon-free-png.webp",
  github_url: "https://bumxgscngzjadyozdpce.supabase.co/storage/v1/object/public/LOGO%20AND%20%20SVG/Untitled%20folder/github-svgrepo-com.svg",
};

const ALL_SOCIAL_OPTIONS = [
  { value: "instagram_url", label: "Instagram" },
  { value: "youtube_url", label: "YouTube" },
  { value: "facebook_url", label: "Facebook" },
  { value: "linkedin_url", label: "LinkedIn" },
  { value: "twitter_url", label: "Twitter" },
  { value: "github_url", label: "GitHub" },
  { value: "website_url", label: "Website" },
];

function FieldEditor({ 
  label, 
  value, 
  onSave, 
  isSaving,
  placeholder, 
  maxLength 
}: { 
  label: string;
  value: string;
  onSave: (val: string, onSuccessCallback: () => void) => void;
  isSaving: boolean;
  placeholder: string;
  maxLength?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(localValue, () => setIsEditing(false));
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground">{label}</label>
      </div>

      <div className="flex flex-col gap-2">
        {isEditing ? (
          <input
            type="text"
            value={localValue}
            onChange={(e) => {
              const val = maxLength ? e.target.value.slice(0, maxLength) : e.target.value;
              setLocalValue(val);
            }}
            maxLength={maxLength}
            placeholder={placeholder}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        ) : (
          <div className="w-full bg-muted/20 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground min-h-[38px] flex items-center">
            {value ? value : <span className="text-muted-foreground italic">Not set</span>}
          </div>
        )}

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || !localValue.trim()} 
              className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? <Spinner size="sm" className="mr-2" /> : null} Save
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isSaving} 
              className="px-3 h-8"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsEditing(true)} 
            className="w-full text-xs font-medium h-8"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function ColorFieldEditor({ 
  label, 
  value, 
  onSave, 
  isSaving,
}: { 
  label: string;
  value: string;
  onSave: (val: string, onSuccessCallback: () => void) => void;
  isSaving: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(localValue, () => setIsEditing(false));
  };

  const handleCancel = () => {
    setLocalValue(value);
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] uppercase font-bold text-muted-foreground">{label}</label>
      </div>

      <div className="flex flex-col gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input type="color" value={toColorPickerValue(localValue || "")} onChange={e => setLocalValue(e.target.value)} className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-background p-1" />
            <input type="text" value={localValue} onChange={e => setLocalValue(e.target.value)} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary uppercase outline-none transition-all" />
          </div>
        ) : (
          <div className="w-full bg-muted/20 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground min-h-[38px] flex items-center gap-2">
            <div className="h-5 w-5 rounded-md shadow-sm border border-border/50 shrink-0" style={{ backgroundColor: value }} />
            <span className="uppercase">{value || <span className="text-muted-foreground italic">Not set</span>}</span>
          </div>
        )}

        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={isSaving || !isValidHexColor(localValue)} 
              className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSaving ? <Spinner size="sm" className="mr-2" /> : null} Save
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleCancel} 
              disabled={isSaving} 
              className="px-3 h-8"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setIsEditing(true)} 
            className="w-full text-xs font-medium h-8"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

function SocialLinkRow({ keyName, url, iconSrc, label, onUpdate, onRemove }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [localUrl, setLocalUrl] = useState(url);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(keyName, localUrl);
    setIsSaving(false);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center gap-3 w-32 shrink-0">
          {iconSrc ? <img src={iconSrc} alt={label} className="w-5 h-5 object-contain" /> : <LinkIcon size={16} className="text-muted-foreground" />}
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <input type="url" value={localUrl} onChange={e => setLocalUrl(e.target.value)} className="flex-1 w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
        <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">
          <Button size="sm" onClick={handleSave} disabled={isSaving || !localUrl.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            {isSaving ? <Spinner size="sm" /> : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setLocalUrl(url); setIsEditing(false); }} disabled={isSaving}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border border-border rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3 overflow-hidden">
        {iconSrc ? <img src={iconSrc} alt={label} className="w-5 h-5 object-contain shrink-0" /> : <LinkIcon size={16} className="text-muted-foreground shrink-0" />}
        <span className="text-sm font-semibold text-foreground w-20 sm:w-24 shrink-0">{label}</span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary truncate block">
          {url}
        </a>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => setIsEditing(true)}>
          <Pencil size={14} />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onRemove(keyName)}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

export function OrgBrandingCard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const campusInputRef = useRef<HTMLInputElement>(null);

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropType, setCropType] = useState<"logo" | "sidebar_logo" | "favicon" | "campus">("logo");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const [localSiteTitle, setLocalSiteTitle] = useState("");
  const [localName, setLocalName] = useState("");
  const [localSidebarName, setLocalSidebarName] = useState("");
  
  const [brandColors, setBrandColors] = useState(DEFAULT_BRAND_COLORS);

  const [selectedPlatform, setSelectedPlatform] = useState("instagram_url");
  const [platformUrl, setPlatformUrl] = useState("");

  const { data, isLoading } = useQuery<BrandingData>({
    queryKey: ["org-branding"],
    queryFn: () => apiClient.get("/api/org-admin/branding").then((r) => r.data),
  });

  const availableSocialOptions = ALL_SOCIAL_OPTIONS.filter(
    (opt) => !(data?.social_links as any)?.[opt.value]
  );

  React.useEffect(() => {
    if (availableSocialOptions.length > 0) {
      if (!selectedPlatform || !availableSocialOptions.some(opt => opt.value === selectedPlatform)) {
        setSelectedPlatform(availableSocialOptions[0].value);
      }
    } else {
      setSelectedPlatform("");
    }
  }, [data?.social_links, selectedPlatform]);

  const updateBranding = useMutation({
    mutationFn: (updates: Partial<BrandingData>) => apiClient.patch("/api/org-admin/branding", updates),
    onSuccess: (res, variables) => {
      if (res.data?.branding) {
        queryClient.setQueryData(["org-branding"], (old: any) => ({ ...old, ...res.data.branding }));
      } else {
        queryClient.setQueryData(["org-branding"], (old: any) => ({ ...old, ...variables }));
      }
      queryClient.invalidateQueries({ queryKey: ["org-branding"] });
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
    },
  });

  React.useEffect(() => {
    if (data) {
      if (data.site_title) {
        document.title = data.site_title;
        setLocalSiteTitle(data.site_title);
      }
      if (data.name) setLocalName(data.name);
      if (data.sidebar_name) setLocalSidebarName(data.sidebar_name);
      setBrandColors(resolveBrandColors(data));
      
      if (data.favicon_url) {
        const faviconLink = document.getElementById('favicon-link') as HTMLLinkElement;
        const cacheBustedUrl = `${data.favicon_url}?t=${Date.now()}`;
        if (faviconLink) faviconLink.href = cacheBustedUrl;
      }
    }
  }, [data]);

  const openCropper = (file: File, type: "logo" | "sidebar_logo" | "favicon" | "campus") => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`Please select an image smaller than 5MB.`);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      setCropSrc(e.target?.result as string);
      setCropType(type);
      setCropOpen(true);
    };
  };

  const uploadToS3 = async (blob: Blob, type: "logo" | "sidebar_logo" | "favicon" | "campus") => {
    const loadingToast = toast.loading(`Uploading ${type}...`);
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const fileName = `${type}.${ext}`;
      
      const { data } = await apiClient.post("/api/user/upload-aws-url", {
        fileName,
        fileType: blob.type
      });

      const response = await fetch(data.uploadUrl, {
        method: "PUT",
        body: blob,
        headers: { "Content-Type": blob.type }
      });

      if (!response.ok) throw new Error(`Upload failed`);

      let payload = {};
      if (type === "logo") payload = { logo_url: data.publicUrl };
      else if (type === "sidebar_logo") payload = { sidebar_logo_url: data.publicUrl };
      else if (type === "favicon") payload = { favicon_url: data.publicUrl };
      else if (type === "campus") payload = { campus_photo_url: data.publicUrl };

      await updateBranding.mutateAsync(payload);
      
      toast.success(`${type} updated successfully!`, { id: loadingToast });
      setCropOpen(false);
    } catch (err) {
      toast.error(`Failed to upload ${type}`, { id: loadingToast });
    }
  };

  const handleDeleteAsset = async (key: string) => {
    try {
      await updateBranding.mutateAsync({ [key]: null });
      toast.success("Asset deleted successfully!");
    } catch (err) {
      toast.error("Failed to delete asset");
    }
  };

  const handleAddSocialLink = async () => {
    if (!platformUrl.trim() || !platformUrl.startsWith("http")) {
      toast.error("Please enter a valid HTTP/HTTPS URL");
      return;
    }
    const currentLinks = data?.social_links || {};
    await updateBranding.mutateAsync({
      social_links: { ...currentLinks, [selectedPlatform]: platformUrl.trim() }
    });
    setPlatformUrl("");
    toast.success("Social link added successfully!");
  };

  const handleRemoveSocialLink = async (key: string) => {
    const currentLinks = { ...(data?.social_links || {}) };
    delete (currentLinks as any)[key];
    await updateBranding.mutateAsync({ social_links: currentLinks });
    toast.success("Social link removed!");
  };

  const handleUpdateSocialLink = async (key: string, url: string) => {
    const currentLinks = data?.social_links || {};
    await updateBranding.mutateAsync({
      social_links: { ...currentLinks, [key]: url.trim() }
    });
    toast.success("Social link updated successfully!");
  };

  const handleSaveIdentity = async (updates: Partial<BrandingData>, onSuccess: () => void) => {
    await updateBranding.mutateAsync(updates);
    toast.success("Identity updated successfully!");
    onSuccess();
  };

  const handleSaveBrandColors = async () => {
    const payload = {
      primary: normalizeHexInput(brandColors.primary),
      secondary: normalizeHexInput(brandColors.secondary),
    };
    if (!HEX_COLOR_PATTERN.test(payload.primary) || !HEX_COLOR_PATTERN.test(payload.secondary)) {
      toast.error("Enter valid hex colors.");
      return;
    }
    await updateBranding.mutateAsync({ brand_colors: payload });
    toast.success("Theme colors updated successfully!");
  };

  // UI Components
  const SectionHeader = ({ num, title, description }: { num: number, title: string, description: string }) => (
    <div className="flex flex-col gap-1 mb-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{num}</span>
        {title}
      </h3>
      <p className="text-xs text-muted-foreground ml-7">{description}</p>
    </div>
  );

  const AssetRow = ({ 
    title, description, imgUrl, onUploadClick, type, fallbackIcon, onDelete 
  }: { 
    title: string, description: string, imgUrl?: string, onUploadClick: () => void, type: string, fallbackIcon: React.ReactNode, onDelete?: () => void 
  }) => (
    <div className="flex items-center justify-between py-3 group">
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 rounded-lg border border-border bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
          {imgUrl ? (
             <img src={imgUrl} alt={title} className="w-full h-full object-contain p-1" />
          ) : (
            <div className="text-muted-foreground opacity-50">{fallbackIcon}</div>
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {imgUrl && (
          <>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="shrink-0 bg-background shadow-sm hover:bg-accent h-8 px-3">
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl sm:max-w-xl">
                <div className="flex items-center justify-center p-2">
                  <img src={imgUrl} alt={title} className="max-w-full max-h-[70vh] object-contain rounded-md" />
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={onDelete} disabled={updateBranding.isPending} className="shrink-0 bg-background shadow-sm text-destructive hover:bg-destructive/10 border-destructive/20 h-8 w-8">
              <Trash2 size={16} />
            </Button>
          </>
        )}
        <Button variant="outline" size="sm" onClick={onUploadClick} className="shrink-0 bg-background shadow-sm hover:bg-accent h-8 px-3">
          {imgUrl ? "Change" : "Upload"}
        </Button>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="bg-card border border-border rounded-xl shadow-sm mb-6 p-5 space-y-6">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-4 pt-4">
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
        <Skeleton className="h-[200px] w-full rounded-xl" />
      </div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm mb-6">
      <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
            <Palette size={18} className="text-foreground" /> Organization Branding
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Manage logos, favicon, website title, colors, and social links.</p>
        </div>
      </div>

      <div className="flex flex-col gap-10 p-5 sm:p-6">
          
        {/* 1. Brand Preview */}
        <div className="flex flex-col">
          <SectionHeader num={1} title="Brand Preview" description="See how your branding will appear across the platform." />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 ml-0 sm:ml-7">
            {/* Sidebar Preview */}
            <div className="border border-border/40 rounded-xl p-5 flex flex-col items-center gap-4 bg-background">
              <span className="text-sm font-bold text-foreground">Sidebar Preview</span>
              <div className="w-full max-w-[200px] border border-border/40 rounded-xl bg-background p-3.5 flex flex-col gap-3.5 h-[270px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
                
                {/* Org header */}
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 text-white shadow-sm ${data?.sidebar_logo_url ? 'bg-transparent' : ''}`}
                    style={data?.sidebar_logo_url ? {} : { backgroundColor: brandColors.primary }}
                  >
                    {data?.sidebar_logo_url ? <img src={data.sidebar_logo_url} className="w-full h-full object-contain rounded-xl" /> : <Building2 size={18} />}
                  </div>
                  <div className="flex flex-col flex-1 truncate">
                    <span className="text-[14px] font-bold truncate text-foreground leading-tight">{localSidebarName || data?.sidebar_name || "Organization"}</span>
                    <span className="text-[11px] text-primary leading-tight mt-0.5">Org Admin</span>
                  </div>
                  <ChevronsUpDown size={14} className="text-foreground shrink-0" />
                </div>
                
                {/* Search */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 border border-border/60 rounded-lg text-muted-foreground mt-0.5">
                  <Search size={14} />
                  <span className="text-[12px]">Search...</span>
                </div>

                {/* Main Nav */}
                <div className="flex flex-col gap-4 mt-1 px-1">
                  <div className="flex items-center gap-3 text-foreground">
                    <LayoutGrid size={16} strokeWidth={2} /> <span className="text-[13px] font-medium">Overview</span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <Megaphone size={16} strokeWidth={2} /> <span className="text-[13px] font-medium">Announcements</span>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-border/40 my-1" />

                {/* Sub Nav */}
                <div className="flex flex-col gap-4 px-1">
                  <div className="flex items-center gap-3 text-foreground">
                    <Users size={16} strokeWidth={2} /> <span className="text-[13px] font-medium">Students</span>
                  </div>
                  <div className="flex items-center gap-3 text-foreground">
                    <Briefcase size={16} strokeWidth={2} /> <span className="text-[13px] font-medium">Faculty</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Login Preview */}
            <div className="border border-border/40 rounded-xl p-5 flex flex-col items-center gap-4 bg-background">
              <span className="text-sm font-bold text-foreground">Login Page Preview</span>
              <div className="w-full max-w-[200px] rounded-xl overflow-hidden h-56 relative flex flex-col items-center shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-border/20">
                <div 
                  className="absolute inset-0 z-0 opacity-90" 
                  style={data?.campus_photo_url ? {} : { background: `linear-gradient(135deg, ${brandColors.primary}bb, ${brandColors.secondary})` }}
                >
                  {data?.campus_photo_url && <img src={data.campus_photo_url} className="w-full h-full object-cover blur-[1px]" />}
                </div>
                <div className="absolute inset-0 z-0 bg-gradient-to-t from-background/20 to-transparent" />
                
                <div className="relative z-10 w-16 h-16 bg-white rounded-full mt-6 flex items-center justify-center shadow-lg overflow-hidden border-4 border-white/20">
                  {data?.logo_url ? <img src={data.logo_url} className="w-full h-full object-contain p-2" /> : <Building2 size={26} style={{ color: brandColors.primary }} />}
                </div>

                <div className="relative z-10 mt-auto mb-3 w-[85%] bg-white rounded-xl shadow-xl flex flex-col items-center p-3.5 gap-2.5">
                  <span className="text-[13px] font-bold text-black truncate w-full text-center tracking-tight">{localName || data?.name || "Organization"}</span>
                  <a 
                    href="/login"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 rounded-md text-white text-[11px] font-semibold text-center shadow-sm block hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: brandColors.primary }}
                  >
                    Sign in
                  </a>
                </div>
              </div>
            </div>

            {/* Tab Preview */}
            <div className="border border-border/40 rounded-xl p-5 flex flex-col items-center gap-4 bg-background">
              <span className="text-sm font-bold text-foreground">Browser Tab Preview</span>
              <div className="w-full max-w-[240px] rounded-xl overflow-hidden h-56 border border-border/40 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col bg-background">
                <div className="bg-muted/50 dark:bg-muted/30 h-10 flex items-end px-2 pt-2 gap-1 relative z-0">
                  <div className="bg-background h-[28px] rounded-t-lg px-3 flex items-center gap-2 min-w-[130px] shadow-sm relative z-10 border-t border-x border-border/20">
                    <div className="w-3.5 h-3.5 flex items-center justify-center shrink-0">
                      {data?.favicon_url ? <img src={data.favicon_url} className="w-full h-full object-contain" /> : <Building2 size={12} style={{ color: brandColors.primary }} />}
                    </div>
                    <span className="text-[11px] font-semibold text-foreground truncate flex-1">{localSiteTitle || data?.site_title || "Organization"}</span>
                    <X size={10} className="text-muted-foreground shrink-0 hover:text-foreground cursor-pointer" />
                  </div>
                </div>
                <div className="bg-background h-10 border-b border-border/40 flex items-center px-2.5 gap-3 relative z-20 shadow-sm">
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <ArrowLeft size={13} strokeWidth={2.5} />
                    <ArrowRight size={13} strokeWidth={2.5} className="opacity-30" />
                    <RotateCw size={12} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 h-6 bg-muted/50 dark:bg-muted/30 rounded-full flex items-center px-3 gap-2">
                    <Lock size={10} className="text-muted-foreground" />
                  </div>
                </div>
                <div className="flex-1 bg-background" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. Brand Assets */}
        <div className="flex flex-col">
          <SectionHeader num={2} title="Brand Assets" description="Upload your logos, favicon and campus photo." />
          
          <div className="flex flex-col ml-7 divide-y divide-border">
            <AssetRow 
              title="College Logo" description="Displayed on Login Page and Admin Sidebar."
              imgUrl={data?.logo_url} type="logo" fallbackIcon={<Building2 size={24} />}
              onUploadClick={() => fileInputRef.current?.click()}
              onDelete={() => handleDeleteAsset("logo_url")}
            />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) openCropper(f, "logo"); if (fileInputRef.current) fileInputRef.current.value = ""; }} />

            <AssetRow 
              title="Sidebar Logo" description="Displayed in the top-left sidebar menu."
              imgUrl={data?.sidebar_logo_url} type="sidebar_logo" fallbackIcon={<Layout size={24} />}
              onUploadClick={() => sidebarLogoInputRef.current?.click()}
              onDelete={() => handleDeleteAsset("sidebar_logo_url")}
            />
            <input type="file" ref={sidebarLogoInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) openCropper(f, "sidebar_logo"); if (sidebarLogoInputRef.current) sidebarLogoInputRef.current.value = ""; }} />

            {data?.has_erp_domain && (
              <>
                <AssetRow 
                  title="Custom Favicon" description="Browser tab icon. PNG format (32x32 px)."
                  imgUrl={data?.favicon_url} type="favicon" fallbackIcon={<Globe size={24} />}
                  onUploadClick={() => faviconInputRef.current?.click()}
                  onDelete={() => handleDeleteAsset("favicon_url")}
                />
                <input type="file" ref={faviconInputRef} className="hidden" accept="image/png, image/jpeg" onChange={(e) => { const f = e.target.files?.[0]; if (f) openCropper(f, "favicon"); if (faviconInputRef.current) faviconInputRef.current.value = ""; }} />

                <AssetRow 
                  title="Campus Photo" description="Background for login page. Recommended 1350x1800px."
                  imgUrl={data?.campus_photo_url} type="campus" fallbackIcon={<ImageIcon size={24} />}
                  onUploadClick={() => campusInputRef.current?.click()}
                  onDelete={() => handleDeleteAsset("campus_photo_url")}
                />
                <input type="file" ref={campusInputRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) openCropper(f, "campus"); if (campusInputRef.current) campusInputRef.current.value = ""; }} />
              </>
            )}
          </div>
        </div>

        {/* 3. Organization Identity */}
        <div className="flex flex-col">
          <SectionHeader num={3} title="Organization Identity" description="Set the names and title used across the platform." />
          
          <div className="flex flex-col gap-6 ml-7 max-w-sm">
            {data?.has_erp_domain && (
              <FieldEditor
                label="Browser Tab Title"
                value={data?.site_title || ""}
                placeholder="Institution - Home"
                isSaving={updateBranding.isPending}
                onSave={(site_title, onSuccess) => handleSaveIdentity({ site_title }, onSuccess)}
              />
            )}
            
            <FieldEditor
              label="Institution Name (Full)"
              value={data?.name || ""}
              placeholder="Vishwakarma Institute..."
              isSaving={updateBranding.isPending}
              onSave={(name, onSuccess) => handleSaveIdentity({ name }, onSuccess)}
            />
            
            <FieldEditor
              label="Sidebar Short Name"
              value={data?.sidebar_name || ""}
              placeholder="VIT"
              maxLength={22}
              isSaving={updateBranding.isPending}
              onSave={(sidebar_name, onSuccess) => handleSaveIdentity({ sidebar_name }, onSuccess)}
            />
          </div>
        </div>

        {/* 4. Theme Colors */}
        {data?.has_custom_domain && (
          <div className="flex flex-col">
            <SectionHeader num={4} title="Theme Colors" description="Choose primary and secondary colors for the public website." />
            
            <div className="flex flex-col gap-6 ml-7 max-w-sm">
              <ColorFieldEditor
                label="Primary Color"
                value={brandColors.primary}
                isSaving={updateBranding.isPending}
                onSave={(val, onSuccess) => {
                  updateBranding.mutate({
                    brand_colors: { primary: val, secondary: brandColors.secondary },
                  }, { onSuccess: () => { toast.success("Primary color updated"); onSuccess(); setBrandColors(c => ({...c, primary: val})); }});
                }}
              />
              <ColorFieldEditor
                label="Secondary Color"
                value={brandColors.secondary}
                isSaving={updateBranding.isPending}
                onSave={(val, onSuccess) => {
                  updateBranding.mutate({
                    brand_colors: { primary: brandColors.primary, secondary: val },
                  }, { onSuccess: () => { toast.success("Secondary color updated"); onSuccess(); setBrandColors(c => ({...c, secondary: val})); }});
                }}
              />
            </div>
          </div>
        )}

        {/* 5. Social Links */}
        {data?.has_erp_domain && (
          <div className="flex flex-col">
            <SectionHeader num={5} title="Social Links" description="Add your social media links to display on the login page." />
            
            <div className="flex flex-col ml-7">
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform} disabled={availableSocialOptions.length === 0}>
                  <SelectTrigger className="w-full sm:w-[160px] bg-background border-border h-10 focus:ring-1 focus:ring-emerald-500">
                    <SelectValue placeholder={availableSocialOptions.length === 0 ? "All Added" : "Platform"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSocialOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <input type="url" placeholder="https://..." value={platformUrl} onChange={e => setPlatformUrl(e.target.value)} disabled={availableSocialOptions.length === 0} className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm h-10 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 max-w-sm disabled:opacity-50" />
                
                <Button onClick={handleAddSocialLink} disabled={!platformUrl.trim() || updateBranding.isPending || availableSocialOptions.length === 0} className="h-10 shrink-0 px-6 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50">
                  Add Link
                </Button>
              </div>

              <div className="flex flex-col gap-2 max-w-2xl">
                {data?.social_links && Object.keys(data.social_links).length > 0 ? Object.entries(data.social_links).map(([key, url]) => {
                  if (!url) return null;
                  const label = key.replace("_url", "").charAt(0).toUpperCase() + key.replace("_url", "").slice(1);
                  const iconSrc = SOCIAL_ICONS[key];
                  
                  return (
                    <SocialLinkRow 
                      key={key} 
                      keyName={key} 
                      url={url} 
                      iconSrc={iconSrc} 
                      label={label} 
                      onUpdate={handleUpdateSocialLink} 
                      onRemove={handleRemoveSocialLink} 
                    />
                  );
                }) : (
                  <div className="text-center py-6 text-sm text-muted-foreground border border-dashed border-border rounded-lg bg-muted/10">
                    No social links added yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <ImageCropperModal
        isOpen={cropOpen}
        onClose={() => setCropOpen(false)}
        imageSrc={cropSrc}
        aspectRatio={cropType === "favicon" ? 1 : cropType === "campus" ? 0.75 : undefined}
        circularCrop={cropType === "favicon"}
        title={`Crop ${cropType}`}
        onCropComplete={(blob) => uploadToS3(blob, cropType)}
      />
    </div>
  );
}
