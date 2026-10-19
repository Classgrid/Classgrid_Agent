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
import fs from "fs";
import {
    AbortMultipartUploadCommand,
    CompleteMultipartUploadCommand,
    CopyObjectCommand,
    CreateMultipartUploadCommand,
    DeleteObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
    BUCKET_NAME,
    CDN_BASE_URL,
    PROTECTED_PREFIXES,
    s3Client,
} from "../config/s3Client.js";
import {
    MAX_STORAGE_UPLOAD_SIZE_BYTES,
    MULTIPART_THRESHOLD_BYTES,
    STORAGE_PRESIGNED_URL_EXPIRY_SECONDS,
    STORAGE_UPLOAD_RATE_LIMIT_PER_MINUTE,
    checkStorageConnection,
    getSafeStorageConfiguration,
    getStorageAnalyticsSnapshot,
    invalidateStorageAnalyticsCache,
} from "../services/storage-management.service.js";
import { getIO } from "../services/socket.service.js";

export {
    MAX_STORAGE_UPLOAD_SIZE_BYTES,
    STORAGE_UPLOAD_RATE_LIMIT_PER_MINUTE,
};
const MULTIPART_PART_SIZE_BYTES = 16 * 1024 * 1024;
const MULTIPART_CONCURRENCY = 4;
const MAX_LIST_LIMIT = 1000;
const MAX_BULK_DELETE_KEYS = 1000;
const METADATA_CONCURRENCY = 10;
const DEFAULT_ANALYTICS_LIMIT = 25;
const MAX_ANALYTICS_LIMIT = 100;
const ANALYTICS_SORT_OPTIONS = new Set([
    "size_desc",
    "size_asc",
    "modified_desc",
    "modified_asc",
    "name_asc",
    "name_desc",
]);
const ANALYTICS_TYPE_OPTIONS = new Set([
    "image",
    "video",
    "audio",
    "pdf",
    "document",
    "archive",
    "text",
    "other",
    "unknown",
]);

class StorageRequestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.name = "StorageRequestError";
        this.statusCode = statusCode;
    }
}

const CONTENT_TYPES_BY_EXTENSION = {
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
    ".mov": "video/quicktime",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".svg": "image/svg+xml",
    ".tar": "application/x-tar",
    ".txt": "text/plain",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".webp": "image/webp",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xml": "application/xml",
    ".zip": "application/zip",
};

function sendSuccess(res, message, data) {
    return res.json({
        success: true,
        message,
        data,
    });
}

function setPrivateNoStore(res) {
    if (typeof res.setHeader === "function") {
        res.setHeader("Cache-Control", "private, no-store");
    }
}

function buildStorageErrorResponse(req, message) {
    const traceId = typeof req?.traceId === "string"
        ? req.traceId.trim()
        : "";
    const requestId = /^[A-Za-z0-9._:-]{1,128}$/.test(traceId)
        ? traceId
        : "";

    return {
        success: false,
        message,
        ...(requestId ? { requestId } : {}),
    };
}

function getUserId(req) {
    return String(req.user?._id || req.user?.id || "unknown");
}

function auditStorageAction(req, action, keys, status = "success") {
    const affectedKeys = Array.isArray(keys) ? keys : [keys];
    console.log(
        `[Storage] userId=${getUserId(req)} action=${action} status=${status} keys=${JSON.stringify(affectedKeys)}`,
    );
}

