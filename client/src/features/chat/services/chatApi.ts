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

import { apiClient } from "@/lib/apiClient";
import axios from "axios";

// ── Thread Types ──
export interface ChatThread {
  id: string;
  type: "dm" | "group";
  name: string;
  avatar: string | null;
  role?: string;
  otherUserId?: string;
  groupId?: string;
  description?: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
  prn?: string;
  avatarColor?: string;
  sendMessagesPolicy?: 'all' | 'admin_only' | 'admin_faculty';
  allowReplies?: boolean;
  myRole?: 'admin' | 'member';
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: number;
  unreadMentions?: number;
  createdAt: string;
  isMuted?: boolean;
  isOfficial?: boolean;
  isPinned?: boolean;
  isArchived?: boolean;
  messageTtl?: number;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

export interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  domain: string;
}

export interface ChatMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  user_avatar: string | null;
  message: string;
  reply_to: { id: string; sender_name: string; message: string } | null;
  is_deleted: boolean;
  created_at: string;
  attachments: ChatAttachment[];
  reactions: Record<string, { id: string; name: string }[]>;
  isSeen?: boolean;
  is_edited?: boolean;
  isSending?: boolean;
  isError?: boolean;
  status?: 'approved' | 'pending' | 'rejected';
  is_pinned?: boolean;
  link_preview?: LinkPreview | null;
  requires_acknowledgement?: boolean;
  acknowledgements?: { user_id: string; user_name: string }[];
  has_acknowledged?: boolean;
  priority?: string;
  is_silent?: boolean;
  expires_at?: string;
  is_starred?: boolean;
  mentioned_users?: string[];
}

export interface OrgUser {
  _id: string;
  name: string;
  email: string | null;
  role: string;
  profilePicture: string | null;
  profileBanner: string | null;
  phoneNumber: string | null;
  bio: string | null;
  prn: string | null;
  organization_name?: string | null;
  organization_logo?: string | null;
  metadata?: Record<string, any>;
  forumUsername?: string | null;
  lastLoginAt?: string | null;
}

export interface ChatGroup {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  org_id: string;
}

export interface GroupMember {
  userId: string;
  name: string;
  profilePicture: string | null;
  role: string;
  userRole: string;
  email: string | null;
  joinedAt: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  thread_id: string;
  message_id: string;
  question: string;
  options: PollOption[];
  allow_multiple: boolean;
  is_anonymous: boolean;
  created_by: string;
  closes_at: string | null;
  created_at: string;
  voteCounts: Record<string, number>;
  totalVoters: number;
  myVotes: string[];
}

// ── API Functions ──

export async function fetchThreads(filter: string = "All"): Promise<ChatThread[]> {
  const { data } = await apiClient.get<{ threads: ChatThread[] }>(`/api/threads?filter=${encodeURIComponent(filter)}`);
  return data.threads;
}

export async function fetchOrgUsers(): Promise<OrgUser[]> {
  const res = await apiClient.get<{ users: OrgUser[] }>("/api/org-chat/users");
  return res.data.users;
}

// ── Blocking (WhatsApp-style) ──
export interface BlockedContact { id: string; name: string; email: string; profilePicture: string | null; }
export interface ChatBlocks { blocked: BlockedContact[]; blockedMe: string[]; }

export async function fetchBlocks(): Promise<ChatBlocks> {
  const res = await apiClient.get<ChatBlocks>("/api/org-chat/blocks");
  return res.data;
}

export async function blockUser(userId: string) {
  await apiClient.post(`/api/org-chat/blocks/${userId}`);
}

export async function unblockUser(userId: string) {
  await apiClient.delete(`/api/org-chat/blocks/${userId}`);
}

export async function findOrCreateDM(userId: string) {
  const res = await apiClient.post<{ thread: any; isNew: boolean }>(`/api/threads/dm/${userId}`);
  return res.data;
}

export async function fetchMessages(threadId: string, before?: string, signal?: AbortSignal): Promise<ChatMessage[]> {
  const params = before ? { before } : {};
  const res = await apiClient.get<{ messages: ChatMessage[] }>(`/api/threads/${threadId}/messages`, { params, signal });
  return res.data.messages;
}

