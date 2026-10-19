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
const puppeteer = require("puppeteer");

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on("pageerror", (err) => {
        console.error("PAGE ERROR:", err.toString());
    });
    
    page.on("console", (msg) => {
        if (msg.type() === "error") {
            console.error("CONSOLE ERROR:", msg.text());
        }
    });

    console.log("Navigating to http://localhost:4173/dept/admissions/enroll");
    await page.goto("http://localhost:4173/dept/admissions/enroll", { waitUntil: "networkidle0" });
    
    console.log("Wait for 2 seconds...");
    await new Promise(r => setTimeout(r, 2000));
    
    await browser.close();
})();