function emitStorageUpdated(action) {
    try {
        getIO().to("superadmin:storage").emit("storage_updated", {
            action,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.warn("[Storage] storage_updated socket emit skipped:", error.message);
    }
}

function handleControllerError(req, res, operation, error, affectedKeys = []) {
    if (["upload", "delete", "bulk-delete", "rename"].includes(operation)) {
        auditStorageAction(req, operation, affectedKeys, "failed");
    }

    if (error instanceof StorageRequestError) {
        return res.status(error.statusCode).json(buildStorageErrorResponse(req, error.message));
    }

    if (error?.name === "NoSuchKey" || error?.name === "NotFound" || error?.$metadata?.httpStatusCode === 404) {
        return res.status(404).json(buildStorageErrorResponse(req, "The requested S3 object was not found."));
    }

    if (error?.name === "AccessDenied" || error?.name === "Forbidden" || error?.$metadata?.httpStatusCode === 403) {
        return res.status(502).json(buildStorageErrorResponse(req, "AWS denied the requested storage operation."));
    }

    console.error(`[Storage] ${operation} failed:`, error);
    return res.status(500).json(buildStorageErrorResponse(
        req,
        `Failed to ${operation.replaceAll("-", " ")}.`,
    ));
}

function normalizeSegments(value, fieldName, { allowEmpty = false } = {}) {
    if (value === undefined || value === null || value === "") {
        if (allowEmpty) return [];
        throw new StorageRequestError(400, `${fieldName} is required.`);
    }

    if (typeof value !== "string") {
        throw new StorageRequestError(400, `${fieldName} must be a string.`);
    }

    const normalized = value.trim().replaceAll("\\", "/").replace(/^\/+/, "");
    if (!normalized) {
        if (allowEmpty) return [];
        throw new StorageRequestError(400, `${fieldName} is required.`);
    }

    if (/[\u0000-\u001F\u007F]/.test(normalized)) {
        throw new StorageRequestError(400, `${fieldName} contains invalid characters.`);
    }

    const rawSegments = normalized.split("/");
    if (rawSegments.some((segment) => segment === "." || segment === "..")) {
        throw new StorageRequestError(400, `${fieldName} contains an invalid path segment.`);
    }

    return rawSegments.filter(Boolean);
}

function normalizePrefix(value) {
    const segments = normalizeSegments(value, "prefix", { allowEmpty: true });
    return segments.length > 0 ? `${segments.join("/")}/` : "";
}

function normalizeObjectKey(value, fieldName = "key") {
    const isFolder = typeof value === "string" && value.trim().replaceAll("\\", "/").endsWith("/");
    const normalized = normalizeSegments(value, fieldName).join("/");
    return isFolder ? `${normalized}/` : normalized;
}

function normalizeFolderName(value) {
    if (typeof value !== "string" || !value.trim()) {
        throw new StorageRequestError(400, "folderName is required.");
    }

    const folderName = value.trim();
    if (
        folderName === "."
        || folderName === ".."
        || folderName.includes("/")
        || folderName.includes("\\")
        || /[\u0000-\u001F\u007F]/.test(folderName)
    ) {
        throw new StorageRequestError(400, "folderName must be a single valid folder name.");
    }

    return folderName;
}

function normalizeUploadFileName(value) {
    if (typeof value !== "string") {
        throw new StorageRequestError(400, "The uploaded file must have a valid filename.");
    }

    const fileName = path.posix
        .basename(value.replaceAll("\\", "/"))
        .trim()
        .replace(/[\u0000-\u001F\u007F]/g, "");

    if (!fileName || fileName === "." || fileName === "..") {
        throw new StorageRequestError(400, "The uploaded file must have a valid filename.");
    }

    return fileName;
}

function parseListLimit(value) {
    if (value === undefined || value === "") return 100;

    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1) {
        throw new StorageRequestError(400, "limit must be a positive integer.");
    }

    return Math.min(limit, MAX_LIST_LIMIT);
}

function parseAnalyticsLimit(value) {
    if (value === undefined || value === "") return DEFAULT_ANALYTICS_LIMIT;

    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_ANALYTICS_LIMIT) {
        throw new StorageRequestError(
            400,
            `limit must be an integer between 1 and ${MAX_ANALYTICS_LIMIT}.`,
        );
    }
    return limit;
}

function parseBooleanQuery(value, fieldName) {
    if (value === undefined || value === "") return false;
    if (value === true || value === "true" || value === "1") return true;
    if (value === false || value === "false" || value === "0") return false;
    throw new StorageRequestError(400, `${fieldName} must be true or false.`);
}

function parseOptionalQueryString(value, fieldName) {
    if (value === undefined || value === null) return "";
    if (typeof value !== "string") {
        throw new StorageRequestError(400, `${fieldName} must be a string.`);
    }
    return value.trim();
}

function roundAnalyticsPercentage(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
}

function buildAnalyticsQuerySignature({
    sort,
    type,
    prefix,
    search,
    nonZero,
    zeroOnly,
    rootOnly,
    snapshotId,
}) {
    return JSON.stringify({
        sort, type, prefix, search, nonZero, zeroOnly, rootOnly, snapshotId,
    });
}

