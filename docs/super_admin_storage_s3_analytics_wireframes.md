<!--
─────────────────────────────────────────────────────────
🚨 HOSTING & ARCHITECTURE RULE 🚨
1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
2. FRONTEND IS HOSTED ON VERCEL
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 NAMING CONVENTION RULE 🚨
1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
─────────────────────────────────────────────────────────
-->

<!--
─────────────────────────────────────────────────────────
🚨 CRITICAL AI AND SYSTEM RULES 🚨
1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
─────────────────────────────────────────────────────────
-->

# S3 Storage Frontend Wireframe

This document outlines the visual structure and layout of the new S3 Storage page for the Super Admin dashboard.

## Page Layout & Grid

The page will follow the standard `SuperAdminLayout` spacing.

```text
+---------------------------------------------------------------------------------------+
| Sidebar        |               |  Page Header                                         |
| (Navigation)   |  - Files      |  [Title: Storage Management]                         |
|                |  - Analytics  |  [Subtitle: Manage AWS S3 Bucket Files & Assets]     |
|                |  - S3         |                                                      |
|                |               |  +------------------------------------------------+  |
|                |               |  | Action Bar                                     |  |
|                |               |  | [Breadcrumbs] root / support-attachments /     |  |
|                |               |  |                                                |  |
|                |               |  | [Search Input]           [+ Create Folder]     |  |
|                |               |  |                          [+ Upload File]       |  |
|                |               |  +------------------------------------------------+  |
|                |               |                                                      |
|                |               |  +------------------------------------------------+  |
|                |               |  | Data Table                                     |  |
|                |               |  | [ ] Name            | Size | Type | L.Mod | Act|  |
|                |               |  |------------------------------------------------|  |
|                |               |  | [ ] 📁 2026/        |  -   | Dir  |  -    | ...|  |
|                |               |  | [ ] 📄 invoice.pdf  | 2 MB | PDF  | 2h    | ...|  |
|                |               |  | [ ] 🖼️ avatar.png   | 5 KB | PNG  | 1d    | ...|  |
|                |               |  +------------------------------------------------+  |
|                |               |                                                      |
|                |               |  (If items are selected, a sticky bottom bar)        |
|                |               |  +------------------------------------------------+  |
|                |               |  | 2 items selected             [Delete Selected] |  |
|                |               |  +------------------------------------------------+  |
+---------------------------------------------------------------------------------------+
```

## Detailed Component Breakdown

### 1. Header Section
- **Title**: "Storage Management"
- **Subtitle**: "Direct access to AWS S3 bucket for Super Admins."

### 2. Toolbar & Navigation
- **Breadcrumbs**: Built dynamically from the `prefix` state. Clicking a breadcrumb segment navigates "up" a folder.
- **Search Bar**: A text input to filter the files displayed in the current table view (client-side filtering).
- **Create Folder Button**: Opens a Dialog modal prompting for a folder name.
- **Upload Button**: Opens a file picker. Shows upload progress in a toast or modal.

### 3. File Table (The `DataTable`)
- **Checkbox Column**: To allow bulk selection for the `deleteObjects` endpoint.
- **Name Column**: Displays an icon based on file type (e.g., Lucide `Folder`, `Image`, `FileText`). Folders are clickable and update the `prefix` state to navigate into them.
- **Actions Column (Drop-down Menu)**:
  - **Copy Link**: Copies the `cdnUrl` to the clipboard.
  - **Download**: Fetches the presigned URL from the backend and triggers a download.
  - **Rename**: Opens a Dialog to rename the file.
  - **Delete**: Triggers the `DangerConfirmDialog`.

### 4. Modals & Alerts
- **Rename Modal**: Simple input field pre-filled with the current file name.
- **Delete Confirm**: Uses `DangerConfirmDialog` requiring the user to type "delete" for single files, or "bulk delete" for multiple files.
- **Upload Progress**: If the file is large, a progress bar using `ProgressOverlay.tsx` or a custom toast to show upload % via Axios.

## Responsive Design
- On mobile/small screens, the "Type" and "Last Mod" columns will be hidden.
- The Action Bar will stack vertically if the screen width is too narrow.

---

# Super Admin Storage: S3 Configuration and Analytics Wireframes

