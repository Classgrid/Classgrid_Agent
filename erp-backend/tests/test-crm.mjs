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
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ role: 'org_admin' });
    const token = jwt.sign({ id: user._id.toString(), role: user.role, organizationId: user.organization_id?.toString() }, process.env.JWT_SECRET);
    
    console.log('Testing /api/crm/leads...');
    const res = await fetch('http://localhost:3000/api/crm/leads', { headers: { Authorization: 'Bearer ' + token } });
    console.log("Status:", res.status);
    if(res.status !== 404) {
        const json = await res.json();
        console.log(JSON.stringify(json).substring(0, 200));
    }
    await mongoose.disconnect();
}
run().catch(console.error);
