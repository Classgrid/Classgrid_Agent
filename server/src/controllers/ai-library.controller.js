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
import { uploadBufferToR2, deleteFromR2 } from '../config/r2Client.js';
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

    let quota = await UserStorageQuota.findOne({ user_id: userId });
    if (!quota) {
      quota = new UserStorageQuota({ user_id: userId, user_email: userEmail });
    }

    if (quota.used_bytes + fileSizeBytes > quota.max_bytes) {
      return res.status(400).json({ 
        error: 'quota_exceeded', 
        used: quota.used_bytes, 
        max: quota.max_bytes 
      });
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

    return res.status(201).json({ file: libraryFile, quota });
  } catch (error) {
    console.error('Error in uploadToLibrary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLibrary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type, sort } = req.query;

    let query = { user_id: userId };
    if (type && type !== 'all') {
      query.file_type = type;
    }

    let sortQuery = { created_at: -1 }; // newest by default
    if (sort === 'oldest') sortQuery = { created_at: 1 };
    else if (sort === 'largest') sortQuery = { size_bytes: -1 };
    else if (sort === 'smallest') sortQuery = { size_bytes: 1 };

    const files = await AiLibraryFile.find(query).sort(sortQuery);

    let quota = await UserStorageQuota.findOne({ user_id: userId });
    if (!quota) {
      quota = new UserStorageQuota({ user_id: userId, user_email: req.user.email });
      await quota.save();
    }

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

    if (file.file_key && file.source === 'uploaded') {
      try {
        await deleteFromR2(file.file_key);
      } catch (err) {
        console.error('Error deleting from R2:', err);
      }
    }

    await AiLibraryFile.deleteOne({ _id: id });

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

    return res.status(200).json({ success: true, quota });
  } catch (error) {
    console.error('Error in deleteFromLibrary:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getQuota = async (req, res) => {
  try {
    const userId = req.user._id;
    let quota = await UserStorageQuota.findOne({ user_id: userId });
    if (!quota) {
      quota = new UserStorageQuota({ user_id: userId, user_email: req.user.email });
      await quota.save();
    }

    const percentage = Math.min(100, (quota.used_bytes / quota.max_bytes) * 100);

    return res.status(200).json({
      used_bytes: quota.used_bytes,
      max_bytes: quota.max_bytes,
      percentage
    });
  } catch (error) {
    console.error('Error in getQuota:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
