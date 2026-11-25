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
import AiLibraryFile from '../models/AiLibraryFile.js';
import UserStorageQuota from '../models/UserStorageQuota.js';
import { libraryStorageFor } from '../services/plan-limits.service.js';
import { uploadBufferToR2, deleteFromR2 } from '../config/r2Client.js';
import { AI_FILES_BUCKET, deleteFromS3 } from '../config/s3Client.js';
import { aiMadeFileKey } from '../utils/library-file-key.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getIO } from '../services/socket.service.js';

function getFileType(mimeType) {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'pptx';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
  return 'other';
}

export const uploadToLibrary = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const userId = req.user._id;
    const userEmail = req.user.email;
    const organizationId = req.user.organization_id;
    const fileSizeBytes = file.size;

    // Plans on: the plan's upload limits (largest file, files per session window, Library storage)
    const { checkUploadAllowed } = await import('../services/plan-limits.service.js');
    const uploadCheck = await checkUploadAllowed(req.user, fileSizeBytes).catch(() => ({ ok: true }));
    if (!uploadCheck.ok) {
      return res.status(uploadCheck.status).json({ error: uploadCheck.error, code: uploadCheck.code, plan: uploadCheck.plan });
    }

    // The Library's room is the user's plan (not a fixed 600 MB for everyone: owner, 2026-11-19)
    const storage = await libraryStorageFor(req.user);
    if (!storage.unlimited && storage.used_bytes + fileSizeBytes > storage.max_bytes) {
      return res.status(400).json({
        error: 'quota_exceeded',
        used: storage.used_bytes,
        max: storage.max_bytes
      });
    }
    // (the old per-user counter is still kept up to date for anything that reads it)
    let quota = await UserStorageQuota.findOne({ user_id: userId });
    if (!quota) {
      quota = new UserStorageQuota({ user_id: userId, user_email: userEmail });
    }

    const fileType = getFileType(file.mimetype);
    const ext = path.extname(file.originalname);
    const customKey = `ai-library/${userId}/${uuidv4()}${ext}`;

    const publicUrl = await uploadBufferToR2(file.buffer, file.originalname, file.mimetype, customKey);

    const libraryFile = new AiLibraryFile({
      user_email: userEmail,
      user_id: userId,
      organization_id: organizationId,
      original_name: file.originalname,
      file_key: customKey,
      cdn_url: publicUrl,
      mime_type: file.mimetype,
      file_type: fileType,
      size_bytes: fileSizeBytes,
      source: 'uploaded'
    });

    await libraryFile.save();

    quota.used_bytes += fileSizeBytes;
    quota.updated_at = new Date();
    await quota.save();

    try {
      getIO().to(userId.toString()).emit("ai_library_updated");
    } catch (err) {
      console.error("Failed to emit socket event:", err);
    }

    return res.status(201).json({ file: libraryFile, quota: await libraryStorageFor(req.user) });
  } catch (error) {
    console.error('Error in uploadToLibrary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// The Trash (AI-generated files only, see the model): kept 30 days, then deleted for good. Cleared whenever the Library
// is listed, so nothing older than that is ever shown or restored.
const TRASH_DAYS = 30;
const inTrash = { source: 'generated', deleted_at: { $ne: null } };

// A file the AI made has its own object on the CDN bucket (utils/library-file-key.js): deleting the file for good
// deletes that object too, as deleting an uploaded file deletes its R2 object. Until 2026-11-25 only the record went
// and the object stayed on the CDN for ever. A failure is logged and the rest go on.
// Called after the files' records are deleted: an object goes only when no Library record is left that points to it
// (a record of the same object in another account, or a second one in this account, keeps it).
async function deleteAiMadeObjects(files) {
  for (const file of files) {
    const key = aiMadeFileKey(file);
    if (!key) continue;
    try {
      const stillKept = await AiLibraryFile.find({ file_key: key }).select('_id').lean();
      if (stillKept.length) continue;
      await deleteFromS3(key, AI_FILES_BUCKET);
    } catch (err) {
      console.error('Error deleting from S3:', err);
    }
  }
}

// Deletes the Trash files matching `filter` for good: the records, then the objects of the ones that are really gone
// (a file restored in the same moment keeps its record, so it keeps its object; when the records cannot be read
// back, no object is deleted). Resolves how many records went; the objects are deleted afterwards, without the
// request waiting for them.
async function deleteTrashed(filter) {
  const rows = await AiLibraryFile.find(filter).select('file_key source').lean();
  if (!rows.length) return 0;
  const ids = rows.map((r) => r._id);
  const { deletedCount } = await AiLibraryFile.deleteMany({ ...filter, _id: { $in: ids } });
  AiLibraryFile.find({ _id: { $in: ids } }).select('_id').lean()
    .then((left) => {
      const stillThere = new Set(left.map((r) => String(r._id)));
      return deleteAiMadeObjects(rows.filter((r) => !stillThere.has(String(r._id))));
    })
    .catch((err) => console.error('Error deleting Trash files from S3:', err));
  return deletedCount || 0;
}

async function purgeOldTrash(userId) {
  const before = new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000);
  await deleteTrashed({ user_id: userId, ...inTrash, deleted_at: { $ne: null, $lt: before } }).catch(() => {});
}
const libraryChanged = (userId) => {
  try { getIO().to(userId.toString()).emit("ai_library_updated"); } catch (err) { console.error("Failed to emit socket event:", err); }
};

export const getLibrary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, sort } = req.query;
    await purgeOldTrash(userId);

    // ?trash=1: the files in the Trash; otherwise the files not in it
    let query = req.query.trash === '1' ? { user_id: userId, ...inTrash } : { user_id: userId, deleted_at: null };
    if (type && type !== 'all') {
      query.file_type = type;
    }

    let sortQuery = { created_at: -1 }; // newest by default
    if (sort === 'oldest') sortQuery = { created_at: 1 };
    else if (sort === 'largest') sortQuery = { size_bytes: -1 };
    else if (sort === 'smallest') sortQuery = { size_bytes: 1 };

    const [files, quota] = await Promise.all([
      AiLibraryFile.find(query).sort(sortQuery),
      libraryStorageFor(req.user),
    ]);

    return res.status(200).json({ files, quota });
  } catch (error) {
    console.error('Error in getLibrary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteFromLibrary = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const file = await AiLibraryFile.findOne({ _id: id, user_id: userId });
    if (!file) return res.status(404).json({ error: 'File not found' });

    // An AI-generated file goes to the Trash first (restorable for 30 days); deleting it from the Trash, or deleting a
    // file the user uploaded, deletes it for good
    if (file.source === 'generated' && !file.deleted_at) {
      file.deleted_at = new Date();
      await file.save();
      libraryChanged(userId);
      return res.status(200).json({ success: true, trashed: true, quota: await libraryStorageFor(req.user) });
    }

    if (file.file_key && file.source === 'uploaded') {
      try {
        await deleteFromR2(file.file_key);
      } catch (err) {
        console.error('Error deleting from R2:', err);
      }
    }
    await AiLibraryFile.deleteOne({ _id: id });
    // (a file in the Trash deleted for good: the AI-made file's own object on the CDN bucket goes too, once its
    // record is gone)
    await deleteAiMadeObjects([file]);

    let quota = await UserStorageQuota.findOne({ user_id: userId });
    if (quota) {
      quota.used_bytes = Math.max(0, quota.used_bytes - (file.size_bytes || 0));
      quota.updated_at = new Date();
      await quota.save();
    }

    try {
      getIO().to(userId.toString()).emit("ai_library_updated");
    } catch (err) {
      console.error("Failed to emit socket event:", err);
    }

    return res.status(200).json({ success: true, quota: await libraryStorageFor(req.user) });
  } catch (error) {
    console.error('Error in deleteFromLibrary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/ai/library/:id/restore: a file in the Trash goes back to the Library
export const restoreFromTrash = async (req, res) => {
  try {
    const userId = req.user._id;
    const file = await AiLibraryFile.findOneAndUpdate({ _id: req.params.id, user_id: userId, ...inTrash }, { $set: { deleted_at: null } }, { new: true });
    if (!file) return res.status(404).json({ error: 'This file is no longer in the Trash' });
    libraryChanged(userId);
    return res.status(200).json({ success: true, file, quota: await libraryStorageFor(req.user) });
  } catch (error) {
    console.error('Error in restoreFromTrash:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/ai/library/trash: every file in the Trash is deleted for good
export const emptyTrash = async (req, res) => {
  try {
    const userId = req.user._id;
    const deletedCount = await deleteTrashed({ user_id: userId, ...inTrash });
    libraryChanged(userId);
    return res.status(200).json({ success: true, deleted: deletedCount || 0, quota: await libraryStorageFor(req.user) });
  } catch (error) {
    console.error('Error in emptyTrash:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuota = async (req, res) => {
  try {
    const userId = req.user._id;
    return res.status(200).json(await libraryStorageFor(req.user));
  } catch (error) {
    console.error('Error in getQuota:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
