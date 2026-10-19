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

import "../env.js";
import mongoose from "mongoose";
import User from "../src/models/User.js";

const MONGO_URI = process.env.MONGO_URI;

async function fix() {
    try {
        console.log("🔌 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected.");

        console.log("🗑️  Dropping indexes on ALL collections...");

        const collections = mongoose.connection.collections;
        // Wait for connection to be established and collections to be ready? 
        // We might need to list collections first?
        // Actually, listing collections is safer.
        const cols = await mongoose.connection.db.listCollections().toArray();
        delete mongoose.connection.models;

        for (const c of cols) {
            if (c.name === 'system.indexes') continue;
            try {
                await mongoose.connection.db.collection(c.name).dropIndexes();
                console.log(`   - Dropped indexes for '${c.name}'`);
            } catch (e) {
                if (e.code === 26) {
                    console.log(`   - '${c.name}' check skipped (Namespace not found)`);
                } else {
                    console.log(`   - Error on '${c.name}': ${e.message}`);
                }
            }
        }

        console.log("✅ Indexes dropped successfully.");
        console.log("🎉 You can now restart your server (npm start). Mongoose will rebuild indexes correctly.");

    } catch (err) {
        console.error("❌ Error dropping indexes:", err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

fix();
