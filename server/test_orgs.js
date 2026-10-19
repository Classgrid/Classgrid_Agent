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
import { handleToolCall } from './src/mcp/tools.js';

const uri = "mongodb+srv://classgrid-admin:aiLfOjcURw9UUALw@classgrid.sa5ww0z.mongodb.net/classgrid?retryWrites=true&w=majority&appName=Classgrid&authSource=admin";

async function run() {
  try {
    await mongoose.connect(uri);
    
    console.log("🚀 Executing MCP Tool directly...");
    const args = {
        source: 'mongodb',
        collectionOrTable: 'Organization',
        operation: 'find',
        query: {}
    };
    
    // Simulating super admin context
    const context = { userEmail: 'admin@classgrid.in', userRole: 'super_admin' };
    
    const result = await handleToolCall('unified_db_query', args, context);
    
    if (result.isError) {
        console.error("MCP Tool Error:", result.content[0].text);
        return;
    }
    
    const rawData = JSON.parse(result.content[0].text.split('\n\n[SYSTEM DIRECTIVE')[0]);
    
    console.log(`\n✅ MCP Tool returned ${rawData.length} items.`);
    
    rawData.forEach((org, i) => {
        console.log(`[${i+1}] ${org.name}`);
    });
    
  } catch (e) {
      console.log("Error:", e.message);
  } finally {
    await mongoose.disconnect();
  }
}

run();
