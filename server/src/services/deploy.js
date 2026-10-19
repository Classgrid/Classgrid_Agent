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
import Artifact from '../models/Artifact.js';
import Trajectory from '../models/Trajectory.js';
import { r2Client } from '../config/r2Client.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'classgrid-storage';

/**
 * Phase 6: Deploy to R2
 * Reads all saved artifacts for a session and uploads them to Cloudflare R2.
 * Returns the public URL where the site is live.
 */
export async function deployToR2(sessionId, projectName) {
  console.log(`[Deploy] Starting deployment for session ${sessionId} → ${projectName}`);

  const artifacts = await Artifact.find({ sessionId });

  if (!artifacts || artifacts.length === 0) {
    throw new Error(`No artifacts found for session ${sessionId}. Cannot deploy.`);
  }

  const mimeMap = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'svg': 'image/svg+xml',
    'png': 'image/png',
    'jpg': 'image/jpeg',
  };

  const uploadedFiles = [];

  for (const artifact of artifacts) {
    // Determine file extension from stepId
    const ext = artifact.stepId.includes('.') 
      ? artifact.stepId.split('.').pop() 
      : artifact.stepId; // e.g. "html", "css", "js"
    
    const fileName = artifact.stepId.includes('.') 
      ? artifact.stepId 
      : `index.${ext}`;

    const key = `websites/${projectName}/${fileName}`;
    const contentType = mimeMap[ext] || 'text/plain';

    console.log(`[Deploy] Uploading ${key} (${contentType})`);

    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: artifact.content,
      ContentType: contentType,
    }));

    uploadedFiles.push(key);
  }

  const siteUrl = `https://${projectName}.sites.classgrid.in`;
  console.log(`[Deploy] Deployment complete! ${uploadedFiles.length} files uploaded. Site: ${siteUrl}`);

  // Update the trajectory with the deployed URL
  await Trajectory.findOneAndUpdate(
    { sessionId },
    { $set: { deployedUrl: siteUrl } }
  );

  return siteUrl;
}
