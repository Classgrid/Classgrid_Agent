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

    // 1. Fix the main platform organization (6ac4b95e0f8a97f45e98b0ff)
    // Remove the fake data!
    const platformOrgId = '6ac4b95e0f8a97f45e98b0ff';
    const org = await Organization.findById(platformOrgId);
    if (org) {
      org.name = 'Classgrid Platform';
      org.sidebar_name = 'Classgrid Platform';
      org.ownerName = 'Nikhil Shinde';
      org.ownerEmail = 'nikhil.shinde@classgrid.in';
      await org.save();
      console.log('Restored main platform organization (6ac4...) with correct owner data (NO FAKE DATA)');
    }

    // 2. Create the third organization: "Classgrid" (for the public facing agent)
    let classgridOrg = await Organization.findOne({ name: 'Classgrid' });
    if (!classgridOrg) {
      classgridOrg = new Organization({
        name: 'Classgrid',
        sidebar_name: 'Classgrid',
        ownerName: 'Classgrid',
        ownerEmail: 'Support@classgrid.in',
        address: 'Sector 26, Pradhikaran, Nigdi, near Akurdi Railway Station, Pimpri-Chinchwad, Pune, Maharashtra 411044, India',
        org_type: 'other',
        structure_type: 'custom',
        division_mode: 'with_divisions',
        city: 'Global',
        district: 'Taluka',
        state: 'Global',
        private_code: 'CLASSGRID_' + Date.now(),
        logo_url: 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png',
        sidebar_logo_url: 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png'
      });
      await classgridOrg.save();
      console.log('Created Classgrid organization with ID:', classgridOrg._id.toString());
    } else {
      console.log('Classgrid organization already exists with ID:', classgridOrg._id.toString());
    }

    // 3. Ensure Chat users have NO org ID and NO fake role!
    // Public chat users have "metadata.whatsappPhone" or "metadata.job_role"
    const result = await User.updateMany(
      { role: { $in: ['student', 'user'] }, 'metadata.whatsapp_number': { $exists: true } },
      { $set: { organization_id: null, role: 'user' } }
    );
    console.log(`Ensured ${result.modifiedCount} chat users have NO org ID and role 'user'.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