function encodeAnalyticsCursor(offset, signature) {
    return Buffer.from(
        JSON.stringify({
            version: 1,
            offset,
            signature,
        }),
        "utf8",
    ).toString("base64url");
}

function decodeAnalyticsCursor(value, expectedSignature) {
    if (value === undefined || value === "") return 0;
    if (typeof value !== "string") {
        throw new StorageRequestError(400, "cursor must be a string.");
    }

    try {
        const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
        if (
            decoded?.version !== 1
            || !Number.isInteger(decoded.offset)
            || decoded.offset < 0
            || decoded.signature !== expectedSignature
        ) {
            throw new Error("Invalid cursor payload");
        }
        return decoded.offset;
    } catch {
        throw new StorageRequestError(
            400,
            "cursor is invalid or does not match the active analytics filters.",
        );
    }
}

function compareAnalyticsModifiedDates(first, second, direction) {
    const firstTime = first.lastModified ? Date.parse(first.lastModified) : Number.NaN;
    const secondTime = second.lastModified ? Date.parse(second.lastModified) : Number.NaN;
    const firstValid = Number.isFinite(firstTime);
    const secondValid = Number.isFinite(secondTime);

    if (!firstValid && !secondValid) return 0;
    if (!firstValid) return 1;
    if (!secondValid) return -1;
    return direction === "asc" ? firstTime - secondTime : secondTime - firstTime;
}

function compareAnalyticsFiles(first, second, sort) {
    let comparison = 0;

    switch (sort) {
        case "size_asc":
            comparison = first.size - second.size;
            break;
        case "modified_desc":
            comparison = compareAnalyticsModifiedDates(first, second, "desc");
            break;
        case "modified_asc":
            comparison = compareAnalyticsModifiedDates(first, second, "asc");
            break;
        case "name_asc":
            comparison = first.name.localeCompare(second.name);
            break;
        case "name_desc":
            comparison = second.name.localeCompare(first.name);
            break;
        case "size_desc":
        default:
            comparison = second.size - first.size;
            break;
    }

    return comparison || first.key.localeCompare(second.key);
}

function toRankedAnalyticsFile(file, rank, largestFileSize, totalStorageSize) {
    return {
        rank,
        key: file.key,
        name: file.name,
        folder: file.folder,
        size: file.size,
        contentType: file.contentType,
        type: file.type,
        lastModified: file.lastModified,
        cdnUrl: file.cdnUrl,
        relativeToLargestPercentage: largestFileSize > 0
            ? roundAnalyticsPercentage((file.size / largestFileSize) * 100)
            : 0,
        percentageOfTotal: totalStorageSize > 0
            ? roundAnalyticsPercentage((file.size / totalStorageSize) * 100)
            : 0,
    };
}

function analyticsSnapshotMetadata(snapshot) {
    return {
        generatedAt: snapshot.generatedAt,
        cacheAgeSeconds: snapshot.cacheAgeSeconds,
        cacheStatus: snapshot.cacheStatus,
        ...(snapshot.refreshWarning
            ? { refreshWarning: snapshot.refreshWarning }
            : {}),
    };
}

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

function isProtectedKey(key) {
    return PROTECTED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function assertDeletable(key) {
    if (isProtectedKey(key)) {
        throw new StorageRequestError(403, `Deletion is not allowed for protected key: ${key}`);
    }
}

function encodeCopySource(key) {
    const encodedKey = key
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
    return `${encodeURIComponent(BUCKET_NAME)}/${encodedKey}`;
}

async function buildCopyObjectCommand(sourceKey, destinationKey) {
    const metadata = await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: sourceKey,
    }));

    const sourceMetadata = { ...(metadata.Metadata || {}) };
    if (!sourceMetadata["created-at"] && metadata.LastModified) {
        sourceMetadata["created-at"] = metadata.LastModified.toISOString();
    }

    return new CopyObjectCommand({
        Bucket: BUCKET_NAME,
        CopySource: encodeCopySource(sourceKey),
        Key: destinationKey,
        MetadataDirective: "REPLACE",
        Metadata: sourceMetadata,
        ...(metadata.ContentType ? { ContentType: metadata.ContentType } : {}),
        ...(metadata.CacheControl ? { CacheControl: metadata.CacheControl } : {}),
        ...(metadata.ContentDisposition ? { ContentDisposition: metadata.ContentDisposition } : {}),
        ...(metadata.ContentEncoding ? { ContentEncoding: metadata.ContentEncoding } : {}),
        ...(metadata.ContentLanguage ? { ContentLanguage: metadata.ContentLanguage } : {}),
    });
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

    const workers = Array.from(
        { length: Math.min(concurrency, items.length) },
        () => worker(),
    );
    await Promise.all(workers);
    return results;
}

