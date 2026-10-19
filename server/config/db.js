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
import mongoose from "mongoose";

// Global cache for serverless environments (like Vercel)
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Pool sizing strategy for PM2 cluster mode:
 * ─────────────────────────────────────────────
 * MongoDB Atlas M10 supports ~500 connections.
 * PM2 cluster with N workers = N separate connection pools.
 *
 * Formula: maxPoolSize = floor(maxConnections / numWorkers) - buffer
 *
 * Staging  (t3.micro,  2 workers): maxPoolSize = 10, minPoolSize = 2
 * Production (t3.medium, 4 workers): maxPoolSize = 20, minPoolSize = 4
 * Development (fork, 1 worker):    maxPoolSize = 20, minPoolSize = 4
 */
const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";

const POOL_CONFIG = isStaging
  ? { maxPoolSize: 10, minPoolSize: 2 }
  : { maxPoolSize: 20, minPoolSize: 4 };

const connectDB = async () => {
  // ✅ KEY FIX: Always check if the connection is still alive.
  // readyState 1 = connected. Without this check, cached.conn stays set
  // after a timeout, every route skips reconnection, and all APIs return 500.
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // If connection dropped, clear the cache and reconnect
  if (cached.conn && mongoose.connection.readyState !== 1) {
    console.warn("⚠️ MongoDB connection stale (readyState=" + mongoose.connection.readyState + "). Reconnecting...");
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
      maxPoolSize: POOL_CONFIG.maxPoolSize,
      minPoolSize: POOL_CONFIG.minPoolSize,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      // Heartbeat keeps the connection alive through Atlas's idle timeout
      heartbeatFrequencyMS: 10000,
      // Compressor for reduced bandwidth in production
      ...(isProduction || isStaging ? { compressors: ["zlib"] } : {}),
    };

    console.log(`=> Initializing MongoDB connection (pool: ${opts.minPoolSize}-${opts.maxPoolSize}, env: ${process.env.NODE_ENV || "dev"})...`);
    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongoose) => {
      console.log("✅ MongoDB connected");
      return mongoose;
    }).catch((error) => {
      console.error("❌ MongoDB connection failed:", error.message);
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    console.error("Error awaiting MongoDB connection:", error.message);
    throw error;
  }
};

export default connectDB;