## 1. Scope

This document defines two separate Super Admin storage pages:

1. **Storage Analytics**
2. **S3 Configuration**

The existing **Files** page is intentionally not repeated here.

The information hierarchy is inspired by the supplied Supabase Storage screenshots, while the styling and security rules remain specific to Classgrid.

### Suggested navigation

```text
Storage
├── Files       (already covered)
├── Analytics   /superadmin/storage/analytics
└── S3          /superadmin/storage/s3
```

### Shared visual direction

- Desktop-first Super Admin layout.
- Dark background with clear bordered panels.
- Green accent for healthy, connected, and successful states.
- Amber accent for warnings.
- Red accent for errors and destructive actions.
- Square or lightly rounded panels; avoid oversized rounded cards.
- Page width should use the available dashboard content area.
- Never display an AWS secret access key, session token, or complete credential.

---

## 2. S3 Configuration Page

### Purpose

Give the Super Admin a safe, read-only view of the active AWS S3 connection and operational limits. The page may test the connection, but it must not expose or create AWS credentials.

### Header

```text
S3 Configuration
View the active bucket connection, delivery configuration, and storage safeguards.

                                              [Refresh] [Test connection]
```

### Full desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ S3 Configuration                                                            [Refresh]       │
│ View the active bucket connection and storage safeguards.          [Test connection]         │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│ CONNECTION                                                                                   │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ● Connected                                                        Checked 15 seconds ago │ │
│ │ AWS S3 is responding normally.                                    Latency: 142 ms         │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Endpoint       https://s3.eu-north-1.amazonaws.com                         [Copy]         │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Bucket         erp-classgrid                                                [Copy]         │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Region         eu-north-1                                                   [Copy]         │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ CDN            https://cdn.classgrid.in                                     [Copy] [Open]  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                              │
│ STORAGE RULES                                                                                │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐  │
│ │ Maximum upload     │ │ Multipart starts   │ │ Download URL       │ │ Upload rate limit  │  │
│ │ 2 GB               │ │ Above 100 MB       │ │ Expires in 1 hour  │ │ 30 per minute      │  │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘ └────────────────────┘  │
│                                                                                              │
│ SECURITY                                                                                     │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Authentication       Super Admin only                                      [Protected]   │ │
│ │ Credentials          Configured through secure environment variables        [Configured]  │ │
│ │ Audit logging        Upload, delete, and rename actions logged               [Enabled]     │ │
│ │ Protected paths      1 default path + configured additions                  [View paths]  │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                              │
│ CONNECTION INFORMATION                                                                       │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Configuration source     Server environment                                               │ │
│ │ Storage provider         AWS S3                                                           │ │
│ │ Public delivery          CloudFront CDN                                                   │ │
│ │ Metadata source          S3 object metadata                                               │ │
│ │ Last successful test     24 Jul 2026, 9:40 PM                                             │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Connection states

#### Loading

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Checking S3 connection...                                            │
│ [animated progress line]                                             │
└──────────────────────────────────────────────────────────────────────┘
```

#### Connected

```text
● Connected
AWS S3 is responding normally.
```

#### Degraded

```text
● Connected with warnings
The bucket is reachable, but one or more metadata checks were slow.
[Run test again]
```

#### Disconnected

```text
● Connection failed
The server could not reach the configured bucket.
[Run test again]