async function getListedObjectMetadata(key) {
    try {
        const metadata = await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        }));
        return {
            contentType: metadata.ContentType || inferContentType(key),
            createdAt: metadata.Metadata?.["created-at"] || null
        };
    } catch (error) {
        console.warn(
            `[Storage] metadata lookup failed for key=${JSON.stringify(key)}; using inferred content type (${error?.name || "UnknownError"}).`,
        );
        return {
            contentType: inferContentType(key),
            createdAt: null
        };
    }
}

async function multipartUpload({ key, filePath, contentType }) {
    const createdUpload = await s3Client.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Metadata: {
            "created-at": new Date().toISOString()
        }
    }));

    const uploadId = createdUpload.UploadId;
    if (!uploadId) {
        throw new Error("S3 did not return a multipart upload ID.");
    }

    try {
        const stats = fs.statSync(filePath);
        const fileSize = stats.size;
        const partCount = Math.ceil(fileSize / MULTIPART_PART_SIZE_BYTES);
        const uploadedParts = [];

        for (let batchStart = 0; batchStart < partCount; batchStart += MULTIPART_CONCURRENCY) {
            const batchEnd = Math.min(batchStart + MULTIPART_CONCURRENCY, partCount);
            const batch = [];

            for (let partIndex = batchStart; partIndex < batchEnd; partIndex += 1) {
                const start = partIndex * MULTIPART_PART_SIZE_BYTES;
                // fs.createReadStream `end` is inclusive
                const end = Math.min(start + MULTIPART_PART_SIZE_BYTES - 1, fileSize - 1);
                const partNumber = partIndex + 1;

                batch.push(
                    s3Client.send(new UploadPartCommand({
                        Bucket: BUCKET_NAME,
                        Key: key,
                        UploadId: uploadId,
                        PartNumber: partNumber,
                        Body: fs.createReadStream(filePath, { start, end }),
                        ContentLength: end - start + 1,
                    })).then((result) => {
                        if (!result.ETag) {
                            throw new Error(`S3 did not return an ETag for multipart part ${partNumber}.`);
                        }
                        return {
                            ETag: result.ETag,
                            PartNumber: partNumber,
                        };
                    }),
                );
            }

            uploadedParts.push(...await Promise.all(batch));
        }

        uploadedParts.sort((first, second) => first.PartNumber - second.PartNumber);

        await s3Client.send(new CompleteMultipartUploadCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
            MultipartUpload: {
                Parts: uploadedParts,
            },
        }));
    } catch (error) {
        try {
            await s3Client.send(new AbortMultipartUploadCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                UploadId: uploadId,
            }));
        } catch (abortError) {
            console.error(
                `[Storage] failed to abort multipart upload for key=${JSON.stringify(key)}:`,
                abortError,
            );
        }
        throw error;
    }
}

