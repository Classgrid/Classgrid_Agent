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
const mongoose = require("mongoose");
require("dotenv").config();

async function clearCollections() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // The main collections that hold AI chats, support tickets, inquiries, and attachments
    const collectionsToClear = [
      "supporttickets",
      "supportinquiries",
      "chat_sessions",
      "chat_messages",
      "chat_attachments",
      "support_tickets",
      "support_inquiries",
      "inquiries",
      "tickets",
      "emailconversations",
      "supportconversations"
    ];

    for (const name of collectionsToClear) {
      try {
        await db.collection(name).deleteMany({});
        console.log(`✅ Cleared collection: ${name}`);
      } catch (e) {
        // Ignore if collection doesn't exist
      }
    }

    console.log("All requested collections cleared!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

clearCollections();
