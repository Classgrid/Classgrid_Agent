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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pincodes from 'indian-pincodes';

/**
 * auto_fetch_india.js
 * 
 * Automatically generates the entire geography of India (State -> District -> SubDistricts)
 * completely offline using the Indian Pincodes database. No internet or API needed!
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildGeography = () => {
    console.log("Starting full India Geographic compilation...");
    const allData = pincodes.getAllPincodes();
    const geoTree = {};

    allData.forEach(entry => {
        const state = entry.state;
        const district = entry.district;
        const subDistrict = entry.division || entry.name; // Division maps closely to Taluka/Suboffice

        if (!state || !district || !subDistrict) return;

        if (!geoTree[state]) geoTree[state] = {};
        if (!geoTree[state][district]) geoTree[state][district] = [];
        if (!geoTree[state][district].includes(subDistrict)) {
            geoTree[state][district].push(subDistrict);
        }
    });

    const outputPath = path.join(__dirname, 'classgrid_india_geography.json');
    fs.writeFileSync(outputPath, JSON.stringify(geoTree, null, 2));

    console.log(`✅ Compilation 100% complete!`);
    console.log(`✅ Output saved to: ${outputPath}`);
    console.log(`Next Action: Upload classgrid_india_geography.json to Supabase!`);
};

buildGeography();