Show a safe error message and request ID.
Never show credentials or raw AWS authorization headers.
```

### Test connection interaction

1. Super Admin clicks **Test connection**.
2. Button changes to **Testing...** and becomes disabled.
3. Backend performs a minimal S3 connection check.
4. Page displays:
   - connection status;
   - response latency;
   - checked time;
   - safe error message when unsuccessful.
5. Do not display object keys during this test.

### Copy interactions

- Copy Endpoint
- Copy Bucket
- Copy Region
- Copy CDN URL
- Show a short `Copied` confirmation beside the clicked button.

### Protected paths drawer

```text
┌──────────────────────────────────────────────────────────────┐
│ Protected paths                                          [×] │
├──────────────────────────────────────────────────────────────┤
│ These objects cannot be deleted or renamed.                  │
│                                                              │
│ • Homepage.png                                               │
│ • Additional server-configured prefixes, when present        │
│                                                              │
│ Configuration source: secure server environment               │
└──────────────────────────────────────────────────────────────┘
```

### Do not copy from the Supabase S3 page

The supplied screenshot includes access-key management. Classgrid must not reproduce that section.

Do not add:

- New access key button
- Secret-key reveal button
- Secret-key copy button
- Credential editing in the browser
- A toggle that writes credentials or disables the bucket

AWS credentials must remain managed through secure server or deployment configuration.

### Backend required for this page

These safe configuration endpoints still need to be added:

```text
GET  /api/super-admin/storage/configuration
GET  /api/super-admin/storage/health
POST /api/super-admin/storage/test-connection
```

Suggested safe configuration response:

```json
{
  "success": true,
  "message": "Storage configuration retrieved successfully.",
  "data": {
    "provider": "AWS S3",
    "connected": true,
    "endpoint": "https://s3.eu-north-1.amazonaws.com",
    "bucket": "erp-classgrid",
    "region": "eu-north-1",
    "cdnBaseUrl": "https://cdn.classgrid.in",
    "maxUploadBytes": 2147483648,
    "multipartThresholdBytes": 104857600,
    "presignedUrlExpirySeconds": 3600,
    "uploadRateLimitPerMinute": 30,
    "credentialsConfigured": true,
    "auditLoggingEnabled": true,
    "protectedPrefixes": [
      "Homepage.png"
    ],
    "checkedAt": "2026-07-24T16:10:00.000Z",
    "latencyMs": 142
  }
}
```

The response must never contain an access key, secret key, session token, or raw AWS error object.

---

## 3. Storage Analytics Page

### Purpose

Show current bucket usage and make it easy to identify the largest, smallest, oldest, newest, and most storage-heavy files and folders.

### Header

```text
Storage Analytics
Understand current S3 usage by file, type, folder, age, and size.

