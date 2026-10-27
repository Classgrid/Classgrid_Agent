/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO BLOCKS RULE (owner's order, 2026-10-23) 🚫
 * Claude and every AI model are FORBIDDEN to add any kind of block, restriction, allowlist or
 * "only for X" rule (owner-only, super-admin-only, email checks, test-number-only, role checks)
 * unless the owner explicitly asks for that exact limit.
 * Every feature is for ALL users. Project Mode is for all users, never super-admin only.
 * ─────────────────────────────────────────────────────────
 */
/*
 * ─────────────────────────────────────────────────────────
 * 🚫 NO DISK BLAME RULE (owner's order, 2026-10-27) 🚫
 * Claude and every AI model are FORBIDDEN to say an error comes from a full disk or low disk space.
 * The owner's disks are not full. Never guess the cause of an error: read the real logs and code first,
 * and only name a cause that was actually seen.
 * ─────────────────────────────────────────────────────────
 */
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

import path from "path";
import {
    HeadBucketCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
    BUCKET_NAME,
    CDN_BASE_URL,
    PROTECTED_PREFIXES,
    S3_REGION,
    s3Client,
} from "../config/s3Client.js";

export const MAX_STORAGE_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024 * 1024;
export const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024;
export const STORAGE_PRESIGNED_URL_EXPIRY_SECONDS = 60 * 60;
export const STORAGE_UPLOAD_RATE_LIMIT_PER_MINUTE = 25000;
export const STORAGE_ANALYTICS_CACHE_TTL_MS = 5 * 60 * 1000;

const ANALYTICS_METADATA_CONCURRENCY = 10;
const CONNECTION_CHECK_TIMEOUT_MS = 5000;
const S3_PAGE_SIZE = 1000;
const ONE_MEGABYTE = 1024 * 1024;
const ONE_GIGABYTE = 1024 * 1024 * 1024;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const CONTENT_TYPES_BY_EXTENSION = {
    ".7z": "application/x-7z-compressed",
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".css": "text/css",
    ".csv": "text/csv",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".gif": "image/gif",
    ".gz": "application/gzip",
    ".html": "text/html",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript",
    ".json": "application/json",
    ".m4a": "audio/mp4",
    ".md": "text/markdown",
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".rar": "application/vnd.rar",
    ".svg": "image/svg+xml",
    ".tar": "application/x-tar",
    ".ts": "text/typescript",
    ".txt": "text/plain",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xml": "application/xml",
    ".zip": "application/zip",
};

const DOCUMENT_CONTENT_TYPES = new Set([
    "application/msword",
    "application/rtf",
    "application/vnd.ms-excel",
    "application/vnd.ms-powerpoint",
    "application/vnd.oasis.opendocument.presentation",
    "application/vnd.oasis.opendocument.spreadsheet",
    "application/vnd.oasis.opendocument.text",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ARCHIVE_CONTENT_TYPES = new Set([
    "application/gzip",
    "application/vnd.rar",
    "application/x-7z-compressed",
    "application/x-bzip2",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/zip",
]);

const TYPE_LABELS = {
    image: "Images",
    video: "Videos",
    audio: "Audio",
    pdf: "PDF",
    document: "Documents",
    archive: "Archives",
    text: "Text and code",
    other: "Other",
    unknown: "Unknown",
};

const SIZE_RANGE_DEFINITIONS = [
    {
        range: "under_1_mb",
        label: "Under 1 MB",
        minimum: 0,
        maximum: ONE_MEGABYTE,
    },
    {
        range: "1_to_10_mb",
        label: "1–10 MB",
        minimum: ONE_MEGABYTE,
        maximum: 10 * ONE_MEGABYTE,
    },
    {
        range: "10_to_100_mb",
        label: "10–100 MB",
        minimum: 10 * ONE_MEGABYTE,
        maximum: 100 * ONE_MEGABYTE,
    },
    {
        range: "100_mb_to_1_gb",
        label: "100 MB–1 GB",
        minimum: 100 * ONE_MEGABYTE,
        maximum: ONE_GIGABYTE + 1,
    },
    {
        range: "above_1_gb",
        label: "Above 1 GB",
        minimum: ONE_GIGABYTE + 1,
        maximum: Number.POSITIVE_INFINITY,
    },
];

const explicitCredentialsConfigured = Boolean(
    (
        process.env.AWS_ACCESS_KEY_ID?.trim()
        && process.env.AWS_SECRET_ACCESS_KEY?.trim()
    )
    || (
        process.env.AWS_S3_ERP_ACCESS_KEY?.trim()
        && process.env.AWS_S3_ERP_SECRET_KEY?.trim()
    ),
);

let analyticsCache = {
    snapshot: null,
    expiresAt: 0,
};
let analyticsRefreshPromise = null;

function buildCdnUrl(key) {
    const encodedKey = key
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `${CDN_BASE_URL}/${encodedKey}`;
}

function inferContentType(key) {
    return CONTENT_TYPES_BY_EXTENSION[path.posix.extname(key).toLowerCase()]
        || "application/octet-stream";
}

function classifyContentType(contentType) {
    const normalized = String(contentType || "").split(";")[0].trim().toLowerCase();

    if (!normalized || normalized === "application/octet-stream") return "unknown";
    if (normalized.startsWith("image/")) return "image";
    if (normalized.startsWith("video/")) return "video";
    if (normalized.startsWith("audio/")) return "audio";
    if (normalized === "application/pdf") return "pdf";
    if (DOCUMENT_CONTENT_TYPES.has(normalized)) return "document";
    if (ARCHIVE_CONTENT_TYPES.has(normalized)) return "archive";
    if (
        normalized.startsWith("text/")
        || normalized === "application/json"
        || normalized === "application/xml"
        || normalized === "application/javascript"
    ) {
        return "text";
    }
    return "other";
}

function toIsoDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getParentPrefix(key) {
    const separatorIndex = key.lastIndexOf("/");
    return separatorIndex >= 0 ? key.slice(0, separatorIndex + 1) : "";
}

function getTopLevelPrefix(key) {
    const separatorIndex = key.indexOf("/");
    return separatorIndex >= 0 ? key.slice(0, separatorIndex + 1) : "";
}

function addFolderPrefixes(key, folderPrefixes) {
    const isFolderMarker = key.endsWith("/");
    const segments = key.split("/").filter(Boolean);
    const folderSegmentCount = isFolderMarker
        ? segments.length
        : Math.max(segments.length - 1, 0);

    for (let index = 1; index <= folderSegmentCount; index += 1) {
        folderPrefixes.add(`${segments.slice(0, index).join("/")}/`);
    }
}

function roundPercentage(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
}

function percentageOf(value, total) {
    return total > 0 ? roundPercentage((value / total) * 100) : 0;
}

function compareNullableDates(firstValue, secondValue, direction = "desc") {
    const firstTime = firstValue ? Date.parse(firstValue) : Number.NaN;
    const secondTime = secondValue ? Date.parse(secondValue) : Number.NaN;
    const safeFirst = Number.isFinite(firstTime)
        ? firstTime
        : (direction === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
    const safeSecond = Number.isFinite(secondTime)
        ? secondTime
        : (direction === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
    return direction === "desc" ? safeSecond - safeFirst : safeFirst - safeSecond;
}

async function mapWithConcurrency(items, concurrency, mapper) {
    if (items.length === 0) return [];

    const results = new Array(items.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    }

    await Promise.all(
        Array.from(
            { length: Math.min(concurrency, items.length) },
            () => worker(),
        ),
    );
    return results;
}

async function listEveryObject() {
    const objects = [];
    const folderPrefixes = new Set();
    let continuationToken;
    const seenContinuationTokens = new Set();

    do {
        const response = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            MaxKeys: S3_PAGE_SIZE,
            ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        }));

        for (const object of response.Contents || []) {
            if (!object.Key) continue;
            addFolderPrefixes(object.Key, folderPrefixes);
            if (object.Key.endsWith("/")) continue;

            objects.push({
                key: object.Key,
                name: path.posix.basename(object.Key),
                folder: getParentPrefix(object.Key),
                topLevelPrefix: getTopLevelPrefix(object.Key),
                size: Number(object.Size) || 0,
                lastModified: toIsoDate(object.LastModified),
            });
        }

        if (!response.IsTruncated) {
            continuationToken = undefined;
            continue;
        }

        const nextContinuationToken = response.NextContinuationToken;
        if (!nextContinuationToken || seenContinuationTokens.has(nextContinuationToken)) {
            throw new Error("S3 returned an invalid analytics continuation token.");
        }

        seenContinuationTokens.add(nextContinuationToken);
        continuationToken = nextContinuationToken;
    } while (continuationToken);

    return {
        objects,
        folderPrefixes,
    };
}

async function enrichObjectsWithMetadata(objects) {
    let metadataLookupFailures = 0;

    const files = await mapWithConcurrency(
        objects,
        ANALYTICS_METADATA_CONCURRENCY,
        async (object) => {
            let contentType = inferContentType(object.key);

            try {
                const metadata = await s3Client.send(new HeadObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: object.key,
                }));
                contentType = metadata.ContentType || contentType;
            } catch {
                metadataLookupFailures += 1;
            }

            return {
                ...object,
                contentType,
                type: classifyContentType(contentType),
                cdnUrl: buildCdnUrl(object.key),
            };
        },
    );

    if (metadataLookupFailures > 0) {
        console.warn(
            `[Storage Analytics] ${metadataLookupFailures} metadata lookup(s) failed; inferred content types were used.`,
        );
    }

    return {
        files,
        metadataLookupFailures,
    };
}

