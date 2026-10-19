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
  const coll = db.collection('platform_rag_chunks');
  
  const indexDefinition = {
    name: "vector_index",
    type: "search",
    definition: {
      mappings: {
        dynamic: true,
        fields: {
          embedding: {
            dimensions: 1024,
            similarity: "cosine",
            type: "knnVector"
          },
          pageSlug: {
            type: "token"
          }
        }
      }
    }
  };

  console.log("Creating search index on platform_rag_chunks...");
  try {
    const result = await coll.createSearchIndex(indexDefinition);
    console.log("Index created:", result);
  } catch (err) {
    console.error("Failed to create index. It might already exist or the command failed:", err.message);
  }
  
  process.exit(0);
}

run().catch(console.error);
