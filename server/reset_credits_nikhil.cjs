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
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid';

async function main() {
    try {
        console.log("Connecting using direct shard URI...");
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB!");
        
        const db = mongoose.connection.db;
        
        const userRes = await db.collection('users').updateOne(
            { email: "nikhil.shinde@classgrid.in" },
            { 
                $set: { 
                    "ai_tokens.free_weekly_limit": 500000000, 
                    "ai_tokens.used_this_week": 0 
                } 
            }
        );
        console.log("Credits reset! Result:", userRes);
        
    } catch(err) {
        console.error("Failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

main();
