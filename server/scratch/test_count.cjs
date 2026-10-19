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
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db();
  
  const count = await db.collection('platform_rag_chunks').countDocuments();
  console.log('Total platform_rag_chunks docs:', count);
  
  const sample = await db.collection('platform_rag_chunks').findOne({});
  console.log('Sample doc:', sample ? 'Yes' : 'No');
  if (sample) {
    console.log('Has embedding?', !!sample.embedding);
    console.log('Embedding length:', sample.embedding ? sample.embedding.length : 'N/A');
  }
  
  process.exit(0);
}

run().catch(console.error);
