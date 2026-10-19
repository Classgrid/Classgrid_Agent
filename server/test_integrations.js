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
import 'dotenv/config';

async function testIntegrations() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const user = await mongoose.models.User.findOne({ 
        $or: [
            { slack_access_token: { $exists: true, $ne: null } },
            { github_access_token: { $exists: true, $ne: null } }
        ]
    });
    if (!user) {
        console.log("No user found with slack or github tokens.");
        process.exit(1);
    }

    console.log("Found user:", user.email);

    if (user.slack_access_token) {
        console.log("\n--- Testing Slack ---");
        const res = await fetch(`https://slack.com/api/auth.test`, {
            headers: { "Authorization": `Bearer ${user.slack_access_token}` }
        });
        const data = await res.json();
        console.log("Slack Auth Test:", data);
        if (data.ok) {
            console.log("✅ Slack Token is VALID and has scopes!");
        } else {
            console.log("❌ Slack Token Error:", data.error);
        }
    } else {
        console.log("\n❌ No Slack token found in database. You MUST click 'Connect' in the UI first!");
    }

    if (user.github_access_token) {
        console.log("\n--- Testing GitHub ---");
        const res = await fetch(`https://api.github.com/user`, {
            headers: { 
                "Authorization": `Bearer ${user.github_access_token}`,
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        const data = await res.json();
        if (data.login) {
            console.log(`✅ GitHub Token is VALID! Connected as: ${data.login}`);
            console.log("Scopes:", res.headers.get('x-oauth-scopes'));
        } else {
            console.log("❌ GitHub Token Error:", data);
        }
    } else {
        console.log("\n❌ No GitHub token found in database. You MUST click 'Connect' in the UI first!");
    }

    process.exit(0);
}

// We need the User model registered
const userSchema = new mongoose.Schema({}, { strict: false });
mongoose.model('User', userSchema);

testIntegrations();