function buildTypeBreakdown(files, totalSize) {
    const breakdown = new Map();

    for (const file of files) {
        const current = breakdown.get(file.type) || {
            type: file.type,
            label: TYPE_LABELS[file.type] || file.type,
            fileCount: 0,
            size: 0,
        };
        current.fileCount += 1;
        current.size += file.size;
        breakdown.set(file.type, current);
    }

    return [...breakdown.values()]
        .map((item) => ({
            ...item,
            percentage: percentageOf(item.size, totalSize),
        }))
        .sort((first, second) => second.size - first.size || first.label.localeCompare(second.label));
}

function buildFolderBreakdown(files, folderPrefixes, totalSize) {
    const breakdown = new Map();

    for (const folderPrefix of folderPrefixes) {
        const topLevelPrefix = getTopLevelPrefix(folderPrefix);
        if (!topLevelPrefix) continue;
        if (!breakdown.has(topLevelPrefix)) {
            breakdown.set(topLevelPrefix, {
                prefix: topLevelPrefix,
                name: topLevelPrefix.replace(/\/$/, ""),
                fileCount: 0,
                size: 0,
            });
        }
    }

    for (const file of files) {
        const prefix = file.topLevelPrefix;
        const key = prefix || "";
        const current = breakdown.get(key) || {
            prefix,
            name: prefix ? prefix.replace(/\/$/, "") : "Root",
            fileCount: 0,
            size: 0,
        };
        current.fileCount += 1;
        current.size += file.size;
        breakdown.set(key, current);
    }

    return [...breakdown.values()]
        .map((item) => ({
            ...item,
            percentage: percentageOf(item.size, totalSize),
        }))
        .sort((first, second) => second.size - first.size || first.name.localeCompare(second.name));
}

