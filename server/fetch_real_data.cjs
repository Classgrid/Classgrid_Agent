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
const dbUri = "mongodb://classgrid-admin:27iwqvVnbpqq6RD5@ac-hs4letd-shard-00-00.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-01.sa5ww0z.mongodb.net:27017,ac-hs4letd-shard-00-02.sa5ww0z.mongodb.net:27017/classgrid?ssl=true&replicaSet=atlas-t4g7k9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Classgrid";

async function run() {
  const client = new MongoClient(dbUri);
  try {
    await client.connect();
    const db = client.db('classgrid');
    
    console.log('\n--- REAL INSTITUTIONS (ORGANIZATIONS) ---');
    const orgs = await db.collection('organizations').find({}).toArray();
    console.log(`Found ${orgs.length} total institutions in the database!`);
    orgs.forEach(o => {
        console.log(`- Name: ${o.name}`);
        console.log(`  Subdomain: ${o.subdomain}`);
        console.log(`  Structure: ${o.structureType}`);
    });

    console.log('\n--- DOMAIN CONFIGS ---');
    const orgWebsites = await db.collection('orgwebsitecontents').find({ customDomain: { $exists: true, $ne: '' } }).toArray();
    console.log(`Found ${orgWebsites.length} custom domains configured.`);
    orgWebsites.forEach(w => console.log(`- Domain: ${w.customDomain} (Org ID: ${w.organization})`));

    console.log('\n--- CHAT ---');
    const threads = await db.collection('threadchats').countDocuments().catch(() => 0);
    const msgs = await db.collection('messages').countDocuments().catch(() => 0);
    console.log(`Found ${threads} chat threads and ${msgs} total messages.`);

  } catch (e) { 
    console.error(e); 
  } finally { 
    await client.close(); 
  }
}
run();
