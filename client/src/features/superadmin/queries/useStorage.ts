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

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  storageApi,
  type AnalyticsFileQuery,
  type StorageUploadProgressHandler,
} from "../services/storageApi";
import { toast } from "sonner";

function storageErrorMessage(error: unknown, fallback: string) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : fallback;
}

export const storageKeys = {
  all: ["storage"] as const,
  lists: () => [...storageKeys.all, "list"] as const,
  list: (prefix: string, search?: string) => [...storageKeys.lists(), prefix, search] as const,
  analytics: () => [...storageKeys.all, "analytics"] as const,
  analyticsSummary: () => [...storageKeys.all, "analytics", "summary"] as const,
  analyticsFiles: (params?: AnalyticsFileQuery) => [...storageKeys.all, "analytics", "files", params] as const,
  analyticsBreakdown: () => [...storageKeys.all, "analytics", "breakdown"] as const,
  configuration: () => [...storageKeys.all, "configuration"] as const,
};

export function useStorageObjects(prefix: string, search?: string) {
  return useQuery({
    queryKey: storageKeys.list(prefix, search),
    queryFn: () => storageApi.listObjects(prefix, 1000, undefined, search),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, prefix, onUploadProgress }: {
      file: File;
      prefix: string;
      onUploadProgress?: StorageUploadProgressHandler;
    }) =>
      storageApi.uploadFile(file, prefix, onUploadProgress),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
        queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
      }, 3000);
      toast.success("File uploaded successfully.");
    },
    onError: (error: unknown) => {
      toast.error(storageErrorMessage(error, "Failed to upload file."));
    },
  });
}

export function useCreateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderName, prefix }: { folderName: string; prefix: string }) =>
      storageApi.createFolder(folderName, prefix),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
        queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
      }, 3000);
      toast.success("Folder created successfully.");
    },
    onError: (error: unknown) => {
      toast.error(storageErrorMessage(error, "Failed to create folder."));
    },
  });
}

export function useDeleteObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => storageApi.deleteObject(key),
    onSuccess: (_, key) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
        queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
      }, 3000);
      const isFolder = key.endsWith('/');
      toast.success(isFolder ? "Folder deleted successfully." : "File deleted successfully.");
    },
    onError: (error: unknown, key) => {
      const isFolder = key.endsWith('/');
      toast.error(storageErrorMessage(error, isFolder ? "Failed to delete folder." : "Failed to delete file."));
    },
  });
}

export function useDeleteObjects() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keys: string[]) => storageApi.deleteObjects(keys),
    onSuccess: (_, keys) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storageKeys.lists() });
        queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
      }, 3000);
      const hasFiles = keys.some(k => !k.endsWith('/'));
      const hasFolders = keys.some(k => k.endsWith('/'));
      const count = keys.length;
      let msg = `${count} items deleted successfully.`;
      if (hasFiles && !hasFolders) msg = `${count} file${count !== 1 ? 's' : ''} deleted successfully.`;
      else if (!hasFiles && hasFolders) msg = `${count} folder${count !== 1 ? 's' : ''} deleted successfully.`;
      toast.success(msg);
    },
    onError: (error: unknown) => {
      toast.error(storageErrorMessage(error, "Failed to delete items."));
    },
  });
}

export function useRenameObject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceKey, destinationKey }: { sourceKey: string; destinationKey: string }) =>
      storageApi.renameObject(sourceKey, destinationKey),
    onSuccess: (_, { sourceKey }) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: storageKeys.analytics() });
      }, 3000);
      const isFolder = sourceKey.endsWith('/');
      toast.success(isFolder ? "Folder renamed successfully." : "File renamed successfully.");
    },
    onError: (error: unknown, { sourceKey }) => {
      const isFolder = sourceKey.endsWith('/');
      toast.error(storageErrorMessage(error, isFolder ? "Failed to rename folder." : "Failed to rename file."));
    },
  });
}

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: storageKeys.analyticsSummary(),
    queryFn: () => storageApi.getAnalyticsSummary(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAnalyticsFiles(params?: AnalyticsFileQuery) {
  return useQuery({
    queryKey: storageKeys.analyticsFiles(params),
    queryFn: () => storageApi.getAnalyticsFiles(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useAnalyticsBreakdown() {
  return useQuery({
    queryKey: storageKeys.analyticsBreakdown(),
    queryFn: () => storageApi.getAnalyticsBreakdown(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useStorageConfiguration() {
  return useQuery({
    queryKey: storageKeys.configuration(),
    queryFn: () => storageApi.getConfiguration(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useTestStorageConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => storageApi.testConnection(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.configuration() });
      if (result.connected) {
        toast.success(`S3 connection healthy (${result.latencyMs} ms).`);
      } else {
        toast.warning(result.message || "S3 connection test failed.");
      }
    },
    onError: (error: unknown) => {
      toast.error(storageErrorMessage(error, "Connection test failed."));
    },
  });
}