function buildSizeRangeBreakdown(files) {
    return SIZE_RANGE_DEFINITIONS.map((definition) => {
        const matchingFiles = files.filter(
            (file) => file.size >= definition.minimum && file.size < definition.maximum,
        );

        return {
            range: definition.range,
            label: definition.label,
            fileCount: matchingFiles.length,
            size: matchingFiles.reduce((sum, file) => sum + file.size, 0),
        };
    });
}

function toPublicFile(file) {
    if (!file) return null;
    return {
        key: file.key,
        name: file.name,
        folder: file.folder,
        size: file.size,
        contentType: file.contentType,
        type: file.type,
        lastModified: file.lastModified,
        cdnUrl: file.cdnUrl,
    };
}

async function buildAnalyticsSnapshot() {
    const { objects, folderPrefixes } = await listEveryObject();
    const { files, metadataLookupFailures } = await enrichObjectsWithMetadata(objects);

    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const sortedBySizeDescending = [...files].sort(
        (first, second) => second.size - first.size || first.key.localeCompare(second.key),
    );
    const sortedNonEmptyBySize = sortedBySizeDescending.filter((file) => file.size > 0);
    const largestFile = sortedBySizeDescending[0] || null;
    const smallestFile = sortedNonEmptyBySize.at(-1) || null;
    const sortedByNewest = [...files].sort(
        (first, second) => compareNullableDates(first.lastModified, second.lastModified, "desc")
            || first.key.localeCompare(second.key),
    );
    const sortedByOldest = [...files].sort(
        (first, second) => compareNullableDates(first.lastModified, second.lastModified, "asc")
            || first.key.localeCompare(second.key),
    );
    const generatedAt = new Date().toISOString();
    const oneYearCutoff = Date.parse(generatedAt) - ONE_YEAR_MS;

    return {
        files,
        summary: {
            totalFiles,
            totalFolders: folderPrefixes.size,
            totalSize,
            averageFileSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0,
            largestFile: toPublicFile(largestFile),
            smallestFile: toPublicFile(smallestFile),
            zeroByteFiles: files.filter((file) => file.size === 0).length,
            unknownContentTypeFiles: files.filter((file) => file.type === "unknown").length,
            filesAboveOneGb: files.filter((file) => file.size > ONE_GIGABYTE).length,
            filesOlderThanOneYear: files.filter((file) => {
                const lastModified = Date.parse(file.lastModified);
                return Number.isFinite(lastModified) && lastModified < oneYearCutoff;
            }).length,
            metadataLookupFailures,
        },
        breakdown: {
            byType: buildTypeBreakdown(files, totalSize),
            byFolder: buildFolderBreakdown(files, folderPrefixes, totalSize),
            bySizeRange: buildSizeRangeBreakdown(files),
            recentFiles: sortedByNewest.slice(0, 10).map(toPublicFile),
            oldestFiles: sortedByOldest.slice(0, 10).map(toPublicFile),
        },
        generatedAt,
    };
}

