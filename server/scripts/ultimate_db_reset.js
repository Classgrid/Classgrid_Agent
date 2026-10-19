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
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Organization from '../src/models/Organization.js';
import User from '../src/models/User.js';

dotenv.config({ path: '.env' });

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    // 1. Delete the duplicate organization
    await Organization.deleteOne({ _id: '6ac53ef78390a56181c3e4a8' });
    console.log('Deleted the duplicate organization');

    // 2. The only remaining platform org should be 6ac4b95e0f8a97f45e98b0ff
    const mainOrgId = '6ac4b95e0f8a97f45e98b0ff';
    const org = await Organization.findById(mainOrgId);
    if (org) {
      org.name = 'Classgrid Platform';
      org.sidebar_name = 'Classgrid Platform';
      await org.save();
      console.log('Set 6ac4... to Classgrid Platform');
    }

    // 3. Move ALL users (except those in Neha) back to 6ac4b95e0f8a97f45e98b0ff
    // Neha's org ID is 6a2d452b1c952d43497101c8
    const result = await User.updateMany(
      { organization_id: { $ne: '6a2d452b1c952d43497101c8' } },
      { $set: { organization_id: mainOrgId } }
    );
    console.log(`Moved ${result.modifiedCount} users back to 6ac4b95e0f8a97f45e98b0ff`);

    // 4. For chat users, their role was 'student' originally.
    // Let's restore the chat users' role to 'student' to match how it was 1 hour ago.
    const chatUsers = await User.updateMany(
      { organization_id: mainOrgId, role: 'user', 'metadata.whatsapp_number': { $exists: true } },
      { $set: { role: 'student' } }
    );
    console.log(`Restored ${chatUsers.modifiedCount} chat users back to 'student' role.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
