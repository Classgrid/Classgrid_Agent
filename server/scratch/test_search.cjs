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
async function run() {
  await mongoose.connect('mongodb+srv://classgrid-admin:aiLfOjcURw9UUALw@classgrid.sa5ww0z.mongodb.net/classgrid?retryWrites=true&w=majority');
  
  const voyageRes = await fetch('https://ai.mongodb.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer al-yo-c9o08Qka3wSbvQAoS44H363blyV7EBQbWrwdvgIW'
    },
    body: JSON.stringify({ input: 'Which artist does Abhijeet Joshi like', model: 'voyage-3-large' })
  });
  const emb = await voyageRes.json();
  const qv = emb.data[0].embedding;
  
  const coll = mongoose.connection.db.collection('platform_rag_chunks');
  const docs = await coll.aggregate([
    { $vectorSearch: { index: 'vector_index', path: 'embedding', queryVector: qv, numCandidates: 50, limit: 3 } },
    { $project: { _id: 1, chunkText: 1, text: 1, documentType: 1, sourceUrl: 1, metadata: 1, score: { $meta: 'vectorSearchScore' } } }
  ]).toArray();

  docs.forEach((doc, i) => {
    const content = doc.chunkText || doc.text || 'No content';
    const docType = doc.documentType || (doc.metadata && doc.metadata.type) || 'unknown';
    const source = doc.sourceUrl || (doc.metadata && doc.metadata.source) || 'unknown';
    console.log(`[Match ${i+1}] Score: ${doc.score.toFixed(3)}`);
    console.log(`Source: ${source}`);
    console.log(`Type: ${docType}`);
    console.log(`Content: ${content}`);
    console.log('---');
  });
  process.exit(0);
}
run();
