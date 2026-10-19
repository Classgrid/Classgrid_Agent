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
const { MongoClient } = require('mongodb');
require('dotenv').config();
async function run() {
    const client = new MongoClient(process.env.MONGO_URI);
    try {
        await client.connect();
        const db = client.db('classgrid');
        console.log('--- platform_rag_chunks ---');
        const docs = await db.collection('platform_rag_chunks').find({ chunkText: { $regex: 'Rahul Saxena', $options: 'i' } }).toArray();
        console.log(`Found ${docs.length} docs`);
        if (docs.length > 0) {
            console.log('Embedding type:', typeof docs[0].embedding);
            console.log('Embedding is Array?', Array.isArray(docs[0].embedding));
            console.log('Embedding length:', docs[0].embedding ? docs[0].embedding.length : 0);
            if (Array.isArray(docs[0].embedding)) {
                console.log('First 5 values:', docs[0].embedding.slice(0, 5));
            }
        }
        
        console.log('\n--- rag_chunks ---');
        const docs2 = await db.collection('rag_chunks').find({ chunkText: { $regex: 'Rahul Saxena', $options: 'i' } }).toArray();
        console.log(`Found ${docs2.length} docs`);
        if (docs2.length > 0) {
             console.log('Embedding length:', docs2[0].embedding ? docs2[0].embedding.length : 0);
        }
    } finally {
        await client.close();
    }
}
run();
