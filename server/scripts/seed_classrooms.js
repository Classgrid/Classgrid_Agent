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
import Classroom from "../src/models/Classroom.js";

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const teachers = await User.find({ role: "teacher" }).lean();
    console.log(`Found ${teachers.length} teachers`);

    const subjectNames = {
        science: "Engineering science",
        physics: "Engineering Physics",
        mathematics: "Engineering Mathematics",
        cpp: "C++ Programming",
    };

    for (const teacher of teachers) {
        console.log(`\nProcessing: ${teacher.name} (${teacher.subject})`);

        if (!teacher.subject) {
            console.log("  SKIP: No subject assigned");
            continue;
        }

        // Check existing
        const existing = await Classroom.findOne({
            teacher: teacher._id,
            subject: teacher.subject,
        });

        if (existing) {
            console.log(`  SKIP: Already has classroom "${existing.name}" (${existing.classCode})`);
            continue;
        }

        try {
            const classroom = await Classroom.create({
                name: subjectNames[teacher.subject] || teacher.subject,
                description: `Official classroom for ${subjectNames[teacher.subject] || teacher.subject}`,
                subject: teacher.subject,
                subjectSlug: teacher.subject,
                teacher: teacher._id,
            });
            console.log(`  CREATED: "${classroom.name}" Code: ${classroom.classCode}`);
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
            if (err.code === 11000) {
                console.log(`  Duplicate key details:`, JSON.stringify(err.keyValue));
            }
        }
    }

    console.log("\nDone!");
    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
