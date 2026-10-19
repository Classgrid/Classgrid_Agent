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
require('dotenv').config({ path: __dirname + '/../.env' });
const { MongoClient } = require('mongodb');

async function run() {
    const uri = process.env.MONGO_URI;
    const client = new MongoClient(uri);

    try {
        await client.connect();
        const db = client.db('classgrid');
        const collection = db.collection('platform_rag_chunks');

        // Simple text search as fallback, or vector search
        const docs = await collection.aggregate([
            {
                $vectorSearch: {
                    index: "vector_index", // Guessing the index name
                    path: "embedding",
                    queryVector: new Array(1024).fill(0.1),
                    numCandidates: 100,
                    limit: 5
                }
            }
        ]).toArray();
        console.log("Vector search successful!", docs.length);
    } catch (error) {
        console.error("Vector search failed:", error.message);
    } finally {
        await client.close();
    }
}

run();
