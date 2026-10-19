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
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function run() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();
  
  try {
    const result = await db.collection('rag_chunks').rename('marketing_rag_chunks');
    console.log("Successfully renamed collection to marketing_rag_chunks", result.collectionName);
  } catch (err) {
    if (err.code === 48) {
      console.log("Collection marketing_rag_chunks already exists or rag_chunks does not exist.");
    } else {
      console.error("Failed to rename collection:", err.message);
    }
  }
  
  process.exit(0);
}

run().catch(console.error);
