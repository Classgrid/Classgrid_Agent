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

/**
 * compile_master_data.js
 * 
 * Used to convert raw text/CSV data of Indian States, Districts, Talukas, and Demographics
 * into highly optimized hierarchical JSON files for Supabase Buckets.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.join(__dirname, 'master_india_geography.csv');
const rawGeographyData = fs.existsSync(csvPath) ? fs.readFileSync(csvPath, 'utf8') : '';

const compileGeography = () => {
    const lines = rawGeographyData.trim().split('\n');
    const geoTree = {};

    lines.forEach(line => {
        if(line.includes("State,District,Taluka")) return; // skip header
        if(!line.trim()) return;

        const parts = line.split(',').map(s => s.trim());
        if(parts.length < 3) return;

        const [state, district, taluka] = parts;

        if (!geoTree[state]) geoTree[state] = {};
        if (!geoTree[state][district]) geoTree[state][district] = [];
        if (!geoTree[state][district].includes(taluka)) {
            geoTree[state][district].push(taluka);
        }
    });

    const outputPath = path.join(__dirname, 'classgrid_india_geography.json');
    fs.writeFileSync(outputPath, JSON.stringify(geoTree, null, 2));
    console.log(`✅ Compiled Geography Tree saved to ${outputPath}`);
    console.log("Next Step: Upload this file to your Supabase 'classgrid-assets' bucket!");
};

// Run compilers
compileGeography();
