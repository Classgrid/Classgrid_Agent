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

    // 1. Restore the main platform organization
    const platformOrgId = '6ac4b95e0f8a97f45e98b0ff';
    const org = await Organization.findById(platformOrgId);
    if (org) {
      org.name = 'Classgrid Platform';
      org.sidebar_name = 'Classgrid Platform';
      org.ownerName = 'Classgrid Admin';
      org.ownerEmail = 'admin@classgrid.in';
      org.logo_url = 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png';
      org.sidebar_logo_url = 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png';
      await org.save();
      console.log('Restored main platform organization (6ac4...) to Classgrid Platform');
    }

    // 2. Ensure NO users are in any fake organizations
    // We want ALL users that are NOT chat users to belong to the platform org
    // Actually, we'll just move the super admins back to the platform org if they got lost.
    await User.updateMany(
      { role: 'super_admin' },
      { $set: { organization_id: platformOrgId } }
    );
    console.log('Ensured all super_admins are in the main platform organization');

    // 3. For public Chat users (those without 'super_admin' or institution roles), we strip them from the organization entirely.
    // They are completely separate.
    const result = await User.updateMany(
      { role: { $in: ['user', 'student'] }, 'metadata.whatsapp_number': { $exists: true } },
      { $set: { organization_id: null, role: 'user' } }
    );
    console.log(`Separated ${result.modifiedCount} chat users from the organization system completely.`);

    // Delete any organizations that are not Neha (6a2d452b1c952d43497101c8) and not Platform (6ac4b95e0f8a97f45e98b0ff)
    const delResult = await Organization.deleteMany({
      _id: { $nin: ['6a2d452b1c952d43497101c8', '6ac4b95e0f8a97f45e98b0ff'] }
    });
    console.log(`Cleaned up ${delResult.deletedCount} fake organizations.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
