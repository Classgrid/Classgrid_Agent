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

import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, Search, Check, Camera, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Spinner } from "@/components/marketing_ui/spinner";
import { ImageCropperModal } from "@/components/marketing_ui/ImageCropperModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { toast } from "sonner";
import type { OrgUser } from "../services/chatApi";
import { DEFAULT_USER_AVATAR } from "@/lib/constants";
import { useOrgRoles } from "@/features/org/queries/useOrgRoles";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";
import { GROUP_SETTING_LABELS } from "./groupSettingLabels";

interface GroupCreateSidebarProps {
  onClose: () => void;
  onBack: () => void;
  users: OrgUser[];
  currentUserId: string;
  onCreateGroup: (name: string, description: string, memberIds: string[], photo: File | null, settings?: { messageTtl?: number; permissions?: any }) => Promise<void>;
  isLoading: boolean;
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function GroupCreateSidebar({
  onClose,
  onBack,
  users,
  currentUserId,
  onCreateGroup,
  isLoading,
}: GroupCreateSidebarProps) {
  const [stage, setStage] = useState<"select" | "details">("select");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [groupSubject, setGroupSubject] = useState("");
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageTtl, setMessageTtl] = useState<number>(0);
  const [groupPermissions, setGroupPermissions] = useState<any>({ 
    send_message_policy: 'all',
    add_member_policy: 'admin_only',
    edit_info_policy: 'admin_only',
    send_attachments_policy: 'all',
    create_poll_policy: 'all',
    auto_add_roles: [], 
    admin_roles: [],
    group_type: 'general',
    is_private: true,
    require_join_approval: false
  });

  const { data: currentUser } = useCurrentUser();
  const { data: dynamicRolesData } = useOrgRoles();
  let availableRoles = dynamicRolesData || [];

  if (currentUser?.role === 'super_admin') {
    // Roles come back as { value, label } objects (older responses were plain strings)
    availableRoles = availableRoles.filter((r: any) => (typeof r === 'string' ? r : r.value) !== 'student');
  }

