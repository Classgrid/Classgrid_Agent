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
import dotenv from "dotenv";
import User from "./src/models/User.js";
import { primarySupabaseClient as sb } from "./src/config/supabaseClient.js";

dotenv.config();

async function testGroup() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB.");

        // We will simulate Neha Sharma creating a group
        const creator = await User.findOne({ email: "sunitasubhashsun123@gmail.com" }).lean();
        const member = await User.findOne({ email: "quantumchem25@gmail.com" }).lean();

        if (!creator || !member) {
            console.error("Users not found");
            process.exit(1);
        }

        console.log("Creator ID:", creator._id.toString());
        console.log("Member ID:", member._id.toString());
        console.log("Org ID:", creator.organization_id.toString());

        const insertPayload = {
            name: "Test Group",
            description: "Testing group creation",
            created_by: creator._id.toString(),
            org_id: creator.organization_id.toString(),
            group_type: 'general',
            is_private: true,
            require_join_approval: false,
            send_message_policy: 'all',
            admin_roles: [],
            message_ttl: 0,
            is_official: false,
            edit_info_policy: 'admin_only',
            add_member_policy: 'admin_only',
            create_poll_policy: 'all',
            send_attachments_policy: 'all',
            auto_add_roles: []
        };

        console.log("Inserting into chat_groups...", insertPayload);

        const { data: group, error: groupErr } = await sb
            .from('chat_groups')
            .insert([insertPayload])
            .select()
            .single();

        if (groupErr) {
            console.error("SUPABASE ERROR:", groupErr);
        } else {
            console.log("SUCCESS! Group created:", group);
            
            // Clean up
            await sb.from('chat_groups').delete().eq('id', group.id);
            console.log("Test group deleted.");
        }

        mongoose.disconnect();
    } catch (err) {
        console.error("CRITICAL ERROR:", err);
        mongoose.disconnect();
    }
}

testGroup();