export async function listObjects(req, res) {
    try {
        const prefix = normalizePrefix(req.query.prefix);
        const limit = parseListLimit(req.query.limit);
        const cursor = req.query.cursor;
        const search = req.query.search;

        if (cursor !== undefined && typeof cursor !== "string") {
            throw new StorageRequestError(400, "cursor must be a string.");
        }
        if (search !== undefined && typeof search !== "string") {
            throw new StorageRequestError(400, "search must be a string.");
        }

        const result = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            Delimiter: "/",
            MaxKeys: limit,
            ...(cursor ? { ContinuationToken: cursor } : {}),
        }));

        const searchTerm = search?.trim().toLowerCase() || "";
        const folders = (result.CommonPrefixes || [])
            .map(({ Prefix: folderPrefix }) => {
                const normalizedFolderPrefix = folderPrefix || "";
                return {
                    prefix: normalizedFolderPrefix,
                    name: path.posix.basename(normalizedFolderPrefix.replace(/\/$/, "")),
                };
            })
            .filter((folder) => !searchTerm || folder.name.toLowerCase().includes(searchTerm));

        const listedFiles = (result.Contents || [])
            .filter((object) => object.Key && !object.Key.endsWith("/"))
            .map((object) => ({
                key: object.Key,
                name: path.posix.basename(object.Key),
                size: object.Size || 0,
                lastModified: object.LastModified || null,
            }))
            .filter((file) => !searchTerm || file.name.toLowerCase().includes(searchTerm));

        const files = await mapWithConcurrency(
            listedFiles,
            METADATA_CONCURRENCY,
            async (file) => {
                const meta = await getListedObjectMetadata(file.key);
                return {
                    ...file,
                    contentType: meta.contentType,
                    createdAt: meta.createdAt,
                    cdnUrl: buildCdnUrl(file.key),
                };
            }
        );

        return sendSuccess(res, "Files and folders retrieved successfully.", {
            folders,
            files,
            nextCursor: result.IsTruncated ? (result.NextContinuationToken || null) : null,
            totalSize: files.reduce((sum, file) => sum + file.size, 0),
        });
    } catch (error) {
        return handleControllerError(req, res, "list", error);
    }
}

export async function uploadFile(req, res) {
    let key = "";

    try {
        if (!req.file) {
            throw new StorageRequestError(400, "No file was provided.");
        }

        // With multer-s3, the file is already uploaded to S3 by the middleware.
        // The final S3 key is available in req.file.key.
        key = req.file.key;
        const contentType = req.file.mimetype || req.file.contentType || "application/octet-stream";

        invalidateStorageAnalyticsCache();
        auditStorageAction(req, "upload", key);
        emitStorageUpdated("upload");
        
        return sendSuccess(res, "File uploaded successfully.", {
            key,
            cdnUrl: buildCdnUrl(key),
            size: req.file.size,
            contentType,
        });
    } catch (error) {
        return handleControllerError(req, res, "upload", error, key ? [key] : []);
    }
}

export async function getPresignedUploadUrl(req, res) {
    try {
        const rawFilename = req.query.filename || req.body.filename;
        const rawPrefix = req.query.prefix || req.body.prefix || "";
        const contentType = req.query.contentType || req.body.contentType || "application/octet-stream";

        if (!rawFilename) {
            throw new StorageRequestError(400, "filename is required for a presigned URL.");
        }

        // Sanitize and build the key
        const sanitizedFilename = rawFilename.replace(/\s+/g, "_");
        let sanitizedPrefix = rawPrefix.replace(/\\/g, "/").replace(/^\/+/, "");
        if (sanitizedPrefix && !sanitizedPrefix.endsWith("/")) {
            sanitizedPrefix += "/";
        }
        
        const key = `${sanitizedPrefix}${sanitizedFilename}`;
        assertDeletable(key); // Ensures we don't accidentally overwrite protected files

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            ContentType: contentType,
        });

        // Generate a presigned URL valid for 15 minutes
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

        return sendSuccess(res, "Presigned URL generated successfully.", {
            presignedUrl,
            key,
            cdnUrl: buildCdnUrl(key)
        });
    } catch (error) {
        return handleControllerError(req, res, "generate presigned URL", error);
    }
}

async function recursiveDeletePrefix(prefix) {
    let isTruncated = true;
    let continuationToken = undefined;

    while (isTruncated) {
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            ContinuationToken: continuationToken
        }));

        if (listResponse.Contents && listResponse.Contents.length > 0) {
            const keysToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key }));
            
            // Delete in batches of 1000
            for (let i = 0; i < keysToDelete.length; i += 1000) {
                const batch = keysToDelete.slice(i, i + 1000);
                await s3Client.send(new DeleteObjectsCommand({
                    Bucket: BUCKET_NAME,
                    Delete: {
                        Objects: batch,
                        Quiet: true
                    }
                }));
            }
        }

        isTruncated = listResponse.IsTruncated;
        continuationToken = listResponse.NextContinuationToken;
    }
}

