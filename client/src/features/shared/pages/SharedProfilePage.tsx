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

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { X, Save, Shield, Camera, Loader, Mail, Phone, Heart, 
  Lock, Smartphone, Globe, Calendar, Clock,
  Palette, Activity, BadgeCheck, ShieldAlert,
  Instagram, Facebook, Linkedin, Github, FileBox, Users, Edit, ChevronRight
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { Textarea } from "@/components/marketing_ui/textarea";
import { DEFAULT_BANNER, DEFAULT_USER_AVATAR, DEFAULT_GROUP_AVATAR } from "@/lib/constants";
import { Button } from "@/components/marketing_ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Input } from "@/components/marketing_ui/input";
import { Switch } from "@/components/marketing_ui/switch";
import { Badge } from "@/components/marketing_ui/badge";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";
import { UserBlueMark } from "@/components/marketing_ui/user-blue-mark";
import { GroupBlueMark } from "@/components/marketing_ui/group-blue-mark";
import { toast } from "sonner";
import { ContextualProfile } from "../components/ContextualProfile";
import { SuperAdminProfileView } from "../components/SuperAdminProfileView";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { useOnlineUsers } from "@/features/chat/context/PresenceContext";
import { formatDistanceToNow } from "date-fns";
import { SharedMediaView } from "../components/SharedMediaView";
import { TokenActivityHeatmap } from "../components/TokenActivityHeatmap";

type ProfileData = {
  name: string;
  phoneNumber: string;
  email: string;
  role: string;
  profilePicture: string;
  profileBanner?: string;
  lastLoginAt?: string;
  createdAt?: string;
  department?: string;
  bio?: string | null;
  prn?: string | null;
  organization_name?: string | null;
  organization_logo?: string | null;
  metadata?: Record<string, any>;
  forumUsername?: string | null;
  hobby?: string | null;
};

type EmailPrefs = {
  global: boolean;
  announcements: boolean;
};

interface SharedProfilePageProps {
  publicUser?: ProfileData;
  groupData?: any;
  mode?: "user" | "group";
  onClose?: () => void;
  children?: React.ReactNode;
  onUpdateGroup?: (updates: { name: string; description: string }) => Promise<void>;
  onUpdateGroupPhoto?: (blob: Blob, type: "avatar" | "banner") => Promise<void>;
}

export function SharedProfilePage({ publicUser, groupData, mode = "user", onClose, children, onUpdateGroup, onUpdateGroupPhoto }: SharedProfilePageProps) {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [activeView, setActiveView] = useState<"profile" | "shared-media">("profile");
  const [isDirty, setIsDirty] = useState(false);
  const [form, setForm] = useState<ProfileData>({
    name: "", phoneNumber: "", email: "", role: "", profilePicture: "", profileBanner: "", bio: ""
  });
  const [prefs, setPrefs] = useState<EmailPrefs>({ global: true, announcements: true });
  const [errors, setErrors] = useState<{ name?: string }>({});

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropType, setCropType] = useState<"avatar" | "banner">("avatar");

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);

  // Fetch current user from react-query cache to know their real role/org structure for ContextualProfile
  const { data: currentUser } = useCurrentUser();

  // Read-only logic:
  // For users, it's read-only if publicUser is passed.
  // For groups, it respects the edit_info_policy and the user's role in the group.
  const isGroup = mode === "group";
  const myGroupRole = groupData?.myRole || (groupData?.group?.created_by === currentUser?._id ? "admin" : "member");
  const editInfoPolicy = groupData?.group?.edit_info_policy || "admin_only";
  
  const isReadOnly = isGroup 
    ? (editInfoPolicy === "admin_only" ? myGroupRole !== "admin" : false)
    : !!publicUser;
  
  const onlineUsers = useOnlineUsers();

  // Re-usable auth query hook can be used here, but keeping apiClient for direct access for now.
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["global-profile"],
    queryFn: () => apiClient.get("/api/user/profile").then((r) => r.data),
    enabled: !isReadOnly && !isGroup,
  });

  const { data: prefsData, isLoading: prefsLoading } = useQuery({
    queryKey: ["global-settings"],
    queryFn: () => apiClient.get("/api/user/email-preferences").then((r) => r.data),
    enabled: !isReadOnly && !isGroup,
  });

  const targetUserId = isGroup ? undefined : ((publicUser as any)?._id || profileData?.user?._id);

  const { data: groupsData, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups-in-common", targetUserId],
    queryFn: () => apiClient.get(`/api/chat/groups-in-common/${targetUserId}`).then((r) => r.data),
    enabled: !!targetUserId && !isGroup,
  });

  useEffect(() => {
    if (isGroup && groupData) {
      setForm({
        name: groupData.group.name || "",
        phoneNumber: "",
        email: "",
        role: "Organization Group",
        profilePicture: groupData.group.avatar_url || DEFAULT_GROUP_AVATAR,
        profileBanner: groupData.group.banner_url || DEFAULT_BANNER,
        lastLoginAt: undefined,
        createdAt: groupData.group.created_at,
        bio: groupData.group.description || "",
        organization_name: groupData.group.org_id ? (groupData.group.organization_name || currentUser?.organization?.name || "Organization Group") : "Classgrid",
        organization_logo: groupData.group.org_id ? (groupData.group.organization_logo || currentUser?.organization?.logo_url || "") : "/logo.png",
        metadata: {},
      });
    } else if (publicUser) {
      setForm({
        name: publicUser.name || "",
        phoneNumber: publicUser.phoneNumber || "",
        email: publicUser.email || "",
        role: publicUser.role || "User",
        profilePicture: publicUser.profilePicture || DEFAULT_USER_AVATAR,
        profileBanner: publicUser.profileBanner || DEFAULT_BANNER,
        lastLoginAt: publicUser.lastLoginAt,
        createdAt: publicUser.createdAt,
        prn: publicUser.prn,
        forumUsername: publicUser.forumUsername,
        bio: publicUser.bio || "",
        organization_name: publicUser.organization_name,
        organization_logo: publicUser.organization_logo,
        metadata: publicUser.metadata || {},
        // Empty when the person hid it (Settings → Privacy); the server doesn't send it then
        hobby: publicUser.hobby || publicUser.metadata?.hobby || "",
      });
    } else if (profileData?.user) {
      setForm({
        name: profileData.user.name || "",
        phoneNumber: profileData.user.phoneNumber || "",
        email: profileData.user.email || "",
        role: profileData.user.role || "User",
        profilePicture: profileData.user.profilePicture || profileData.user.photoURL || DEFAULT_USER_AVATAR,
        profileBanner: profileData.user.profileBanner || DEFAULT_BANNER,
        lastLoginAt: profileData.user.lastLoginAt,
        createdAt: profileData.user.createdAt,
        prn: profileData.user.prn,
        forumUsername: profileData.user.forumUsername,
        bio: profileData.user.bio || "",
        organization_name: profileData.user.organization_name || (profileData.user.organization_id && profileData.user.organization_id.name) || (profileData.user.organization && profileData.user.organization.name) || currentUser?.organization?.name || currentUser?.organization_name || "",
        organization_logo: (profileData.user.organization_id && profileData.user.organization_id.logo_url) || (profileData.user.organization && profileData.user.organization.logo_url) || currentUser?.organization?.logo_url || "",
        metadata: profileData.user.metadata || {},
        hobby: profileData.user.hobby || profileData.user.metadata?.hobby || "",
      });
    }
  }, [profileData, publicUser, currentUser, isGroup, groupData]);

  useEffect(() => {
    if (!isReadOnly && !isGroup && prefsData?.emailNotifications) {
      setPrefs({
        global: prefsData.emailNotifications.global ?? true,
        announcements: prefsData.emailNotifications.announcements ?? true,
      });
    }
  }, [prefsData, isReadOnly, isGroup]);

  const updateProfile = useMutation({
    mutationFn: (updates: Partial<ProfileData>) => apiClient.put("/api/user/update", updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user"] });
      setIsDirty(false);
    },
  });

  const handleGroupSave = async () => {
    if (!onUpdateGroup) return;
    try {
      await onUpdateGroup({ name: form.name, description: form.bio || "" });
      setIsDirty(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveGroupInfo = async () => {
    if (!onUpdateGroup) return;
    setIsSavingGroupInfo(true);
    try {
      await onUpdateGroup({ name: form.name, description: form.bio || "" });
      setIsEditingName(false);
      setIsEditingBio(false);
      setIsDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingGroupInfo(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handlePrefToggle = (field: keyof EmailPrefs) => {
    const newPrefs = { ...prefs, [field]: !prefs[field] };
    setPrefs(newPrefs);
  };

  const openCropper = (file: File, type: "avatar" | "banner") => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error(`Please select an image smaller than 5MB. This file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`);
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openCropper(file, "avatar");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) openCropper(file, "banner");
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  const uploadToR2 = async (blob: Blob, type: "avatar" | "banner") => {
    const loadingToast = toast.loading(`Uploading ${type}...`);
    try {
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const fileName = `${type}-${Date.now()}.${ext}`;
      
      // Skip fetching signed URL for groups if handled by external callback
      let data = { uploadUrl: "", publicUrl: "" };
      let response: Response | null = null;
      if (!isGroup) {
        const res = await apiClient.post("/api/user/upload-url", {
          fileName,
          fileType: blob.type
        });
        data = res.data;

        response = await fetch(data.uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": blob.type }
        });

        if (!response.ok) throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      if (isGroup && onUpdateGroupPhoto) {
        await onUpdateGroupPhoto(blob, type);
        const updatePayload = type === "avatar" 
          ? { profilePicture: URL.createObjectURL(blob) } // Optimistic
          : { profileBanner: URL.createObjectURL(blob) };
        setForm((prev) => ({ ...prev, ...updatePayload }));
      } else {
        const updatePayload = type === "avatar" 
          ? { profilePicture: data.publicUrl }
          : { profileBanner: data.publicUrl };

        setForm((prev) => ({ ...prev, ...updatePayload }));
        updateProfile.mutate(updatePayload);
      }
      
      toast.success(`${type} updated successfully!`, { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error(`Failed to upload ${type}`, { id: loadingToast });
      throw err;
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) { setErrors({ name: "Required" }); return; }
    if (isGroup) {
      handleGroupSave();
    } else {
      updateProfile.mutate({ name: form.name, phoneNumber: form.phoneNumber });
      apiClient.put("/api/user/email-preferences", prefs);
    }
  };

  const isLoading = !isReadOnly && (profileLoading || prefsLoading);

  const containerContent = (
    <div className="flex flex-col gap-6 w-full max-w-[1000px] pb-24 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {isLoading ? (
        <div className="flex flex-col gap-6 w-full animate-pulse">
          {/* Skeleton Header */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col">
            <div className="h-[250px] relative bg-muted" />
            <div className="px-8 pb-8 flex flex-col items-start gap-4">
              <div className="relative -mt-[100px] mb-2 rounded-full overflow-hidden">
                <div className="w-[160px] h-[160px] border-4 border-background shadow-xl bg-muted" />
              </div>
              
              <div className="flex flex-col w-full gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-64 bg-muted rounded" />
                  <div className="h-6 w-24 bg-muted rounded-full" />
                </div>
                <div className="flex flex-wrap gap-4 mt-1 text-sm">
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-muted" /><div className="h-4 w-40 bg-muted rounded" /></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-muted" /><div className="h-4 w-32 bg-muted rounded" /></div>
                  <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-muted" /><div className="h-4 w-48 bg-muted rounded" /></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Skeleton Bento Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Basic Information */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm">
              <div className="border-b border-border pb-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-muted rounded-full" />
                  <div className="h-6 w-40 bg-muted rounded" />
                </div>
                <div className="h-4 w-64 bg-muted rounded opacity-80" />
              </div>
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-10 w-full bg-muted rounded-md" />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-12 w-full bg-muted rounded-lg" />
                </div>
              </div>
            </div>

            {/* User Experience */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-6 shadow-sm">
              <div className="border-b border-border pb-4 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-muted rounded-full" />
                  <div className="h-6 w-40 bg-muted rounded" />
                </div>
                <div className="h-4 w-64 bg-muted rounded opacity-80" />
              </div>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between p-3 border border-transparent">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-40 bg-muted rounded opacity-80" />
                  </div>
                  <div className="w-11 h-6 bg-muted rounded-full" />
                </div>
                <div className="flex items-center justify-between p-3 border border-transparent">
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-40 bg-muted rounded opacity-80" />
                  </div>
                  <div className="w-11 h-6 bg-muted rounded-full" />
                </div>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <>
          {/* Identity Header */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-lg flex flex-col">
            <div 
              className="h-[250px] relative bg-muted" 
              style={{ backgroundImage: `url(${form.profileBanner || DEFAULT_BANNER})`, backgroundSize: "cover", backgroundPosition: "center" }}
            >

              {!isReadOnly && (
                <>
                  <div 
                    className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/70 rounded-full cursor-pointer text-white backdrop-blur-md transition-all z-10 group" 
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Camera size={16} />
                    <span className="absolute -bottom-10 right-0 scale-0 transition-all rounded bg-foreground px-3 py-1.5 text-xs text-background font-medium whitespace-nowrap shadow-lg group-hover:scale-100 pointer-events-none">
                      Update Banner
                    </span>
                  </div>
                  <Input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={handleBannerUpload} />
                </>
              )}
            </div>
            
            <div className="px-8 pb-8 flex flex-col items-start gap-4">
              <div 
                className={`relative -mt-[100px] mb-2 ${!isReadOnly ? 'cursor-pointer group' : ''} rounded-full overflow-hidden`} 
                onClick={() => !isReadOnly && fileInputRef.current?.click()}
              >
                <Avatar className="w-[160px] h-[160px] border-4 border-background shadow-xl bg-background">
                  <AvatarImage src={form.profilePicture} alt={form.name} className="object-cover" />
                  <AvatarFallback className="text-5xl font-bold bg-muted text-muted-foreground">
                    {form.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {!isReadOnly && (
                  <>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="text-white w-8 h-8" />
                    </div>
                    <Input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                  </>
                )}
              </div>
              
              <div className="flex flex-col w-full gap-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-white flex items-center gap-2">
                    {isGroup ? (
                      isEditingName ? (
                        <div className="flex items-center gap-2">
                          <Input 
                            value={form.name} 
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            className="text-3xl font-bold h-auto py-1 px-2 -ml-2 bg-background border-primary focus:ring-1 focus:ring-primary transition-all max-w-[300px]"
                            placeholder="Group Name"
                          />
                          <Button size="sm" onClick={handleSaveGroupInfo} disabled={isSavingGroupInfo} className="h-8">
                            {isSavingGroupInfo ? <Spinner className="w-4 h-4 text-background" /> : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)} disabled={isSavingGroupInfo} className="h-8">Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group/editname">
                          <span>{form.name}</span>
                          {!isReadOnly && (
                            <button onClick={() => setIsEditingName(true)} className="opacity-0 group-hover/editname:opacity-100 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all">
                              <Edit size={16} />
                            </button>
                          )}
                        </div>
                      )
                    ) : (
                      form.name
                    )}
                    <UserBlueMark role={form.role} iconClassName="w-7 h-7" />
                  </h1>
                </div>
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground font-medium">
                    {!isGroup && form.email && (
                      <span className="flex items-center gap-2 hover:text-foreground transition-colors"><Mail size={16} /> {form.email}</span>
                    )}
                    {!isGroup && form.hobby && (
                      <span className="flex items-center gap-2 hover:text-foreground transition-colors" title="Hobbies"><Heart size={16} /> {form.hobby}</span>
                    )}
                    <span className="flex items-center gap-2.5">
                      {form.role === "super_admin" || form.role === "Super Admin" || (isGroup && (groupData?.group?.is_official || groupData?.group?.is_created_by_super_admin)) ? (
                        <div className="bg-white dark:bg-white/90 p-0.5 rounded shadow-sm border border-border/50 overflow-hidden flex items-center justify-center">
                          <img src="/logo.png" alt="Classgrid Logo" className="w-6 h-6 object-contain" />
                        </div>
                      ) : form.organization_logo ? (
                        <div className="bg-white dark:bg-white/90 p-0.5 rounded shadow-sm border border-border/50 overflow-hidden flex items-center justify-center">
                          <img src={form.organization_logo} alt="Org Logo" className="w-6 h-6 object-contain" />
                        </div>
                      ) : (
                        <Globe size={18} className="text-muted-foreground" />
                      )}
                      <span className="text-[15px] font-semibold text-foreground/90 flex items-center gap-1.5">
                        {form.role === "super_admin" || form.role === "Super Admin" ? "Classgrid Team Member" : (isGroup && (groupData?.group?.is_official || groupData?.group?.is_created_by_super_admin)) ? "Classgrid" : form.organization_name || currentUser?.organization?.name || "Organization Pending"}
                        <GroupBlueMark 
                          isOfficial={form.role === "super_admin" || form.role === "Super Admin" || !!(isGroup && (groupData?.group?.is_official || groupData?.group?.is_created_by_super_admin))} 
                        />
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                    {isGroup ? (
                      <>
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-full border border-border/40 capitalize">
                          {groupData?.group?.group_type?.replace(/_/g, ' ') || 'General'}
                        </span>
                        <span className="flex items-center gap-1.5 text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-full border border-border/40">
                          <Users size={15} className="opacity-70" /> {groupData?.members?.length || 0} Members
                        </span>
                        {groupData?.group?.created_at && (
                          <span className="flex items-center gap-1.5 text-muted-foreground font-medium bg-muted/30 px-3 py-1.5 rounded-full border border-border/40">
                            <Calendar size={15} className="opacity-70" /> Created {new Date(groupData.group.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {(groupData?.members?.filter((m: any) => onlineUsers?.has(m.userId)).length || 0) > 0 && (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-medium bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            {groupData?.members?.filter((m: any) => onlineUsers?.has(m.userId)).length} Online
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {!isReadOnly || (targetUserId && onlineUsers.has(targetUserId)) ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Activity size={14} /> {isReadOnly ? "Online" : "Active"}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground bg-muted/20 border border-border/40 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide">
                            <Clock size={14} className="opacity-70" /> 
                            {form.lastLoginAt ? `Last seen ${new Date(form.lastLoginAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : "Offline"}
                          </span>
                        )}
                        {form.forumUsername ? (
                          <a 
                            href={`https://forum.classgrid.in/u/${form.forumUsername}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-muted-foreground font-semibold bg-muted/30 px-2.5 py-1 rounded-full border border-border/40 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                          >
                            @{form.forumUsername}
                          </a>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground font-semibold bg-muted/30 px-2.5 py-1 rounded-full border border-border/40">
                            @{(form.name || "user").toLowerCase().replace(/\s+/g, '_')}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!isGroup && (
                  <div className="flex items-center gap-3 mt-4">
                    {form.metadata?.instagram_url && (
                      <a href={form.metadata.instagram_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background/50 backdrop-blur border-border/50 text-muted-foreground hover:text-pink-600 hover:border-pink-500 hover:bg-pink-500/10 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all duration-300 hover:-translate-y-0.5">
                          <Instagram size={18} />
                        </Button>
                      </a>
                    )}
                    {form.metadata?.facebook_url && (
                      <a href={form.metadata.facebook_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background/50 backdrop-blur border-border/50 text-muted-foreground hover:text-blue-600 hover:border-blue-600 hover:bg-blue-600/10 hover:shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all duration-300 hover:-translate-y-0.5">
                          <Facebook size={18} />
                        </Button>
                      </a>
                    )}
                    {(form.metadata?.twitter_url || form.metadata?.["social.twitter"]) && (
                      <a href={form.metadata?.twitter_url || form.metadata?.["social.twitter"]} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background/50 backdrop-blur border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-foreground/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5">
                          <XIcon className="w-[18px] h-[18px] fill-current" />
                        </Button>
                      </a>
                    )}
                    {(form.metadata?.linkedin_url || form.metadata?.["social.linkedin"]) && (
                      <a href={form.metadata?.linkedin_url || form.metadata?.["social.linkedin"]} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background/50 backdrop-blur border-border/50 text-muted-foreground hover:text-sky-500 hover:border-sky-500 hover:bg-sky-500/10 hover:shadow-[0_0_15px_rgba(14,165,233,0.3)] transition-all duration-300 hover:-translate-y-0.5">
                          <Linkedin size={18} />
                        </Button>
                      </a>
                    )}
                    {(form.metadata?.github_url || form.metadata?.["social.github"]) && (
                      <a href={form.metadata?.github_url || form.metadata?.["social.github"]} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-background/50 backdrop-blur border-border/50 text-muted-foreground hover:text-foreground hover:border-foreground hover:bg-foreground/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-0.5">
                          <Github size={18} />
                        </Button>
                      </a>
                    )}
                    {(!form.metadata?.instagram_url && !form.metadata?.["social.instagram"] && !form.metadata?.facebook_url && !form.metadata?.["social.facebook"] && !form.metadata?.linkedin_url && !form.metadata?.["social.linkedin"] && !form.metadata?.github_url && !form.metadata?.["social.github"] && !form.metadata?.twitter_url && !form.metadata?.["social.twitter"]) && (
                       <div className="text-xs text-muted-foreground italic mt-2">No social links added yet.</div>
                    )}
                  </div>
                )}
                
                <div className="w-full h-px bg-border my-6" />

                {isReadOnly && !isGroup && (
                  <>
                    {/* Media & Docs Prominent Button */}
                    <div className="w-full sm:w-auto relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-blue-500/40 rounded-lg blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <Button 
                        variant="outline" 
                        onClick={() => setActiveView("shared-media")}
                        className="w-full sm:w-auto relative flex items-center justify-between gap-4 py-6 px-6 border-border/50 bg-background/50 dark:bg-muted/10 backdrop-blur-xl hover:bg-muted/50 dark:hover:bg-white/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-md bg-primary/10 text-primary">
                            <FileBox size={18} />
                          </div>
                          <span className="font-semibold text-foreground/90 tracking-wide">Media, Links & Docs</span>
                        </div>
                        <ChevronRight size={18} className="opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </Button>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-border to-transparent my-6 opacity-60" />

                    {/* Groups in Common */}
                    <div className="grid grid-cols-1 gap-4 w-full">
                      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/40 bg-muted/20 dark:bg-white/[0.02] hover:bg-muted/40 dark:hover:bg-white/[0.04] transition-colors">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                          <Users size={16} className="text-blue-500" />
                          Groups in Common
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {groupsLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                              <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                            </div>
                          ) : groupsData?.groups && groupsData.groups.length > 0 ? (
                            groupsData.groups.map((group: any) => (
                              <Badge key={group._id || group.id || group.name} variant="secondary" className="bg-background/80 hover:bg-background border-border/50 text-xs py-1 px-3 shadow-sm">
                                {group.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground italic">No groups in common</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {isGroup && (
                  <div className="w-full mt-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">Group Description</label>
                    {isEditingBio ? (
                      <div className="flex flex-col gap-2">
                        <Input 
                          value={form.bio || ""}
                          onChange={(e) => handleInputChange("bio", e.target.value)}
                          className="w-full bg-background border-primary focus:ring-1 focus:ring-primary"
                          placeholder="Add a group description..."
                        />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={handleSaveGroupInfo} disabled={isSavingGroupInfo} className="h-8">
                            {isSavingGroupInfo ? <Spinner className="w-4 h-4 text-background" /> : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setIsEditingBio(false)} disabled={isSavingGroupInfo} className="h-8">Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/editbio min-h-[40px] px-3 py-2 bg-muted/20 rounded-md border border-border/50">
                        <span className="text-sm text-foreground/80 flex-1">{form.bio || <span className="text-muted-foreground italic text-xs">No description</span>}</span>
                        {!isReadOnly && (
                          <button onClick={() => setIsEditingBio(true)} className="opacity-0 group-hover/editbio:opacity-100 p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-all">
                            <Edit size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isGroup && children && (
            <div className="mt-8 flex flex-col gap-6">
              {children}
            </div>
          )}

            {/* Dynamic Contextual Profile Data - Only shown to the user themselves */}
            {!isReadOnly && !isGroup && (
              <div className="mt-8 mb-6">
                {(form.role === "super_admin" || form.role === "Super Admin" || form.role === "user" || window.location.hostname.startsWith('chat.')) ? (
                  <SuperAdminProfileView profileData={profileData?.user || {}} isReadOnly={isReadOnly} />
                ) : (
                  <ContextualProfile 
                    targetRole={form.role || "student"} 
                    viewerRole={currentUser?.role || "student"} 
                    orgType={currentUser?.organization?.type || "university"} 
                    structureType={currentUser?.organization?.structure || "standalone"} 
                    isSelfView={true} 
                    profileData={profileData?.user || {}}
                  />
                )}
              </div>
            )}

            {/* Token activity heatmap - only on the user's own profile */}
            {!isReadOnly && !isGroup && (
              <div className="w-full max-w-3xl mx-auto mb-8 border rounded-xl bg-card shadow-sm px-6 py-5">
                <TokenActivityHeatmap />
              </div>
            )}



          {!isReadOnly && (
            <ImageCropperModal
              isOpen={cropOpen}
              onClose={() => setCropOpen(false)}
              imageSrc={cropSrc}
              aspectRatio={cropType === "avatar" ? 1 : 1584 / 396}
              title={cropType === "avatar" ? "Crop Profile Picture" : "Crop Banner"}
              onCropComplete={(blob) => uploadToR2(blob, cropType)}
            />
          )}

          {/* Sticky Save Bar */}
          {!isReadOnly && isDirty && !isGroup && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[1000px] bg-card border border-primary/50 rounded-2xl p-4 flex items-center justify-between shadow-2xl z-50 animate-in slide-in-from-bottom-12 duration-300">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-bold">Unsaved changes detected</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Profile out of sync</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" className="hover:bg-danger/10 hover:text-danger transition-colors h-10" onClick={() => { setIsDirty(false); queryClient.invalidateQueries({ queryKey: ["global-profile"] }); }}>
                  Reset
                </Button>
                <Button className="shadow-lg shadow-primary/20 h-10 px-6 font-semibold" onClick={handleSave} isLoading={updateProfile.isPending}>
                  Push Updates
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  if (isReadOnly && !isGroup) {
    return (
      <div className="w-full h-full pb-12 flex flex-col bg-slate-50 dark:bg-background">
        <div className="sticky top-0 z-50 w-full h-14 bg-background/95 backdrop-blur border-b border-border flex items-center justify-center px-4 md:px-6">
          <div className="flex items-center text-sm text-muted-foreground">
            <button className="cursor-pointer hover:text-foreground hover:underline transition-colors focus:outline-none" onClick={onClose}>Chat</button>
            <ChevronRight size={14} className="mx-2 opacity-50" />
            <button className="cursor-pointer hover:text-foreground hover:underline transition-colors focus:outline-none" onClick={() => setActiveView("profile")}>{form.name || "User"}</button>
            <ChevronRight size={14} className="mx-2 opacity-50" />
            {activeView === "shared-media" ? (
              <span className="font-semibold text-foreground">Media, Links & Docs</span>
            ) : (
              <span className="font-semibold text-foreground">Profile</span>
            )}
          </div>
        </div>
        <div className="pt-6 flex-1">
          {activeView === "shared-media" ? (
            <SharedMediaView targetUserId={publicUser?.userId || targetUserId} />
          ) : (
            containerContent
          )}
        </div>
      </div>
    );
  }

  return containerContent;
}