  const filteredAndSortedUsers = useMemo(() => {
    let list = users.filter((u) => u._id !== currentUserId && u.role !== 'super_admin');

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          (u.email && u.email.toLowerCase().includes(query)) ||
          (u.role && u.role.toLowerCase().includes(query))
      );
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, search, currentUserId]);

  const selectedUsersList = useMemo(() => {
    return users.filter(u => selectedIds.has(u._id));
  }, [users, selectedIds]);

  const toggleUser = (userId: string) => {
    const next = new Set(selectedIds);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      if (next.size >= 200) {
        toast.error("You can only add up to 200 members to a group.");
        return;
      }
      next.add(userId);
    }
    setSelectedIds(next);
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      await onCreateGroup(groupName.trim(), groupSubject.trim(), Array.from(selectedIds), groupPhoto, { messageTtl, permissions: groupPermissions });
      setGroupName("");
      setGroupSubject("");
      setGroupPhoto(null);
      setSelectedIds(new Set());
      setStage("select");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setCropperSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
      // Reset input so the same file can be re-selected
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'group-icon.jpg', { type: croppedBlob.type || 'image/jpeg' });
    setGroupPhoto(file);
    setGroupPhotoPreview(URL.createObjectURL(croppedBlob));
  };

  return (
    <motion.div
      initial={{ x: "-100%" }}
      animate={{ x: 0 }}
      exit={{ x: "-100%" }}
      transition={{ type: "tween", duration: 0.25, ease: "easeInOut" }}
      className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-black overflow-hidden"
    >
      <AnimatePresence mode="wait">
        {stage === "select" ? (
          <motion.div
            key="select-stage"
            initial={{ x: "-20%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-20%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="flex flex-col w-full h-full"
          >
            {/* Header */}
            <div className="h-16 shrink-0 flex items-center px-4 gap-4 border-b border-border bg-white dark:bg-black">
              <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-foreground leading-tight">Add group members</h2>
                <span className="text-xs text-muted-foreground">{selectedIds.size} of 200 selected</span>
              </div>
            </div>

            {/* Selected Chips & Search Area */}
            <div className="p-3 border-b border-border bg-white dark:bg-black flex flex-col gap-3">
              {selectedUsersList.length > 0 && (
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {selectedUsersList.map(user => (
                    <div key={user._id} className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-1 border border-border">
                      <div className="w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[9px] flex items-center justify-center shrink-0 overflow-hidden">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt="" className="w-full h-full object-cover bg-primary/10 border border-border/50" />
                        ) : (
                          <img src={DEFAULT_USER_AVATAR} alt="" className="w-full h-full object-cover bg-primary/10 border border-border/50" />
                        )}
                      </div>
                      <span className="text-xs font-medium truncate max-w-[100px]">{user.name}</span>
                      <button onClick={() => toggleUser(user._id)} className="p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-muted-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 h-9 text-sm bg-muted/50 border border-border rounded-lg outline-none text-foreground placeholder:text-muted-foreground/70"
                />
              </div>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#fafafa] dark:bg-[#0f0f0f] relative">
              {isLoading ? (
                <div className="flex justify-center p-8">
                  <Spinner className="w-6 h-6 text-primary" />
                </div>
              ) : (
                <div className="flex flex-col py-2 pb-24">
                  {filteredAndSortedUsers.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground text-sm">
                      No contacts found matching "{search}"
                    </div>
                  ) : (
                    filteredAndSortedUsers.map((user, index) => {
                      const isSelected = selectedIds.has(user._id);
                      const isForbidden = user.role === 'super_admin' && currentUser?.role !== 'super_admin';
                      return (
                        <button
                          key={user._id}
                          onClick={() => {
                            if (!isForbidden) toggleUser(user._id);
                          }}
                          disabled={isForbidden}
                          className={`w-full flex items-center gap-4 px-4 py-2 transition-colors text-left group relative ${isForbidden ? 'opacity-60 cursor-not-allowed bg-red-50/30 dark:bg-red-900/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                        >
                          <div className={`relative shrink-0 transition-opacity duration-200 ${isSelected ? 'opacity-60' : 'opacity-100'}`}>
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center overflow-hidden">
                              {user.profilePicture ? (
                                <img
                                  src={user.profilePicture}
                                  alt=""
                                  className="w-full h-full object-cover bg-primary/10 border border-border/50"
                                />
                              ) : (
                                <img
                                  src={DEFAULT_USER_AVATAR}
                                  alt=""
                                  className="w-full h-full object-cover bg-primary/10 border border-border/50"
                                />
                              )}
                            </div>
                            {isSelected && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-background shadow-sm">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                          <div className={`flex-1 min-w-0 pb-3 pt-1 ${index !== filteredAndSortedUsers.length - 1 ? 'border-b border-border' : ''}`}>
                            <div className="flex items-center justify-between">
                              <p className={`text-[17px] truncate transition-opacity duration-200 ${isSelected ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {user.name}
                              </p>
                            </div>
                            <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                              {user.role ? user.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Member'} {user.email ? `• ${user.email}` : ''}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Floating Next Button */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={() => setStage("details")}
                  className="absolute bottom-6 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-20"
                >
                  <ArrowRight className="w-6 h-6" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="details-stage"
            initial={{ x: "20%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "20%", opacity: 0 }}
            transition={{ type: "tween", duration: 0.2 }}
            className="flex flex-col w-full h-full bg-[#fafafa] dark:bg-[#0f0f0f]"
          >
            {/* Header */}
            <div className="h-16 shrink-0 flex items-center px-4 gap-4 border-b border-border bg-white dark:bg-black">
              <button
                onClick={() => setStage("select")}
                className="p-2 -ml-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-bold text-foreground">New group</h2>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 pb-24">
              {/* Group Icon & Name */}
              <div className="flex flex-col items-center pt-8 px-6 pb-4">
              <label className="w-48 h-48 rounded-full bg-accent flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted transition-colors group relative overflow-hidden mb-8">
                {groupPhotoPreview ? (
                  <img src={groupPhotoPreview} alt="Group" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-10 h-10 mb-2 opacity-70 group-hover:opacity-100 transition-opacity" />
                    <span className="text-xs uppercase tracking-wider font-semibold opacity-70 group-hover:opacity-100 text-center px-4 leading-tight">Add group<br/>icon</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
              
              <div className="w-full relative flex flex-col gap-4">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Group name *"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-transparent border-b-2 border-emerald-500 py-2 pr-8 text-foreground outline-none placeholder:text-muted-foreground/70 font-semibold"
                    autoFocus
                  />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 text-red-500 font-bold text-xl pointer-events-none">
                    *
                  </div>
                </div>

                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Group subject (optional)"
                    value={groupSubject}
                    onChange={(e) => setGroupSubject(e.target.value)}
                    className="w-full bg-transparent border-b border-border py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                  />
                </div>
              </div>
            </div>

            {/* Settings toggles */}
            <div className="mt-4 px-6 flex flex-col gap-6 text-sm">
              <div className="flex flex-col gap-2">
                 <span className="font-medium">Group Discovery & Privacy</span>
                 <Select 
                    value={
                      groupPermissions.is_private ? 'private' 
                      : groupPermissions.require_join_approval ? 'approval' 
                      : 'public'
                    }
                    onValueChange={(value) => {
                      if (value === 'private') {
                        setGroupPermissions({ ...groupPermissions, is_private: true, require_join_approval: false });
                      } else if (value === 'approval') {
                        setGroupPermissions({ ...groupPermissions, is_private: false, require_join_approval: true });
                      } else if (value === 'public') {
                        setGroupPermissions({ ...groupPermissions, is_private: false, require_join_approval: false });
                      }
                    }}
                 >
                    <SelectTrigger className="w-full bg-transparent border-b border-border rounded-none px-0 py-2 text-sm text-foreground outline-none shadow-none h-auto">
                       <SelectValue>{(v: string) => GROUP_SETTING_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="private">Private (Hidden, Invite Only)</SelectItem>
                       <SelectItem value="approval">Approval Required (Visible, Request to Join)</SelectItem>
                       <SelectItem value="public">Public / Open (Visible, Instant Join)</SelectItem>
                    </SelectContent>
                 </Select>
                 <span className="text-xs text-muted-foreground mt-1">
                   {groupPermissions.is_private && "Invisible in 'New Chat'. Only admins can add people."}
                   {!groupPermissions.is_private && groupPermissions.require_join_approval && "Shows in 'New Chat'. Users must request to join."}
                   {!groupPermissions.is_private && !groupPermissions.require_join_approval && "Shows in 'New Chat'. Anyone can join instantly."}
                 </span>
              </div>

              <div className="flex flex-col gap-2">
                 <span className="font-medium">Group Type</span>
                 <Select 
                    value={groupPermissions.group_type || 'general'}
                    onValueChange={(value) => setGroupPermissions({ ...groupPermissions, group_type: value })}
                 >
                    <SelectTrigger className="w-full bg-transparent border-b border-border rounded-none px-0 py-2 text-sm text-foreground outline-none shadow-none h-auto">
                       <SelectValue>{(v: string) => GROUP_SETTING_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="general">General</SelectItem>
                       <SelectItem value="class">Class</SelectItem>
                       <SelectItem value="department">Department</SelectItem>
                       <SelectItem value="subject">Subject</SelectItem>
                       <SelectItem value="team_staff">Team / Staff</SelectItem>
                       <SelectItem value="official_announcement">Official / Announcement</SelectItem>
                    </SelectContent>
                 </Select>
              </div>

              <div className="flex flex-col gap-2">
                 <span className="font-medium">Disappearing messages</span>
                 <Select 
                    value={String(messageTtl)}
                    onValueChange={(value) => setMessageTtl(Number(value))}
                 >
                    <SelectTrigger className="w-full bg-transparent border-b border-border rounded-none px-0 py-2 text-sm text-foreground outline-none shadow-none h-auto">
                       <SelectValue>{(v: string) => GROUP_SETTING_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="0">Off</SelectItem>
                       <SelectItem value="86400">24 hours</SelectItem>
                       <SelectItem value="604800">7 days</SelectItem>
                       <SelectItem value="7776000">90 days</SelectItem>
                    </SelectContent>
                 </Select>
              </div>
              <div className="flex flex-col gap-2">
                 <span className="font-medium">Group permissions (Send messages)</span>
                 <Select 
                    value={groupPermissions.send_message_policy}
                    onValueChange={(value) => setGroupPermissions({ 
                      ...groupPermissions, 
                      send_message_policy: value,
                      add_member_policy: value,
                      edit_info_policy: value,
                      send_attachments_policy: value,
                      create_poll_policy: value
                    })}
                 >
                    <SelectTrigger className="w-full bg-transparent border-b border-border rounded-none px-0 py-2 text-sm text-foreground outline-none shadow-none h-auto">
                       <SelectValue>{(v: string) => GROUP_SETTING_LABELS[v] ?? v}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                       <SelectItem value="all">Members & Admins</SelectItem>
                       <SelectItem value="admin_only">Only Admins</SelectItem>
                    </SelectContent>
                 </Select>
              </div>



              {/* Auto-Grant Admin Roles (ERP school roles: hidden on chat.classgrid.in, where they don't apply) */}
              <div className={`flex flex-col gap-2 ${typeof window !== 'undefined' && window.location.hostname.startsWith('chat.') ? 'hidden' : ''}`}>
                 <span className="text-sm font-medium text-foreground">Auto-Grant Admin by Role</span>
                 <span className="text-xs text-muted-foreground mb-1">Anyone inside this chat group with these roles will automatically be given Group Admin rights.</span>
                 <div className="flex flex-wrap gap-2">
                   {availableRoles.map((roleObj: any) => {
                     // Same handling as GroupSettingsModal: a role may be a { value, label } object or a plain string
                     const role: string = typeof roleObj === 'string' ? roleObj : roleObj.value;
                     const roleLabel: string = typeof roleObj === 'string'
                       ? roleObj.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
                       : (roleObj.label || String(roleObj.value || ''));
                     const currentRoles = groupPermissions.admin_roles || [];
                     const isSelected = currentRoles.includes(role);
                     return (
                       <button
                         key={role}
                         onClick={() => {
                           const newRoles = isSelected
                             ? currentRoles.filter((r: string) => r !== role)
                             : [...currentRoles, role];
                           setGroupPermissions({ ...groupPermissions, admin_roles: newRoles });
                         }}
                         className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                           isSelected 
                             ? 'bg-primary text-primary-foreground border-primary' 
                             : 'bg-background text-foreground border-border hover:border-primary/50'
                         }`}
                       >
                         {roleLabel}
                       </button>
                     );
                   })}
                 </div>
               </div>
            </div>
          </div>

            {/* Floating Create Button */}
            <AnimatePresence>
              {groupName.trim() && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="absolute bottom-6 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors z-20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Spinner className="w-6 h-6 text-white" />
                  ) : (
                    <Check className="w-7 h-7" />
                  )}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Cropper Modal */}
      <ImageCropperModal
        isOpen={!!cropperSrc}
        onClose={() => setCropperSrc(null)}
        imageSrc={cropperSrc || ''}
        onCropComplete={handleCropComplete}
        aspectRatio={1}
        circularCrop={true}
        title="Crop Group Icon"
      />
    </motion.div>
  );
}