export async function deleteObject(req, res) {
    let key = "";

    try {
        key = normalizeObjectKey(req.body?.key);
        assertDeletable(key);

        if (key.endsWith("/")) {
            await recursiveDeletePrefix(key);
        } else {
            await s3Client.send(new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
            }));
        }

        invalidateStorageAnalyticsCache();
        auditStorageAction(req, "delete", key);
        emitStorageUpdated("delete");
        return sendSuccess(res, "File or folder deleted successfully.", {
            deletedKey: key,
        });
    } catch (error) {
        return handleControllerError(req, res, "delete", error, key ? [key] : []);
    }
}

export async function deleteObjects(req, res) {
    let keys = [];

    try {
        if (!Array.isArray(req.body?.keys) || req.body.keys.length === 0) {
            throw new StorageRequestError(400, "keys must be a non-empty array.");
        }
        if (req.body.keys.length > MAX_BULK_DELETE_KEYS) {
            throw new StorageRequestError(
                400,
                `A maximum of ${MAX_BULK_DELETE_KEYS} keys can be deleted in one request.`,
            );
        }

        keys = [...new Set(
            req.body.keys.map((key, index) => normalizeObjectKey(key, `keys[${index}]`)),
        )];
        keys.forEach(assertDeletable);

        const folderKeys = keys.filter(k => k.endsWith("/"));
        const fileKeys = keys.filter(k => !k.endsWith("/"));

        for (const folderKey of folderKeys) {
            await recursiveDeletePrefix(folderKey);
        }

        let result = {};
        if (fileKeys.length > 0) {
            result = await s3Client.send(new DeleteObjectsCommand({
                Bucket: BUCKET_NAME,
                Delete: {
                    Objects: fileKeys.map((k) => ({ Key: k })),
                    Quiet: false,
                },
            }));
        }

        if (result.Errors?.length) {
            invalidateStorageAnalyticsCache();
            auditStorageAction(req, "bulk-delete", keys, "partial");
            console.error("[Storage] bulk-delete returned S3 errors:", result.Errors);
            return res.status(502).json(buildStorageErrorResponse(
                req,
                "S3 could not delete every requested object.",
            ));
        }

        const deletedCount = (result.Deleted?.length ?? fileKeys.length) + folderKeys.length;
        invalidateStorageAnalyticsCache();
        auditStorageAction(req, "bulk-delete", keys);
        emitStorageUpdated("bulk-delete");
        return sendSuccess(res, "Files or folders deleted successfully.", {
            deletedCount,
        });
    } catch (error) {
        return handleControllerError(req, res, "bulk-delete", error, keys);
    }
}

export async function createFolder(req, res) {
    let folderKey = "";

    try {
        const prefix = normalizePrefix(req.body?.prefix);
        const folderName = normalizeFolderName(req.body?.folderName);
        folderKey = `${prefix}${folderName}/`;

        await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: folderKey,
            Body: Buffer.alloc(0),
            ContentLength: 0,
            ContentType: "application/x-directory",
        }));

        invalidateStorageAnalyticsCache();
        auditStorageAction(req, "create-folder", folderKey);
        emitStorageUpdated("create-folder");
        return sendSuccess(res, "Folder created successfully.", {
            folderKey,
        });
    } catch (error) {
        return handleControllerError(req, res, "create folder", error, folderKey ? [folderKey] : []);
    }
}

export async function getPresignedUrl(req, res) {
    let key = "";

    try {
        key = normalizeObjectKey(req.body?.key);
        const downloadUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                ResponseContentDisposition: `attachment; filename="${path.posix.basename(key)}"`,
            }),
            { expiresIn: STORAGE_PRESIGNED_URL_EXPIRY_SECONDS },
        );

        return sendSuccess(res, "Temporary download URL generated successfully.", {
            downloadUrl,
            expiresIn: "1 hour",
        });
    } catch (error) {
        return handleControllerError(req, res, "generate presigned URL for", error, key ? [key] : []);
    }
}

