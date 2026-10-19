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
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const User = mongoose.model('TestUser3', userSchema);

async function run() {
  try {
    const user = new User({ metadata: {} });
    user.metadata = {
      "first_name": "Neha",
      "last_name": "Sharma"
    };
    
    const err = user.validateSync();
    if (err) {
      console.error("FAILED WITH ERROR:", err.message);
    } else {
      console.log("SUCCESS!");
    }
  } catch (error) {
    console.error("FAILED WITH EXCEPTION:", error.message);
  } finally {
    process.exit(0);
  }
}

run();
