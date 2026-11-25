// Where a Library file's own object is kept (models/AiLibraryFile.js `file_key`), so a delete goes to the right
// storage. A file the person uploaded is in R2. A file the AI made and uploaded is on the CDN bucket (AWS S3), always
// under "ai-generated/" (ai-chat.controller.js upload_file_to_cdn and upload_sandbox_file_to_cdn,
// services/video-render.service.js uploadToCdn). A link found in an answer is saved with no key: nothing of its own
// to delete.

/** The CDN bucket key of a Library file the AI made, or null (an uploaded file, or a file with no key). */
export const aiMadeFileKey = (file) => (
    // (a ".." part is refused; a name with two dots in it, "notes..final.pdf", is a name like any other)
    file?.source === "generated" && typeof file.file_key === "string" && file.file_key.startsWith("ai-generated/") && !file.file_key.split("/").includes("..")
        ? file.file_key
        : null
);