Last calculated 2 minutes ago                     [Refresh analytics]
```

### Full desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ Storage Analytics                                             Last calculated 2 minutes ago  │
│ Understand current S3 usage.                                      [Refresh analytics]        │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐  │
│ │ Total storage    │ │ Total files      │ │ Total folders    │ │ Average file size        │  │
│ │ 84.7 GB          │ │ 12,480           │ │ 96               │ │ 6.9 MB                   │  │
│ └──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────────────┘  │
│                                                                                              │
│ ┌────────────────────────────┐ ┌────────────────────────────┐ ┌────────────────────────────┐ │
│ │ Largest file               │ │ Smallest non-empty file    │ │ Zero-byte files            │ │
│ │ training-video.mp4         │ │ note.txt                   │ │ 18                         │ │
│ │ 1.8 GB                     │ │ 24 bytes                   │ │ [Review files]             │ │
│ └────────────────────────────┘ └────────────────────────────┘ └────────────────────────────┘ │
│                                                                                              │
│ FILE SIZE RANKING                                                                           │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [Search files...] [All types ▾] [All folders ▾] [Largest first ▾] [Top 25 ▾]            │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ 1  training-video.mp4    videos/       Video      1.8 GB      2.13% of total            │ │
│ │    ███████████████████████████████████████████████████████████████████████ 100%          │ │
│ │                                                                                          │ │
│ │ 2  archive.zip           backups/      Archive    1.2 GB      1.42% of total            │ │
│ │    ████████████████████████████████████████████████                       66.7%           │ │
│ │                                                                                          │ │
│ │ 3  handbook.pdf          documents/    PDF        780 MB      0.90% of total            │ │
│ │    ████████████████████████████████                                   42.3%              │ │
│ │                                                                                          │ │
│ │ 4  banner.png            assets/       Image      14 MB       0.02% of total            │ │
│ │    █                                                                        0.76%         │ │
│ ├──────────────────────────────────────────────────────────────────────────────────────────┤ │
│ │ Showing 1–25 of 12,480                                      [Previous] [Next]            │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                              │
│ ┌──────────────────────────────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │ STORAGE BY FILE TYPE                     │ │ STORAGE BY FOLDER                           │ │
│ │                                          │ │                                             │ │
│ │ Video       ███████████████  42.4 GB     │ │ videos/      ███████████████  38.1 GB      │ │
│ │ Documents   ███████          19.8 GB     │ │ documents/   ███████          18.7 GB      │ │
│ │ Images      ████             11.2 GB     │ │ assets/      ████             10.4 GB      │ │
│ │ Archives    ███               8.1 GB     │ │ backups/     ███               8.1 GB      │ │
│ │ Other       █                 3.2 GB     │ │ other/       ██                9.4 GB      │ │
│ └──────────────────────────────────────────┘ └─────────────────────────────────────────────┘ │
│                                                                                              │
│ ┌──────────────────────────────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │ FILE SIZE DISTRIBUTION                   │ │ RECENTLY MODIFIED                           │ │
│ │                                          │ │                                             │ │
│ │ Under 1 MB       7,410 files             │ │ guide.pdf                  4 minutes ago    │ │
│ │ 1–10 MB          3,820 files             │ │ banner.png                 18 minutes ago   │ │
│ │ 10–100 MB        1,080 files             │ │ lesson-intro.mp4           1 hour ago       │ │
│ │ 100 MB–1 GB        156 files             │ │ archive.zip                3 hours ago      │ │
│ │ Above 1 GB           14 files            │ │                                    [View]   │ │
│ └──────────────────────────────────────────┘ └─────────────────────────────────────────────┘ │
│                                                                                              │
│ ┌──────────────────────────────────────────┐ ┌─────────────────────────────────────────────┐ │
│ │ SMALLEST FILES                          │ │ STORAGE ATTENTION                           │ │
│ │                                          │ │                                             │ │
│ │ note.txt                     24 bytes    │ │ Zero-byte files                         18 │ │
│ │ metadata.json                91 bytes    │ │ Unknown content type                    27 │ │
│ │ placeholder.svg             188 bytes   │ │ Files older than one year              142 │ │
│ │ empty files shown separately             │ │ Very large files above 1 GB             14 │ │
│ └──────────────────────────────────────────┘ └─────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 4. File Size Ranking Rules

### Biggest-to-smallest progress bar

The largest file is always the visual baseline.

```text
barPercentage = fileSize / largestFileSize × 100
```

Examples:

```text
Largest file: 2 GB  → 100% bar
Second file:  1 GB  →  50% bar
Third file: 500 MB  →  25% bar
```

Each row must show two different percentages:

1. **Relative bar percentage** — compares the file with the largest file.
2. **Percentage of total storage** — shows how much of the bucket the file consumes.

```text
percentageOfTotal = fileSize / totalStorageSize × 100
```

### Smallest-file rule

- The **Smallest file** card must use the smallest file whose size is greater than zero.
- Zero-byte objects must appear in their own card and attention list.
- Folder-marker objects ending in `/` must not be counted as normal files.

### Sorting options

```text
Largest first
Smallest first
Newest first
Oldest first
Name A–Z
Name Z–A
```

### File ranking row actions

Open the `...` menu for:

- Open using CDN
- Copy CDN URL
- View metadata
- Download using a temporary URL
- Locate in Files page

Delete and rename actions should stay on the Files page so Analytics remains focused on reporting.

---

## 5. Analytics Filters

### Search

- Search by file basename.
- Display the folder path under the filename.
- Debounce input before requesting new data.

### File type

```text
All types
Images
Videos
Audio
PDF
Documents
Archives
Text and code
Other
Unknown
```

### Folder

- All folders
- Root
- One top-level folder at a time

### Result limit

```text
Top 10
Top 25
Top 50
Top 100
```

### Refresh

- Display cached data immediately.
- Refresh in the background.
- Disable the button while recalculation is running.
- Show the exact `generatedAt` time.

---

## 6. Analytics Loading, Empty, and Error States

### Loading

```text
Summary cards: skeleton values
File ranking:  five skeleton rows
Breakdowns:    skeleton bars
```

### Empty bucket

```text
No files found
Upload files from the Files page to begin seeing storage analytics.