export async function getObjectMetadata(req, res) {
    let key = "";

    try {
        key = normalizeObjectKey(req.query.key);
        const metadata = await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        }));

        return sendSuccess(res, "File or folder metadata retrieved successfully.", {
            key,
            size: metadata.ContentLength || 0,
            contentType: metadata.ContentType || inferContentType(key),
            lastModified: metadata.LastModified || null,
            createdAt: metadata.Metadata?.["created-at"] || null,
            cdnUrl: buildCdnUrl(key),
            etag: metadata.ETag || null,
        });
    } catch (error) {
        return handleControllerError(req, res, "get metadata for", error, key ? [key] : []);
    }
}

async function recursiveRenamePrefix(sourcePrefix, destinationPrefix) {
    let isTruncated = true;
    let continuationToken = undefined;

    while (isTruncated) {
        const listResponse = await s3Client.send(new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: sourcePrefix,
            ContinuationToken: continuationToken
        }));

        if (listResponse.Contents && listResponse.Contents.length > 0) {
            // 1. Copy all objects to the new prefix
            const copyPromises = listResponse.Contents.map(obj => {
                const newKey = destinationPrefix + obj.Key.substring(sourcePrefix.length);
                return buildCopyObjectCommand(obj.Key, newKey)
                    .then((command) => s3Client.send(command));
            });
            await Promise.all(copyPromises);

            // 2. Delete the old objects
            const keysToDelete = listResponse.Contents.map(obj => ({ Key: obj.Key }));
            for (let i = 0; i < keysToDelete.length; i += 1000) {
                const batch = keysToDelete.slice(i, i + 1000);
                await s3Client.send(new DeleteObjectsCommand({
                    Bucket: BUCKET_NAME,
                    Delete: {
                        Objects: batch,
                        Quiet: true
                    }
                }));
            }
        }

        isTruncated = listResponse.IsTruncated;
        continuationToken = listResponse.NextContinuationToken;
    }
}

export async function renameObject(req, res) {
    let sourceKey = "";
    let destinationKey = "";

    try {
        sourceKey = normalizeObjectKey(req.body?.sourceKey, "sourceKey");
        destinationKey = normalizeObjectKey(req.body?.destinationKey, "destinationKey");

        if (sourceKey === destinationKey) {
            throw new StorageRequestError(400, "sourceKey and destinationKey must be different.");
        }
        assertDeletable(sourceKey);

        if (sourceKey.endsWith("/")) {
            await recursiveRenamePrefix(sourceKey, destinationKey);
        } else {
            await s3Client.send(await buildCopyObjectCommand(sourceKey, destinationKey));
            await s3Client.send(new DeleteObjectCommand({
                Bucket: BUCKET_NAME,
                Key: sourceKey,
            }));
        }

        invalidateStorageAnalyticsCache();
        auditStorageAction(req, "rename", [sourceKey, destinationKey]);
        emitStorageUpdated("rename");
        
        return sendSuccess(res, "File or folder renamed successfully.", {
            newKey: destinationKey,
            cdnUrl: buildCdnUrl(destinationKey),
        });
    } catch (error) {
        return handleControllerError(
            req,
            res,
            "rename",
            error,
            [sourceKey, destinationKey].filter(Boolean),
        );
    }
}

export async function getStorageConfiguration(req, res) {
    try {
        setPrivateNoStore(res);
        const configuration = await getSafeStorageConfiguration();
        return sendSuccess(
            res,
            "Storage configuration retrieved successfully.",
            configuration,
        );
    } catch (error) {
        return handleControllerError(req, res, "retrieve storage configuration", error);
    }
}

export async function getStorageHealth(req, res) {
    try {
        setPrivateNoStore(res);
        const health = await checkStorageConnection();
        return sendSuccess(res, "Storage health check completed.", health);
    } catch (error) {
        return handleControllerError(req, res, "check storage health", error);
    }
}

export async function testStorageConnection(req, res) {
    try {
        setPrivateNoStore(res);
        const connection = await checkStorageConnection();
        return sendSuccess(res, "Storage connection test completed.", connection);
    } catch (error) {
        return handleControllerError(req, res, "test storage connection", error);
    }
}

export async function getStorageAnalyticsSummary(req, res) {
    try {
        setPrivateNoStore(res);
        const forceRefresh = parseBooleanQuery(req.query?.refresh, "refresh");
        const snapshot = await getStorageAnalyticsSnapshot({ forceRefresh });

        return sendSuccess(res, "Storage analytics summary retrieved successfully.", {
            ...snapshot.summary,
            ...analyticsSnapshotMetadata(snapshot),
        });
    } catch (error) {
        return handleControllerError(req, res, "calculate storage analytics summary", error);
    }
}

