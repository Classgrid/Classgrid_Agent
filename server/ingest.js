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
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

const chunkText = "Classgrid Academic Hierarchy: The institution consists of primary, secondary, and higher secondary sections. The Principal is the head, followed by Vice Principals, Coordinators, and Teachers.";

async function run() {
  console.log("Generating embedding using Voyage AI...");
  const res = await fetch("https://ai.mongodb.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + VOYAGE_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      input: [chunkText],
      model: "voyage-3-large"
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(data));
  }

  const embedding = data.data[0].embedding;
  console.log("Generated vector of length", embedding.length);

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const coll = client.db().collection('platform_rag_chunks');
  
  const result = await coll.insertOne({
    chunkText,
    embedding,
    documentType: "policy",
    sourceUrl: "manual-script-upload",
    createdAt: new Date()
  });

  console.log("Successfully inserted document into RAG! ID:", result.insertedId);
  await client.close();
}

run().catch(console.error);
