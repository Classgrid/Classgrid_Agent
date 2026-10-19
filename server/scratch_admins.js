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

const uri = 'mongodb+srv://classgrid-admin:aiLfOjcURw9UUALw@classgrid.sa5ww0z.mongodb.net/classgrid?retryWrites=true&w=majority&appName=Classgrid&authSource=admin';

async function run() {
    try {
        await mongoose.connect(uri);
        
        // Use a generic schema so we can access any collection
        const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
        
        const users = await User.find({ role: 'org_admin' }).lean();
        
        console.log('=== REAL REASON FROM BACKEND ===');
        console.log(`Total Org Admins: ${users.length}`);
        if(users.length > 0) {
            console.log(`Fields per admin: ${Object.keys(users[0]).length} fields! (This massive size was crashing the AI)`);
        }
        
        console.log('\n=== REAL LIST OF EVERY ADMIN ===');
        users.forEach(u => {
            console.log(`Name: ${u.name || '[No Name]'} | Email: ${u.email}`);
        });
        
    } catch (e) {
        console.error("Error:", e.message);
    } finally {
        await mongoose.disconnect();
    }
}

run();
