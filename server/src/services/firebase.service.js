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

// ══════════════════════════════════════════════════════════════
//  FIREBASE ADMIN SDK SERVICE
//  Handles server-side push notification delivery via FCM
// ══════════════════════════════════════════════════════════════

import admin from "firebase-admin";

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK.
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON env var containing
 * the stringified service account JSON from Firebase Console.
 *
 * Get it from: Firebase Console → Project Settings → Service Accounts
 *              → "Generate new private key"
 */
function getFirebaseAdmin() {
  if (firebaseApp) return firebaseApp;

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountJson) {
      console.warn("⚠️  FIREBASE_SERVICE_ACCOUNT_JSON not set — push notifications disabled.");
      return null;
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log("✅ Firebase Admin SDK initialized");
    return firebaseApp;
  } catch (err) {
    console.error("❌ Firebase Admin init failed:", err.message);
    return null;
  }
}

/**
 * Send a push notification to a single device.
 *
 * @param {string} fcmToken - The device's FCM registration token
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} data - Optional data payload (deepLink, type, etc.)
 * @returns {Promise<string|null>} Message ID on success, null on failure
 */
export async function sendPushToDevice(fcmToken, title, body, data = {}) {
  const app = getFirebaseAdmin();
  if (!app) return null;

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: {
        ...data,
        title,     // Also include in data payload for background handling
        body,
        timestamp: Date.now().toString(),
      },
      android: {
        priority: "high",
        notification: {
          channelId: "classgrid_notifications",
          sound: "default",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`📨 Push sent: ${title} → ${fcmToken.slice(0, 20)}...`);
    return response;
  } catch (err) {
    // If token is invalid/expired, caller should remove it from DB
    if (
      err.code === "messaging/invalid-registration-token" ||
      err.code === "messaging/registration-token-not-registered"
    ) {
      console.warn(`⚠️  Invalid FCM token (should be removed): ${fcmToken.slice(0, 20)}...`);
      return "INVALID_TOKEN";
    }
    console.error("❌ Push send failed:", err.message);
    return null;
  }
}

/**
 * Send push notification to multiple devices at once.
 *
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body text
 * @param {object} data - Optional data payload
 * @returns {Promise<{success: number, failure: number, invalidTokens: string[]}>}
 */
export async function sendPushToMultiple(fcmTokens, title, body, data = {}) {
  const app = getFirebaseAdmin();
  if (!app || fcmTokens.length === 0) {
    return { success: 0, failure: 0, invalidTokens: [] };
  }

  try {
    const message = {
      notification: { title, body },
      data: {
        ...data,
        title,
        body,
        timestamp: Date.now().toString(),
      },
      android: {
        priority: "high",
        notification: {
          // If it's a call, map to a dedicated calling channel with a loud repeating sound
          channelId: data.isCall ? "classgrid_calls" : "classgrid_notifications",
          sound: data.isCall ? "ringtone" : "default",
          defaultSound: !data.isCall,
          defaultVibrateTimings: !data.isCall
        },
      },
      apns: {
         payload: {
             aps: {
                 sound: data.isCall ? "ringtone.wav" : "default"
             }
         }
      }
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens: fcmTokens,
      ...message,
    });

    const invalidTokens = [];
    response.responses.forEach((resp, idx) => {
      if (
        !resp.success &&
        resp.error &&
        (resp.error.code === "messaging/invalid-registration-token" ||
          resp.error.code === "messaging/registration-token-not-registered")
      ) {
        invalidTokens.push(fcmTokens[idx]);
      }
    });

    console.log(`📨 Multicast: ${response.successCount} sent, ${response.failureCount} failed`);

    return {
      success: response.successCount,
      failure: response.failureCount,
      invalidTokens,
    };
  } catch (err) {
    console.error("❌ Multicast push failed:", err.message);
    return { success: 0, failure: fcmTokens.length, invalidTokens: [] };
  }
}

export default { sendPushToDevice, sendPushToMultiple, getFirebaseAdmin };
