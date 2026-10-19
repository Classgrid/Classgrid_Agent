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
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection('supporttickets');

    // First check what's there
    const allTickets = await collection.find({}).toArray();
    console.log(`Found ${allTickets.length} total tickets\n`);

    for (const ticket of allTickets) {
      if (!ticket.messages?.length) continue;
      let needsUpdate = false;

      for (const msg of ticket.messages) {
        if (msg.role === 'user' && msg.avatar && msg.avatar !== '') {
          console.log(`STILL HAS AVATAR -> Ticket: "${ticket.subject}"`);
          console.log(`  Author: ${msg.author}, Avatar: ${msg.avatar.substring(0, 60)}...`);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        // Directly update using native driver - no Mongoose validation
        const updatedMessages = ticket.messages.map(msg => {
          if (msg.role === 'user') {
            return { ...msg, avatar: '' };
          }
          return msg;
        });

        await collection.updateOne(
          { _id: ticket._id },
          { $set: { messages: updatedMessages } }
        );
        console.log(`  ✅ FIXED: "${ticket.subject}"\n`);
      }
    }

    console.log("✅ Done! All user avatars are now cleared.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
