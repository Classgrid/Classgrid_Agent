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
import type { AxiosProgressEvent } from "axios";

export type StorageAnalyticsType =
  | "image"
  | "video"
  | "audio"
  | "pdf"
  | "document"
  | "archive"
  | "text"
  | "other"
  | "unknown";

export interface StorageObject {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
  createdAt?: string | null;
  contentType: string;
  cdnUrl: string;
  folder?: string;
  type?: StorageAnalyticsType;
}

export interface AnalyticsSnapshotMetadata {
  generatedAt: string;
  cacheAgeSeconds: number;
  cacheStatus: "refreshed" | "cached" | "stale";
  refreshWarning?: string;
}

export interface StorageFolder {
  prefix: string;
  name: string;
}

export interface ListObjectsResponse {
  folders: StorageFolder[];
  files: StorageObject[];
  nextCursor: string | null;
  totalSize: number;
}

export interface UploadFileResponse {
  key: string;
  cdnUrl: string;
  size: number;
  contentType: string;
}

export interface AnalyticsSummaryResponse extends AnalyticsSnapshotMetadata {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  averageFileSize: number;
  largestFile: StorageObject | null;
  smallestFile: StorageObject | null;
  zeroByteFiles: number;
  unknownContentTypeFiles: number;
  filesAboveOneGb: number;
  filesOlderThanOneYear: number;
  metadataLookupFailures: number;
}

export interface AnalyticsRankedFile extends StorageObject {
  rank: number;
  folder: string;
  type: StorageAnalyticsType;
  relativeToLargestPercentage: number;
  percentageOfTotal: number;
}

export interface AnalyticsFilesResponse extends AnalyticsSnapshotMetadata {
  files: AnalyticsRankedFile[];
  nextCursor: string | null;
  totalMatchingFiles: number;
  largestFileSize: number;
  totalStorageSize: number;
}

export interface AnalyticsBreakdownResponse extends AnalyticsSnapshotMetadata {
  byType: { type: StorageAnalyticsType; label: string; fileCount: number; size: number; percentage: number }[];
  byFolder: { prefix: string; name: string; fileCount: number; size: number; percentage: number }[];
  bySizeRange: { range: string; label: string; fileCount: number; size: number }[];
  recentFiles: StorageObject[];
  oldestFiles: StorageObject[];
}

export interface StorageConnectionStatus {
  connected: boolean;
  status: "connected" | "disconnected";
  message: string;
  checkedAt: string;
  latencyMs: number;
  errorCode?: string;
}

export interface StorageConfiguration extends StorageConnectionStatus {
  provider: string;
  endpoint: string;
  bucket: string;
  region: string;
  cdnBaseUrl: string;
  maxUploadBytes: number;
  multipartThresholdBytes: number;
  presignedUrlExpirySeconds: number;
  uploadRateLimitPerMinute: number;
  credentialsConfigured: boolean;
  credentialSource: string;
  auditLoggingEnabled: boolean;
  protectedPrefixes: string[];
  authentication: string;
  configurationSource: string;
  publicDelivery: string;
  metadataSource: string;
}

export type StorageConnectionTestResult = StorageConnectionStatus;

export interface StorageObjectMetadata {
  key: string;
  size: number;
  contentType: string;
  lastModified: string | null;
  createdAt: string | null;
  cdnUrl: string;
  etag: string | null;
}

export interface AnalyticsFileQuery {
  sort?: "size_desc" | "size_asc" | "modified_desc" | "modified_asc" | "name_asc" | "name_desc" | string;
  type?: StorageAnalyticsType | string;
  prefix?: string;
  search?: string;
  limit?: number;
  cursor?: string;
  nonZero?: boolean;
  zeroOnly?: boolean;
  rootOnly?: boolean;
  refresh?: boolean;
}

export type StorageUploadProgressHandler = (progressEvent: AxiosProgressEvent) => void;

export const storageApi = {
  listObjects: async (prefix = "", limit = 100, cursor?: string, search?: string) => {
    const params = new URLSearchParams();
    if (prefix) params.append("prefix", prefix);
    if (limit) params.append("limit", limit.toString());
    if (cursor) params.append("cursor", cursor);
    if (search) params.append("search", search);

    const response = await apiClient.get<{ data: ListObjectsResponse }>(`/api/super-admin/storage/objects?${params.toString()}`);
    return response.data.data;
  },

  uploadFile: async (file: File, prefix = "", onUploadProgress?: StorageUploadProgressHandler) => {
    const formData = new FormData();
    formData.append("file", file);

    const params = new URLSearchParams();
    if (prefix) params.append("prefix", prefix);

    const response = await apiClient.post<{ data: UploadFileResponse }>(
      `/api/super-admin/storage/upload?${params.toString()}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress,
      }
    );
    return response.data.data;
  },

  deleteObject: async (key: string) => {
    const response = await apiClient.delete("/api/super-admin/storage/object", { data: { key } });
    return response.data.data;
  },

  deleteObjects: async (keys: string[]) => {
    const response = await apiClient.delete("/api/super-admin/storage/objects", { data: { keys } });
    return response.data.data;
  },

  createFolder: async (folderName: string, prefix = "") => {
    const response = await apiClient.post("/api/super-admin/storage/folder", { folderName, prefix });
    return response.data.data;
  },

  renameObject: async (sourceKey: string, destinationKey: string) => {
    const response = await apiClient.post("/api/super-admin/storage/rename", { sourceKey, destinationKey });
    return response.data.data;
  },

  getPresignedUrl: async (key: string) => {
    const response = await apiClient.post("/api/super-admin/storage/presigned-url", { key });
    return response.data.data;
  },

  getAnalyticsSummary: async (forceRefresh?: boolean) => {
    const params = forceRefresh ? "?refresh=true" : "";
    const response = await apiClient.get<{ data: AnalyticsSummaryResponse }>(`/api/super-admin/storage/analytics/summary${params}`);
    return response.data.data;
  },

  getAnalyticsFiles: async (params?: AnalyticsFileQuery) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          searchParams.append(key, value.toString());
        }
      });
    }
    const response = await apiClient.get<{ data: AnalyticsFilesResponse }>(`/api/super-admin/storage/analytics/files?${searchParams.toString()}`);
    return response.data.data;
  },

  getAnalyticsBreakdown: async (forceRefresh?: boolean) => {
    const params = forceRefresh ? "?refresh=true" : "";
    const response = await apiClient.get<{ data: AnalyticsBreakdownResponse }>(`/api/super-admin/storage/analytics/breakdown${params}`);
    return response.data.data;
  },

  getConfiguration: async () => {
    const response = await apiClient.get<{ data: StorageConfiguration }>("/api/super-admin/storage/configuration");
    return response.data.data;
  },

  getHealth: async () => {
    const response = await apiClient.get<{ data: StorageConnectionStatus }>("/api/super-admin/storage/health");
    return response.data.data;
  },

  testConnection: async () => {
    const response = await apiClient.post<{ data: StorageConnectionTestResult }>("/api/super-admin/storage/test-connection");
    return response.data.data;
  },

  getMetadata: async (key: string) => {
    const params = new URLSearchParams({ key });
    const response = await apiClient.get<{ data: StorageObjectMetadata }>(`/api/super-admin/storage/metadata?${params.toString()}`);
    return response.data.data;
  },
};
