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

import axios from 'axios';
import "../../env.js";

const APP_ID = process.env.AGORA_APP_ID || "PLACEHOLDER_APP_ID";
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || "PLACEHOLDER_CERTIFICATE";
const CUSTOMER_ID = process.env.AGORA_CUSTOMER_ID || "";
const CUSTOMER_SECRET = process.env.AGORA_CUSTOMER_SECRET || "";

const credentials = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString('base64');
const AGORA_API_BASE = `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording`;

const axiosInstance = axios.create({
    headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
    }
});

/**
 * acquireResourceId
 * Step 1 of Cloud Recording
 */
export const acquireResourceId = async (channelName, uid) => {
    try {
        const response = await axiosInstance.post(`${AGORA_API_BASE}/acquire`, {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {
                resourceExpiredHour: 24
            }
        });
        return response.data.resourceId;
    } catch (err) {
        throw new Error(`Agora Acquire Error: ${err.response?.data?.message || err.message}`);
    }
};

/**
 * startRecording
 * Step 2 of Cloud Recording
 */
export const startRecording = async (resourceId, channelName, uid, token, storageConfig) => {
    try {
        const response = await axiosInstance.post(`${AGORA_API_BASE}/resourceid/${resourceId}/mode/mix/start`, {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {
                token: token,
                recordingConfig: {
                    maxIdleTime: 30,
                    streamTypes: 2,
                    audioProfile: 1,
                    channelType: 0,
                    videoStreamType: 0,
                    transcodingConfig: {
                        width: 1280,
                        height: 720,
                        fps: 15,
                        bitrate: 1130,
                        maxResolutionUid: "1",
                        mixedVideoLayout: 1
                    }
                },
                storageConfig: {
                    vendor: 1, // 1 for AWS S3
                    region: storageConfig.region || 0,
                    bucket: storageConfig.bucket,
                    accessKey: storageConfig.accessKey,
                    secretKey: storageConfig.secretKey,
                    fileNamePrefix: storageConfig.fileNamePrefix || []
                }
            }
        });
        return response.data; // { sid: '...', resourceId: '...' }
    } catch (err) {
        throw new Error(`Agora Start Error: ${err.response?.data?.message || err.message}`);
    }
};

/**
 * stopRecording
 * Step 3 of Cloud Recording
 */
export const stopRecording = async (resourceId, sid, channelName, uid) => {
    try {
        const response = await axiosInstance.post(`${AGORA_API_BASE}/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`, {
            cname: channelName,
            uid: uid.toString(),
            clientRequest: {}
        });
        return response.data;
    } catch (err) {
        throw new Error(`Agora Stop Error: ${err.response?.data?.message || err.message}`);
    }
};

/**
 * queryRecording
 */
export const queryRecording = async (resourceId, sid) => {
    try {
        const response = await axiosInstance.get(`${AGORA_API_BASE}/resourceid/${resourceId}/sid/${sid}/mode/mix/query`);
        return response.data;
    } catch (err) {
        throw new Error(`Agora Query Error: ${err.response?.data?.message || err.message}`);
    }
};
