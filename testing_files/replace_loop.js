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
const fs = require('fs');
let content = fs.readFileSync('server/src/routes/student.routes.js', 'utf8');

const targetLoop = `    for (const s of students) {
      try {
        const fullName = s.name ? s.name.trim() : \`\${s.first_name || ''} \${s.last_name || ''}\`.trim();
        if (!fullName || !s.email) {
          results.errors.push({ email: s.email, reason: 'Name (or First/Last name) and email are required.' });
          results.skipped++;
          continue;
        }

        // Check if user already exists in MongoDB
        let user = await User.findOne({ email: s.email.toLowerCase().trim() });

        if (user) {
          // Update existing user if they belong to this org
          if (user.organization_id?.toString() === orgId) {
            if (s.prn) user.prn = s.prn.trim().toUpperCase();
            if (s.branch) user.branch = s.branch;
            if (s.batch) user.batch = s.batch;
            await user.save();
            results.skipped++;
          } else {
            results.errors.push({ email: s.email, reason: 'User belongs to a different organization.' });
            results.skipped++;
          }
          continue;
        }

        // Create new user in MongoDB
        const bcryptModule = await import('bcryptjs');
        const hashedPass = await bcryptModule.default.hash('classgrid@123', 10);

        user = await User.create({
          name: fullName,
          email: s.email.toLowerCase().trim(),
          password: hashedPass,
          role: 'student',
          organization_id: orgId,
          phone: s.phone || s.phone_number || null,
          prn: s.prn?.trim().toUpperCase() || null,
          branch: s.branch || null,
          batch: s.batch || null,
          profile_completed: false,
          mustResetPassword: true,
        });

        // Create student record in Supabase
        if (s.division_id) {
          await sb.from('students').insert({
            user_id: user._id.toString(),
            org_id: orgId,
            name: s.name.trim(),
            division_id: s.division_id,
            prn: s.prn?.trim().toUpperCase() || null,
            roll_no: s.roll_no || null,
          });
        }

        results.created++;
      } catch (innerErr) {
        results.errors.push({ email: s.email, reason: innerErr.message });
        results.skipped++;
      }
    }`;

const newLoop = `    const bcryptModule = await import('bcryptjs');
    const hashedPass = await bcryptModule.default.hash('classgrid@123', 10);
    const CHUNK_SIZE = 50;
    
    for (let i = 0; i < students.length; i += CHUNK_SIZE) {
      const chunk = students.slice(i, i + CHUNK_SIZE);
      await Promise.all(chunk.map(async (s) => {
        try {
          const fullName = s.name ? s.name.trim() : \`\${s.first_name || ''} \${s.last_name || ''}\`.trim();
          if (!fullName || !s.email) {
            results.errors.push({ email: s.email, reason: 'Name (or First/Last name) and email are required.' });
            results.skipped++;
            return;
          }

          // Check if user already exists in MongoDB
          let user = await User.findOne({ email: s.email.toLowerCase().trim() });

          if (user) {
            // Update existing user if they belong to this org
            if (user.organization_id?.toString() === orgId) {
              if (s.prn) user.prn = s.prn.trim().toUpperCase();
              if (s.branch) user.branch = s.branch;
              if (s.batch) user.batch = s.batch;
              await user.save();
              results.skipped++;
            } else {
              results.errors.push({ email: s.email, reason: 'User belongs to a different organization.' });
              results.skipped++;
            }
            return;
          }

          // Create new user in MongoDB
          user = await User.create({
            name: fullName,
            email: s.email.toLowerCase().trim(),
            password: hashedPass,
            role: 'student',
            organization_id: orgId,
            phone: s.phone || s.phone_number || null,
            prn: s.prn?.trim().toUpperCase() || null,
            branch: s.branch || null,
            batch: s.batch || null,
            profile_completed: false,
            mustResetPassword: true,
          });

          // Create student record in Supabase
          if (s.division_id) {
            await sb.from('students').insert({
              user_id: user._id.toString(),
              org_id: orgId,
              name: s.name.trim(),
              division_id: s.division_id,
              prn: s.prn?.trim().toUpperCase() || null,
              roll_no: s.roll_no || null,
            });
          }

          results.created++;
        } catch (innerErr) {
          results.errors.push({ email: s.email, reason: innerErr.message });
          results.skipped++;
        }
      }));
    }`;

if (content.includes(targetLoop)) {
  content = content.replace(targetLoop, newLoop);
  fs.writeFileSync('server/src/routes/student.routes.js', content, 'utf8');
  console.log('Successfully replaced loop!');
} else {
  console.error('Target loop not found!');
}
