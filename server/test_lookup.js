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

const uri = "mongodb+srv://classgrid-admin:aiLfOjcURw9UUALw@classgrid.sa5ww0z.mongodb.net/classgrid?retryWrites=true&w=majority&appName=Classgrid&authSource=admin";

async function run() {
  try {
    await mongoose.connect(uri);
    const collection = mongoose.connection.db.collection('users');
    const result = await collection.aggregate([
      { $match: { role: 'org_admin' } },
      { $limit: 2 },
      {
        $lookup: {
          from: 'organizations',
          let: { orgId: "$organization_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", { $toObjectId: "$$orgId" }] } } }
          ],
          as: 'organization_details'
        }
      }
    ]).toArray();
    
    console.log("With $toObjectId lookup:", JSON.stringify(result.map(r => ({ name: r.name, org_details: r.organization_details })), null, 2));
    
  } catch (e) {
      console.log("Error:", e.message);
  } finally {
    await mongoose.disconnect();
  }
}
run();