export async function getPresignedUrls(threadId: string, files: { fileName: string, fileType: string, fileSize: number }[]) {
  const res = await apiClient.post<{ urls: { fileName: string, fileType: string, fileSize: number, uploadUrl: string, publicUrl: string }[] }>(
    `/api/threads/${threadId}/presigned-urls`,
    { files }
  );
  return res.data.urls;
}

export async function sendMessage(threadId: string, message: string, files?: File[], replyTo?: any, options?: { scheduledFor?: string; isSilent?: boolean; priority?: string; expiresAt?: string; mentionedUsers?: string[] }, onProgress?: (pct: number) => void) {
  const preuploadedAttachments = [];

  if (files && files.length > 0) {
    const fileData = files.map(f => ({
      fileName: f.name || 'upload.file',
      fileType: f.type || 'application/octet-stream',
      fileSize: f.size
    }));
    const urls = await getPresignedUrls(threadId, fileData);

    // Upload files directly to R2 in parallel
    const uploadPromises = files.map(async (file, index) => {
      const urlInfo = urls[index];
      await axios.put(urlInfo.uploadUrl, file, {
        headers: { 'Content-Type': urlInfo.fileType },
        // Cloudflare R2 Presigned URLs must be accessed without custom auth headers
        transformRequest: [(data) => data],
        onUploadProgress: (evt) => {
          if (onProgress && evt.total) {
            const pct = Math.round((evt.loaded * 100) / evt.total);
            onProgress(pct);
          }
        }
      });
      preuploadedAttachments.push({
        file_url: urlInfo.publicUrl,
        file_name: urlInfo.fileName,
        file_type: urlInfo.fileType,
        file_size: urlInfo.fileSize
      });
    });

    await Promise.all(uploadPromises);
  }

  const formData = new FormData();
  if (message) formData.append("message", message);
  if (replyTo) formData.append("replyTo", JSON.stringify(replyTo));
  if (options?.scheduledFor) formData.append("scheduledFor", options.scheduledFor);
  if (options?.isSilent) formData.append("isSilent", "true");
  if (options?.priority) formData.append("priority", options.priority);
  if (options?.expiresAt) formData.append("expiresAt", options.expiresAt);
  if (options?.mentionedUsers && options.mentionedUsers.length > 0) {
    formData.append("mentionedUsers", JSON.stringify(options.mentionedUsers));
  }
  if (preuploadedAttachments.length > 0) {
    formData.append("preuploaded_attachments", JSON.stringify(preuploadedAttachments));
  }

  const res = await apiClient.post(`/api/threads/${threadId}/messages`, formData, {
    timeout: 0, // infinite
  });
  return res.data.message;
}

// Lightweight version: files already uploaded — just POST to server with pre-uploaded attachments
export async function sendMessageWithAttachments(
  threadId: string,
  message: string,
  preuploadedAttachments: any[],
  replyTo?: any,
  options?: { scheduledFor?: string; isSilent?: boolean; priority?: string; expiresAt?: string; mentionedUsers?: string[] }
) {
  const formData = new FormData();
  if (message) formData.append("message", message);
  if (replyTo) formData.append("replyTo", JSON.stringify(replyTo));
  if (options?.scheduledFor) formData.append("scheduledFor", options.scheduledFor);
  if (options?.isSilent) formData.append("isSilent", "true");
  if (options?.priority) formData.append("priority", options.priority);
  if (options?.expiresAt) formData.append("expiresAt", options.expiresAt);
  if (options?.mentionedUsers && options.mentionedUsers.length > 0) {
    formData.append("mentionedUsers", JSON.stringify(options.mentionedUsers));
  }
  if (preuploadedAttachments.length > 0) {
    formData.append("preuploaded_attachments", JSON.stringify(preuploadedAttachments));
  }
  const res = await apiClient.post(`/api/threads/${threadId}/messages`, formData, { timeout: 0 });
  return res.data.message;
}

