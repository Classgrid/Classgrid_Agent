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
import mongoose from 'mongoose';

dotenv.config({ path: '.env' });

async function run() {
  try {
    await connectDB();
    console.log('Connected to DB');

    // 1. 6ac4b95e0f8a97f45e98b0ff IS THE PUBLIC FACING AI AGENT ORGANIZATION
    const aiAgentOrgId = '6ac4b95e0f8a97f45e98b0ff';
    const aiOrg = await Organization.findById(aiAgentOrgId);
    if (aiOrg) {
      aiOrg.name = 'Classgrid';
      aiOrg.sidebar_name = 'Classgrid';
      aiOrg.ownerName = 'Classgrid';
      aiOrg.ownerEmail = 'Support@classgrid.in';
      aiOrg.address = 'Sector 26, Pradhikaran, Nigdi, near Akurdi Railway Station, Pimpri-Chinchwad, Pune, Maharashtra 411044, India';
      aiOrg.logo_url = 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png';
      aiOrg.sidebar_logo_url = 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png';
      await aiOrg.save();
      console.log('Set 6ac4... as Classgrid (Public Facing AI Agent Organization)');
    }

    // 2. Create the "Classgrid Platform" organization for Super Admins
    let platformOrg = await Organization.findOne({ name: 'Classgrid Platform' });
    if (!platformOrg) {
      platformOrg = new Organization({
        name: 'Classgrid Platform',
        sidebar_name: 'Classgrid Platform',
        ownerName: 'Nikhil Shinde',
        ownerEmail: 'nikhil.shinde@classgrid.in',
        address: 'Sector 26, Pradhikaran, Nigdi, near Akurdi Railway Station, Pimpri-Chinchwad, Pune, Maharashtra 411044, India',
        org_type: 'other',
        structure_type: 'custom',
        division_mode: 'with_divisions',
        city: 'Global',
        district: 'Taluka',
        state: 'Global',
        private_code: 'PLATFORM_' + Date.now(),
        logo_url: 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png',
        sidebar_logo_url: 'https://cdn.classgrid.in/classgrid/android-chrome-512x512.png'
      });
      await platformOrg.save();
      console.log('Created new Classgrid Platform organization with ID:', platformOrg._id.toString());
    } else {
      console.log('Classgrid Platform organization already exists with ID:', platformOrg._id.toString());
    }

    // 3. Move Super Admins to the Classgrid Platform organization
    const adminMove = await User.updateMany(
      { role: 'super_admin' },
      { $set: { organization_id: platformOrg._id } }
    );
    console.log(`Moved ${adminMove.modifiedCount} super admins to Classgrid Platform organization.`);

    // 4. Move ALL public facing users to 6ac4b95e0f8a97f45e98b0ff and remove student role
    // Anyone with role 'user' or 'student' and not in Neha's org (6a2d452b1c952d43497101c8) goes to 6ac4...
    const chatUsersMove = await User.updateMany(
      { 
        role: { $in: ['user', 'student'] },
        organization_id: { $ne: '6a2d452b1c952d43497101c8' }
      },
      { 
        $set: { organization_id: aiAgentOrgId, role: 'user' } 
      }
    );
    // Also catch users who have null organization_id
    const nullUsersMove = await User.updateMany(
      { 
        role: { $in: ['user', 'student'] },
        organization_id: null
      },
      { 
        $set: { organization_id: aiAgentOrgId, role: 'user' } 
      }
    );
    console.log(`Moved ${chatUsersMove.modifiedCount + nullUsersMove.modifiedCount} public chat users to 6ac4... and set their role to 'user' instead of 'student'.`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