function cacheAgeSeconds(snapshot) {
    if (!snapshot?.generatedAt) return 0;
    const generatedAt = Date.parse(snapshot.generatedAt);
    if (!Number.isFinite(generatedAt)) return 0;
    return Math.max(0, Math.floor((Date.now() - generatedAt) / 1000));
}

function decorateSnapshot(snapshot, cacheStatus, refreshWarning = null) {
    return {
        ...snapshot,
        cacheStatus,
        cacheAgeSeconds: cacheAgeSeconds(snapshot),
        ...(refreshWarning ? { refreshWarning } : {}),
    };
}

export function invalidateStorageAnalyticsCache() {
    analyticsCache.expiresAt = 0;
}

export async function getStorageAnalyticsSnapshot({ forceRefresh = false } = {}) {
    const now = Date.now();
    if (
        !forceRefresh
        && analyticsCache.snapshot
        && analyticsCache.expiresAt > now
    ) {
        return decorateSnapshot(analyticsCache.snapshot, "cached");
    }

    if (analyticsRefreshPromise) return analyticsRefreshPromise;

    analyticsRefreshPromise = (async () => {
        try {
            const snapshot = await buildAnalyticsSnapshot();
            analyticsCache = {
                snapshot,
                expiresAt: Date.now() + STORAGE_ANALYTICS_CACHE_TTL_MS,
            };
            return decorateSnapshot(snapshot, "refreshed");
        } catch (error) {
            if (analyticsCache.snapshot) {
                console.error(
                    `[Storage Analytics] refresh failed; serving stale snapshot (${error?.name || "UnknownError"}).`,
                );
                return decorateSnapshot(
                    analyticsCache.snapshot,
                    "stale",
                    "Analytics refresh failed. The last completed snapshot is being shown.",
                );
            }
            throw error;
        }
    })();

    try {
        return await analyticsRefreshPromise;
    } finally {
        analyticsRefreshPromise = null;
    }
}