[Go to Files]
```

### No filter results

```text
No files match these filters.
[Clear filters]
```

### Refresh error with cached data

```text
Could not refresh analytics. Showing data calculated 12 minutes ago.
[Try again]
```

### Complete error

```text
Storage analytics are temporarily unavailable.
Request ID: safe-request-id
[Try again]
```

---

## 7. Backend Already Available

The current backend already supports the Files page through:

```text
GET    /api/super-admin/storage/objects
POST   /api/super-admin/storage/upload
DELETE /api/super-admin/storage/object
DELETE /api/super-admin/storage/objects
POST   /api/super-admin/storage/folder
POST   /api/super-admin/storage/presigned-url
GET    /api/super-admin/storage/metadata
POST   /api/super-admin/storage/rename
```

Existing object listing fields:

```text
key
name
size
lastModified
contentType
cdnUrl
```

Important limitation:

`GET /objects` returns `totalSize` only for files returned on the current page. It is not the total size of the complete bucket and must not be used as the Analytics total-storage value.

---

## 8. Analytics Backend Implemented

### A. Summary

```text
GET /api/super-admin/storage/analytics/summary
```

Suggested response:

```json
{
  "success": true,
  "message": "Storage analytics summary retrieved successfully.",
  "data": {
    "totalFiles": 12480,
    "totalFolders": 96,
    "totalSize": 90945907917,
    "averageFileSize": 7287332,
    "largestFile": {
      "key": "videos/training-video.mp4",
      "name": "training-video.mp4",
      "size": 1932735283,
      "contentType": "video/mp4",
      "lastModified": "2026-07-24T14:20:00.000Z",
      "cdnUrl": "https://cdn.classgrid.in/videos/training-video.mp4"
    },
    "smallestFile": {
      "key": "notes/note.txt",
      "name": "note.txt",
      "size": 24,
      "contentType": "text/plain",
      "lastModified": "2026-07-20T09:30:00.000Z",
      "cdnUrl": "https://cdn.classgrid.in/notes/note.txt"
    },
    "zeroByteFiles": 18,
    "unknownContentTypeFiles": 27,
    "filesAboveOneGb": 14,
    "filesOlderThanOneYear": 391,
    "generatedAt": "2026-07-24T16:10:00.000Z",
    "cacheAgeSeconds": 42
  }
}
```

### B. File ranking

```text
GET /api/super-admin/storage/analytics/files
```

Query parameters:

```text
sort=size_desc | size_asc | modified_desc | modified_asc | name_asc | name_desc
type=image | video | audio | pdf | document | archive | text | other | unknown
prefix=folder/path/
search=filename
nonZero=true | false
zeroOnly=true | false
rootOnly=true | false
refresh=true | false
limit=25
cursor=opaque-pagination-cursor
```

Suggested response:

```json
{
  "success": true,
  "message": "Storage file analytics retrieved successfully.",
  "data": {
    "files": [
      {
        "rank": 1,
        "key": "videos/training-video.mp4",
        "name": "training-video.mp4",
        "folder": "videos/",
        "size": 1932735283,
        "contentType": "video/mp4",
        "lastModified": "2026-07-24T14:20:00.000Z",
        "cdnUrl": "https://cdn.classgrid.in/videos/training-video.mp4",
        "relativeToLargestPercentage": 100,
        "percentageOfTotal": 2.13
      }
    ],
    "nextCursor": "opaque-cursor-or-null",
    "totalMatchingFiles": 12480,
    "largestFileSize": 1932735283,
    "totalStorageSize": 90945907917,
    "generatedAt": "2026-07-24T16:10:00.000Z"
  }
}
```

`nonZero=true` and `zeroOnly=true` are mutually exclusive. `rootOnly=true` returns only files
stored directly at the bucket root. Pagination cursors are bound to every active filter and
the analytics snapshot, so a cursor cannot be reused with different filters or refreshed data.

### C. Breakdowns

```text
GET /api/super-admin/storage/analytics/breakdown
```

Suggested response:

```json
{
  "success": true,
  "message": "Storage breakdown retrieved successfully.",
  "data": {
    "byType": [
      {
        "type": "video",
        "fileCount": 430,
        "size": 45526653337,
        "percentage": 50.06
      }
    ],
    "byFolder": [
      {
        "prefix": "videos/",
        "name": "videos",
        "fileCount": 390,
        "size": 40909515980,
        "percentage": 44.98
      }
    ],
    "bySizeRange": [
      {
        "range": "under_1_mb",
        "label": "Under 1 MB",
        "fileCount": 7410,
        "size": 2181038080
      }
    ],
    "recentFiles": [],
    "oldestFiles": [],
    "generatedAt": "2026-07-24T16:10:00.000Z"
  }
}
```

---

## 9. Analytics Calculation Requirements

The backend must:

1. Scan all S3 objects recursively, not only the root page.
2. Follow every S3 continuation token.
3. Exclude folder markers ending in `/` from file counts.
4. Count distinct folder prefixes separately.
5. Calculate the smallest non-zero file.
6. Count zero-byte files separately.
7. Sort files globally before returning biggest or smallest results.
8. Calculate file-type and folder-size totals.
9. Use bounded concurrency for metadata requests.
10. Cache calculated analytics for approximately five minutes.
11. Return a `generatedAt` timestamp.
12. Never store or return AWS credentials.

### Performance note

`ListObjectsV2` does not return `ContentType`. Accurate type analytics may require `HeadObject` requests. Use bounded concurrency and caching to avoid making hundreds or thousands of simultaneous S3 calls.

For very large buckets, move the scan to a background analytics refresh job and serve the last completed cached snapshot.

### Historical growth limitation

S3 provides the current objects and their last-modified times, but it does not directly provide historical deleted-storage totals.

A real 7-day, 30-day, or 90-day storage-growth chart requires periodic analytics snapshots. Do not show a fake growth chart until snapshot collection exists.

---

## 10. Responsive Behaviour

### Desktop

- Four summary cards per row where space allows.
- Two-column breakdown grid.
- Full file-ranking columns.

### Tablet

- Two summary cards per row.
- One breakdown panel per row.
- Hide less-important table columns behind the row-details action.

### Mobile

- One summary card per row.
- File ranking becomes stacked cards.
- Keep file name, size, progress bar, type, and folder visible.
- Filters open in a bottom sheet.

Mobile ranking example:

```text
┌────────────────────────────────────────┐
│ #1 training-video.mp4                  │
│ videos/                                │
│ 1.8 GB                     Video       │
│ ████████████████████████████ 100%      │
│ 2.13% of total storage              […]│
└────────────────────────────────────────┘
```

---

## 11. Accessibility

- Do not communicate connection status using colour alone.
- Progress bars require text percentages and accessible labels.
- Every Copy button must name what it copies.
- Tables and ranking lists must support keyboard navigation.
- Tooltips must also be available by keyboard focus.
- Use readable byte units: B, KB, MB, GB, and TB.
- Maintain sufficient contrast for muted labels and progress tracks.

---

## 12. Acceptance Checklist

### S3 Configuration

- [ ] Separate page from Files and Analytics.
- [ ] Connection status is visible.
- [ ] Endpoint, bucket, region, and CDN can be copied.
- [ ] Test Connection returns safe results.
- [ ] Upload and security limits are visible.
- [ ] Protected prefixes can be viewed.
- [ ] Credentials are only shown as Configured or Missing.
- [ ] No credential value is returned to the browser.
- [ ] No browser-based access-key creation exists.

### Storage Analytics

- [ ] Separate page from Files and S3 Configuration.
- [ ] Total storage scans the complete bucket.
- [ ] Total files excludes folder markers.
- [ ] Largest and smallest non-zero files are accurate.
- [ ] Zero-byte files are shown separately.
- [ ] Biggest-to-smallest progress bars use the largest file as 100%.
- [ ] Percentage of total storage is also displayed.
- [ ] Search, type, folder, sort, and result-limit filters work.
- [ ] Type, folder, and size-range breakdowns are available.
- [ ] Analytics have a generated timestamp.
- [ ] Cached data is clearly labelled.
- [ ] Empty, loading, stale-cache, and error states are implemented.
- [ ] Analytics endpoints remain Super Admin only.

---

## 13. Screenshot Follow-up

The supplied screenshots currently define the S3 Configuration direction.

When the Supabase Analytics screenshots are supplied, update this same file with:

- exact chart order;
- exact card hierarchy;
- chart or table choices;
- filter placement;
- spacing and density adjustments.

Do not create a second wireframe document for that refinement.