export async function getStorageAnalyticsFiles(req, res) {
    try {
        setPrivateNoStore(res);
        const query = req.query || {};
        const forceRefresh = parseBooleanQuery(query.refresh, "refresh");
        const nonZero = parseBooleanQuery(query.nonZero, "nonZero");
        const zeroOnly = parseBooleanQuery(query.zeroOnly, "zeroOnly");
        const rootOnly = parseBooleanQuery(query.rootOnly, "rootOnly");

        if (nonZero && zeroOnly) {
            throw new StorageRequestError(400, "nonZero and zeroOnly cannot both be true.");
        }

        const sort = (parseOptionalQueryString(query.sort, "sort") || "size_desc").toLowerCase();
        const requestedType = parseOptionalQueryString(query.type, "type").toLowerCase();
        const type = requestedType === "all" ? "" : requestedType;
        const prefix = query.prefix ? normalizePrefix(query.prefix) : "";
        const search = parseOptionalQueryString(query.search, "search").toLowerCase();
        const limit = parseAnalyticsLimit(query.limit);

        if (!ANALYTICS_SORT_OPTIONS.has(sort)) {
            throw new StorageRequestError(
                400,
                `sort must be one of: ${[...ANALYTICS_SORT_OPTIONS].join(", ")}.`,
            );
        }
        if (type && !ANALYTICS_TYPE_OPTIONS.has(type)) {
            throw new StorageRequestError(
                400,
                `type must be one of: ${[...ANALYTICS_TYPE_OPTIONS].join(", ")}.`,
            );
        }

        const snapshot = await getStorageAnalyticsSnapshot({ forceRefresh });
        const signature = buildAnalyticsQuerySignature({
            sort,
            type,
            prefix,
            search,
            nonZero,
            zeroOnly,
            rootOnly,
            snapshotId: snapshot.generatedAt,
        });
        const offset = decodeAnalyticsCursor(query.cursor, signature);
        const matchingFiles = snapshot.files
            .filter((file) => !type || file.type === type)
            .filter((file) => !prefix || file.key.startsWith(prefix))
            .filter((file) => !search || file.name.toLowerCase().includes(search))
            .filter((file) => !nonZero || file.size > 0)
            .filter((file) => !zeroOnly || file.size === 0)
            .filter((file) => !rootOnly || !file.folder)
            .sort((first, second) => compareAnalyticsFiles(first, second, sort));

        if (offset > matchingFiles.length) {
            throw new StorageRequestError(400, "cursor points beyond the available results.");
        }

        const endOffset = Math.min(offset + limit, matchingFiles.length);
        const largestFileSize = snapshot.summary.largestFile?.size || 0;
        const totalStorageSize = snapshot.summary.totalSize;
        const files = matchingFiles
            .slice(offset, endOffset)
            .map((file, index) => toRankedAnalyticsFile(
                file,
                offset + index + 1,
                largestFileSize,
                totalStorageSize,
            ));

        return sendSuccess(res, "Storage file analytics retrieved successfully.", {
            files,
            nextCursor: endOffset < matchingFiles.length
                ? encodeAnalyticsCursor(endOffset, signature)
                : null,
            totalMatchingFiles: matchingFiles.length,
            largestFileSize,
            totalStorageSize,
            ...analyticsSnapshotMetadata(snapshot),
        });
    } catch (error) {
        return handleControllerError(req, res, "list storage analytics files", error);
    }
}

export async function getStorageAnalyticsBreakdown(req, res) {
    try {
        setPrivateNoStore(res);
        const forceRefresh = parseBooleanQuery(req.query?.refresh, "refresh");
        const snapshot = await getStorageAnalyticsSnapshot({ forceRefresh });

        return sendSuccess(res, "Storage breakdown retrieved successfully.", {
            ...snapshot.breakdown,
            ...analyticsSnapshotMetadata(snapshot),
        });
    } catch (error) {
        return handleControllerError(req, res, "calculate storage analytics breakdown", error);
    }
}