export async function togglePinThread(threadId: string, isPinned: boolean) {
  const res = await apiClient.post(`/api/threads/${threadId}/pin`, { is_pinned: isPinned });
  return res.data;
}

export async function toggleArchiveThread(threadId: string, isArchived: boolean) {
  const res = await apiClient.post(`/api/threads/${threadId}/archive`, { is_archived: isArchived });
  return res.data;
}

export interface ScheduledMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  attachments: ChatAttachment[];
  scheduled_for: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  created_at: string;
}

export async function fetchScheduledMessages(threadId: string): Promise<ScheduledMessage[]> {
  const res = await apiClient.get<{ messages: ScheduledMessage[] }>(`/api/threads/${threadId}/messages/scheduled`);
  return res.data.messages;
}

export async function cancelScheduledMessage(threadId: string, msgId: string) {
  const res = await apiClient.delete(`/api/threads/${threadId}/messages/scheduled/${msgId}`);
  return res.data;
}

export async function editScheduledMessage(threadId: string, msgId: string, message?: string, scheduledFor?: string) {
  const payload: any = {};
  if (message !== undefined) payload.message = message;
  if (scheduledFor !== undefined) payload.scheduledFor = scheduledFor;
  const res = await apiClient.patch(`/api/threads/${threadId}/messages/scheduled/${msgId}`, payload);
  return res.data.message;
}

export async function markThreadRead(threadId: string) {
  await apiClient.post(`/api/threads/${threadId}/read`);
}

export async function forwardMessages(messageIds: string[], targetThreadIds: string[]) {
  const res = await apiClient.post(`/api/threads/forward`, { messageIds, targetThreadIds }, { timeout: 0 });
  return res.data;
}

export interface MessageInfo {
  readBy: { id: string; name: string; avatar: string; readAt: string }[];
  deliveredTo: { id: string; name: string; avatar: string }[];
}

export async function fetchMessageInfo(threadId: string, messageId: string): Promise<MessageInfo> {
  const res = await apiClient.get<MessageInfo>(`/api/threads/${threadId}/messages/${messageId}/info`);
  return res.data;
}

export async function toggleMuteThread(threadId: string) {
  const res = await apiClient.post<{ success: boolean; isMuted: boolean }>(`/api/threads/${threadId}/mute`);
  return res.data;
}

export async function markAllRead() {
  await apiClient.post(`/api/threads/read-all`);
}

export async function deleteMessage(threadId: string, messageId: string, type: 'me' | 'everyone' = 'everyone') {
  await apiClient.delete(`/api/threads/${threadId}/messages/${messageId}?type=${type}`, { timeout: 0 });
}

export async function bulkDeleteMessages(threadId: string, messageIds: string[], type: 'me' | 'everyone' = 'everyone'): Promise<{ ok: boolean; deleted: number; failed: number; failedIds: string[] }> {
  const res = await apiClient.post(`/api/threads/${threadId}/messages/bulk-delete`, { messageIds, type }, { timeout: 0 });
  return res.data;
}

export async function searchMessages(query: string, filters?: { threadId?: string, senderId?: string, hasMedia?: boolean, dateFrom?: string, dateTo?: string }): Promise<{ results: (ChatMessage & { chat_threads: { id: string, name: string, type: string } })[] }> {
  const params = new URLSearchParams({ query });
  if (filters?.threadId) params.append('threadId', filters.threadId);
  if (filters?.senderId) params.append('senderId', filters.senderId);
  if (filters?.hasMedia) params.append('hasMedia', 'true');
  if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.append('dateTo', filters.dateTo);

  const response = await apiClient.get(`/api/threads/search?${params.toString()}`);
  return response.data;
}

export interface GifResult {
  id: string;
  url: string;
  preview_url: string;
  width: number;
  height: number;
  title: string;
}

export async function searchGifs(query: string, offset: number = 0, limit: number = 20): Promise<{ results: GifResult[], pagination: any }> {
  const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
  if (query) params.append('q', query);
  const response = await apiClient.get(`/api/threads/gifs/search?${params.toString()}`);
  return response.data;
}

export async function clearChat(threadId: string) {
  await apiClient.post(`/api/threads/${threadId}/clear`, {}, { timeout: 0 });
}

