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
import { S3Client, PutBucketLifecycleConfigurationCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config({ path: 'server/.env' });

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'classgrid-storage';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey }
});

async function setLifecycle() {
  try {
    const command = new PutBucketLifecycleConfigurationCommand({
      Bucket: R2_BUCKET_NAME,
      LifecycleConfiguration: {
        Rules: [{
          ID: 'DeleteAITempCacheAfter1Day',
          Filter: { Prefix: 'ai-temp-cache/' },
          Status: 'Enabled',
          Expiration: { Days: 1 }
        }]
      }
    });
    await s3.send(command);
    console.log('✅ Successfully applied 1-day deletion lifecycle rule to R2 bucket: ' + R2_BUCKET_NAME);
  } catch (err) {
    console.error('❌ Error applying lifecycle rule:', err);
  }
}
setLifecycle();