async function areStorageCredentialsConfigured() {
    if (explicitCredentialsConfigured) return true;

    try {
        const credentialsProvider = s3Client.config.credentials;
        const credentials = typeof credentialsProvider === "function"
            ? await credentialsProvider()
            : credentialsProvider;
        return Boolean(credentials?.accessKeyId && credentials?.secretAccessKey);
    } catch {
        return false;
    }
}

function getSafeConnectionError(error) {
    const name = error?.name || "";
    const statusCode = error?.$metadata?.httpStatusCode;

    if (name === "CredentialsProviderError" || name === "InvalidAccessKeyId") {
        return {
            code: "CREDENTIALS_INVALID",
            message: "AWS credentials are missing or invalid.",
        };
    }
    if (
        name === "AccessDenied"
        || name === "Forbidden"
        || name === "NoSuchBucket"
        || [400, 403, 404].includes(statusCode)
    ) {
        return {
            code: "S3_ACCESS_CHECK_FAILED",
            message: "The S3 connection or bucket access check failed.",
        };
    }
    if (name === "AbortError" || name === "TimeoutError" || name === "RequestTimeout") {
        return {
            code: "CONNECTION_TIMEOUT",
            message: "The S3 connection check timed out.",
        };
    }
    return {
        code: "S3_CONNECTION_FAILED",
        message: "The server could not reach the configured S3 bucket.",
    };
}

export async function checkStorageConnection() {
    const startedAt = Date.now();
    const abortController = new AbortController();
    const timeoutId = setTimeout(
        () => abortController.abort(),
        CONNECTION_CHECK_TIMEOUT_MS,
    );

    try {
        await s3Client.send(new HeadBucketCommand({
            Bucket: BUCKET_NAME,
        }), {
            abortSignal: abortController.signal,
        });

        return {
            connected: true,
            status: "connected",
            latencyMs: Date.now() - startedAt,
            checkedAt: new Date().toISOString(),
            message: "AWS S3 is responding normally.",
        };
    } catch (error) {
        const safeError = getSafeConnectionError(error);
        console.error(
            `[Storage] connection check failed name=${error?.name || "UnknownError"} status=${error?.$metadata?.httpStatusCode || "unknown"}`,
        );

        return {
            connected: false,
            status: "disconnected",
            latencyMs: Date.now() - startedAt,
            checkedAt: new Date().toISOString(),
            errorCode: safeError.code,
            message: safeError.message,
        };
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function getSafeStorageConfiguration() {
    const [connection, credentialsConfigured] = await Promise.all([
        checkStorageConnection(),
        areStorageCredentialsConfigured(),
    ]);

    return {
        provider: "AWS S3",
        endpoint: `https://s3.${S3_REGION}.amazonaws.com`,
        bucket: BUCKET_NAME,
        region: S3_REGION,
        cdnBaseUrl: CDN_BASE_URL,
        maxUploadBytes: MAX_STORAGE_UPLOAD_SIZE_BYTES,
        multipartThresholdBytes: MULTIPART_THRESHOLD_BYTES,
        presignedUrlExpirySeconds: STORAGE_PRESIGNED_URL_EXPIRY_SECONDS,
        uploadRateLimitPerMinute: STORAGE_UPLOAD_RATE_LIMIT_PER_MINUTE,
        credentialsConfigured,
        credentialSource: explicitCredentialsConfigured
            ? "server environment"
            : (
                credentialsConfigured
                    ? "AWS default provider chain"
                    : "not resolved"
            ),
        auditLoggingEnabled: true,
        protectedPrefixes: [...PROTECTED_PREFIXES],
        authentication: "super_admin",
        configurationSource: "server environment",
        publicDelivery: "CloudFront CDN",
        metadataSource: "S3 object metadata",
        ...connection,
    };
}