export async function deleteChat(threadId: string) {
  await apiClient.delete(`/api/threads/${threadId}`, { timeout: 0 });
}

export async function bulkDeleteChats(threadIds: string[]) {
  await apiClient.post('/api/threads/bulk-delete', { threadIds }, { timeout: 0 });
}

export async function bulkMuteChats(threadIds: string[]) {
  const res = await apiClient.post('/api/threads/bulk-mute', { threadIds }, { timeout: 0 });
  return res.data;
}

export async function toggleStarMessage(messageId: string) {
  const res = await apiClient.post(`/api/threads/messages/${messageId}/star`);
  return res.data;
}

export async function editMessage(threadId: string, messageId: string, message: string) {
  await apiClient.patch(`/api/threads/${threadId}/messages/${messageId}`, { message });
}

export async function toggleReaction(threadId: string, messageId: string, emoji: string) {
  const res = await apiClient.post(`/api/threads/${threadId}/messages/${messageId}/reactions`, { emoji });
  return res.data.reactions;
}

export async function createGroup(name: string, description: string, memberIds: string[], settings?: any) {
  const res = await apiClient.post("/api/group-chat", { name, description, memberIds, ...settings });
  return res.data;
}

export async function fetchGroupInfo(groupId: string) {
  const res = await apiClient.get<{ group: ChatGroup & { permissions?: any }; threadId: string; members: GroupMember[]; myRole: string }>(`/api/group-chat/${groupId}`);
  return res.data;
}

export async function updateGroupPermissions(groupId: string, permissions: any) {
  const res = await apiClient.put(`/api/group-chat/${groupId}/permissions`, permissions);
  return res.data.group;
}

export async function toggleThreadReplies(threadId: string, allowReplies: boolean) {
  const res = await apiClient.put(`/api/thread-chat/${threadId}/replies`, { allowReplies });
  return res.data;
}

export async function updateGroupInfo(groupId: string, name: string, description: string) {
  const res = await apiClient.put(`/api/group-chat/${groupId}`, { name, description });
  return res.data.group;
}

