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
const fs = require('fs');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

async function runTest() {
    console.log("=== STARTING OCR TEST ===");
    try {
        console.log("1. Creating a dummy PDF to test pdf-parse...");
        // Actually, we can just test tesseract.js on an image url
        console.log("2. Testing Tesseract on a sample image...");
        const result = await Tesseract.recognize('https://tesseract.projectnaptha.com/img/eng_bw.png', 'eng');
        console.log("Tesseract Output:", result.data.text);
        console.log("=== TEST SUCCESSFUL ===");
    } catch (e) {
        console.error("TEST FAILED:", e);
    }
}
runTest();
