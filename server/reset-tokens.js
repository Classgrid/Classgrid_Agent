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
import dotenv from 'dotenv';
import path from 'path';

// Load the exact .env file from the server folder
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const resetTokens = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB!");

        // Import the User model properly
        const User = (await import('./src/models/User.js')).default;

        console.log("Resetting all used_this_week AI tokens back to 0...");
        
        // Update all users to have 0 tokens used
        const result = await User.updateMany(
            {}, 
            { $set: { "ai_tokens.used_this_week": 0 } }
        );

        console.log(`Successfully reset tokens for ${result.modifiedCount} users! You now have 1 Lakh tokens available again.`);
        process.exit(0);
    } catch (err) {
        console.error("Error resetting tokens:", err);
        process.exit(1);
    }
};

resetTokens();