export async function uploadGroupPhoto(groupId: string, file: File, type: "avatar" | "banner" = "avatar") {
  const formData = new FormData();
  formData.append("type", type);
  formData.append("photo", file);
  const res = await apiClient.post(`/api/group-chat/${groupId}/photo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.group;
}

export async function addGroupMember(groupId: string, userId: string) {
  await apiClient.post(`/api/group-chat/${groupId}/members`, { userId });
}

export async function removeGroupMember(groupId: string, userId: string) {
  await apiClient.delete(`/api/group-chat/${groupId}/members/${userId}`);
}

export async function exitGroup(groupId: string) {
  await apiClient.post(`/api/group-chat/${groupId}/exit`);
}

export async function toggleAdminRole(groupId: string, userId: string, role: 'admin' | 'member') {
  const res = await apiClient.put(`/api/group-chat/${groupId}/admins/${userId}`, { role });
  return res.data;
}

export async function createThreadPoll(threadId: string, question: string, options: string[], allowMultiple = false) {
  const res = await apiClient.post(`/api/threads/${threadId}/polls`, { question, options, allowMultiple });
  return res.data.poll;
}

export async function voteThreadPoll(threadId: string, pollId: string, optionId: string) {
  const res = await apiClient.post(`/api/threads/${threadId}/polls/${pollId}/vote`, { optionId });
  return res.data;
}

export async function fetchThreadPolls(threadId: string): Promise<Poll[]> {
  const res = await apiClient.get<{ polls: Poll[] }>(`/api/threads/${threadId}/polls`);
  return res.data.polls || [];
}

export async function setDisappearingMessages(threadId: string, ttl: number) {
  const res = await apiClient.post(`/api/threads/${threadId}/disappearing`, { ttl });
  return res.data;
}

export async function fetchGroupPolls(groupId: string): Promise<Poll[]> {
  const res = await apiClient.get<{ polls: Poll[] }>(`/api/group-chat/${groupId}/polls`);
  return res.data.polls;
}

export async function pinMessage(threadId: string, messageId: string, is_pinned: boolean, durationHours?: number) {
  const res = await apiClient.patch(`/api/threads/${threadId}/messages/${messageId}/pin`, { is_pinned, durationHours });
  return res.data;
}

export async function approveMessage(threadId: string, messageId: string) {
  const res = await apiClient.patch(`/api/threads/${threadId}/messages/${messageId}/approve`);
  return res.data;
}

export async function rejectMessage(threadId: string, messageId: string, reason?: string) {
  const res = await apiClient.patch(`/api/threads/${threadId}/messages/${messageId}/reject`, { reason });
  return res.data;
}

export async function acknowledgeMessage(threadId: string, messageId: string) {
  const res = await apiClient.patch(`/api/threads/${threadId}/messages/${messageId}/acknowledge`);
  return res.data;
}

export async function createPoll(groupId: string, question: string, options: string[], allowMultiple = false) {
  const res = await apiClient.post(`/api/group-chat/${groupId}/polls`, { question, options, allowMultiple });
  return res.data.poll;
}

export async function votePoll(groupId: string, pollId: string, optionId: string) {
  const res = await apiClient.post(`/api/group-chat/${groupId}/polls/${pollId}/vote`, { optionId });
  return res.data;
}


export async function fetchPollVoters(pollId: string, threadOrGroupId: string, isGroup: boolean): Promise<{ option_id: string, user_id: string }[]> {
  const prefix = isGroup ? 'group-chat' : 'threads';
  const res = await apiClient.get<{ votes: { option_id: string, user_id: string }[] }>(`/api/${prefix}/${threadOrGroupId}/polls/${pollId}/voters`);
  return res.data.votes;
}

export async function fetchChatAuditLogs() {
  const res = await apiClient.get('/api/group-chat/audit');
  return res.data.logs;
}

// ── Join Requests ──
export interface JoinRequest {
  id: string;
  type?: 'role_request'; // Added for role requests
  group_id: string; // Used as orgId if it's a role request
  user_id: string;
  user_name: string;
  user_avatar: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  group?: {
    name: string;
    avatar: string | null;
  }
}

export async function requestToJoinGroup(groupId: string) {
  const res = await apiClient.post(`/api/group-chat/${groupId}/join-request`);
  return res.data.request;
}

export async function fetchJoinRequests(groupId: string) {
  const res = await apiClient.get<{ requests: JoinRequest[] }>(`/api/group-chat/${groupId}/join-requests`);
  return res.data.requests;
}

export async function processJoinRequest(groupId: string, requestId: string, status: 'approved' | 'rejected') {
  const res = await apiClient.patch(`/api/group-chat/${groupId}/join-requests/${requestId}`, { status });
  return res.data;
}

export async function processRoleRequest(requestId: string, status: 'approved' | 'rejected') {
  const endpoint = status === 'approved' ? 'accept-role-request' : 'reject-role-request';
  // Served by org.routes.js, mounted at /api/org-admin (/api/org is the organization routes)
  const res = await apiClient.post(`/api/org-admin/${endpoint}/${requestId}`);
  return res.data;
}

export async function deleteGroup(groupId: string) {
  await apiClient.delete(`/api/group-chat/${groupId}`);
}

export async function fetchUnifiedRequests() {
  const res = await apiClient.get<{ incoming: JoinRequest[]; outgoing: JoinRequest[] }>('/api/group-chat/join-requests/unified');
  return res.data;
}

export async function exploreGroups() {
  const res = await apiClient.get<{ groups: (ChatGroup & { member_count: number; creator: { name: string; email: string } })[] }>('/api/group-chat/explore');
  return res.data.groups;
}

export async function fetchLinkPreview(url: string, signal?: AbortSignal): Promise<LinkPreview | null> {
  try {
    const res = await apiClient.get<LinkPreview>('/api/threads/link-preview', {
      params: { url },
      signal,
      timeout: 5000 // Don't hang forever
    });
    return res.data;
  } catch (err) {
    console.error('Failed to fetch link preview', err);
    return null;
  }
}
