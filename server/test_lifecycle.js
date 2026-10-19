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
import mongoose from 'mongoose';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_BASE = 'http://localhost:5000';
let adminEmail = `test_admin_${Date.now()}@example.com`;
let orgName = `Test Org ${Date.now()}`;
let provisionalToken = null;
let orgId = null;

async function runTests() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect(process.env.MONGO_URI);
        const User = mongoose.connection.collection('users');
        const Organization = mongoose.connection.collection('organizations');
        const DemoRequest = mongoose.connection.collection('demorequests');

        // Verify initial state
        let user = await User.findOne({ email: adminEmail });
        if (user) throw new Error("User should not exist before test starts.");

        console.log("== 1. PROVISIONING ==");
        // The provision endpoint is /api/superadmin/orgs but we can simulate it directly in DB or by API
        // For E2E, we'll insert the Organization manually as SuperAdmin does to simulate the exact state before the link is clicked
        const orgRes = await Organization.insertOne({
            name: orgName,
            status: 'pending',
            pending_admin: {
                name: 'Test Admin',
                email: adminEmail,
                phone: '1234567890',
                activationToken: 'test_token',
                activationTokenExpires: new Date(Date.now() + 1000000)
            },
            onboarding_progress: { current_stage: 'not_started' }
        });
        orgId = orgRes.insertedId;
        
        console.log(`Created pending org: ${orgId}`);

        // Verify User STILL DOES NOT EXIST
        user = await User.findOne({ email: adminEmail });
        if (user) throw new Error("GHOST USER CREATED DURING PROVISIONING!");
        console.log("✅ Check 1 Passed: No User created after provisioning.");

        console.log("== 2. PARTIAL/FAILED ONBOARDING SUBMISSION ==");
        const failedPayload = {
            token: 'test_token',
            password: 'short', // Invalid password
            email: adminEmail
        };
        const failedRes = await fetch(`${API_BASE}/api/auth/activate-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(failedPayload)
        });
        
        if (failedRes.status === 200) throw new Error("Submission should have failed due to weak password.");
        
        user = await User.findOne({ email: adminEmail });
        if (user) throw new Error("GHOST USER CREATED ON FAILED SUBMISSION!");
        console.log("✅ Check 2 Passed: No User created after failed submission.");

        console.log("== 3. SUCCESSFUL FINAL SUBMISSION ==");
        const successPayload = {
            token: 'test_token',
            password: 'StrongPassword123!',
            email: adminEmail,
            orgDetails: { name: orgName, city: 'Test City', type: 'School' },
            orgEmail: adminEmail,
            orgPhone: '1234567890',
            personalDetails: { designation: 'Principal' }
        };
        const successRes = await fetch(`${API_BASE}/api/auth/activate-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(successPayload)
        });
        
        const successBody = await successRes.json();
        if (successRes.status !== 200) {
            console.error(successBody);
            throw new Error(`Successful submission failed with status ${successRes.status}`);
        }
        
        if (!successBody.provisional) throw new Error("Response was not provisional!");
        provisionalToken = successBody.token;

        user = await User.findOne({ email: adminEmail });
        if (user) throw new Error("GHOST USER CREATED ON SUCCESSFUL SUBMISSION BEFORE FINALIZATION!");
        
        const orgCheck = await Organization.findOne({ _id: orgId });
        if (orgCheck.onboarding_progress.current_stage !== "dashboard_entry_pending") {
            throw new Error("Organization stage was not updated to dashboard_entry_pending!");
        }
        console.log("✅ Check 3 Passed: Submission successful, NO User created, state updated correctly.");

        console.log("== 4. FIRST DASHBOARD ENTRY (FINALIZATION) ==");
        const finalizeRes = await fetch(`${API_BASE}/api/auth/finalize-onboarding`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: provisionalToken })
        });

        const finalizeBody = await finalizeRes.json();
        if (finalizeRes.status !== 200) {
            console.error(finalizeBody);
            throw new Error(`Finalization failed with status ${finalizeRes.status}`);
        }

        user = await User.findOne({ email: adminEmail });
        if (!user) throw new Error("REAL USER WAS NOT CREATED AFTER FINALIZATION!");
        
        const orgFinal = await Organization.findOne({ _id: orgId });
        if (orgFinal.owner_id?.toString() !== user._id.toString()) {
            throw new Error("Owner ID was not linked correctly!");
        }
        if (orgFinal.onboardingCompleted !== true) {
            throw new Error("Organization not marked as active!");
        }
        console.log("✅ Check 4 Passed: Real User created successfully, Organization linked and activated.");

        console.log("== 5. IDEMPOTENCY / RETRY ==");
        const retryRes = await fetch(`${API_BASE}/api/auth/finalize-onboarding`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: provisionalToken })
        });
        
        if (retryRes.status !== 200) {
            const rb = await retryRes.json();
            console.error(rb);
            throw new Error("Idempotency failed. Should return 200 for already active accounts.");
        }
        const userCount = await User.countDocuments({ email: adminEmail });
        if (userCount !== 1) throw new Error("Duplicate accounts were created!");
        
        console.log("✅ Check 5 Passed: Idempotency confirmed. No duplicates created.");
        
        console.log("\n🎉 ALL LIFECYCLE TESTS PASSED SUCCESSFULLY! 🎉");

    } catch (err) {
        console.error("❌ TEST FAILED:", err.message);
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
