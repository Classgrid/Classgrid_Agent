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

// Minimal schema to test the Mixed update
const userSchema = new mongoose.Schema({
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
});

const User = mongoose.model('TestUser2', userSchema);

async function run() {
  try {
    const user = new User({ metadata: {} });
    
    // Simulate the update from ContextualProfile
    user.metadata = {
      "identity.first_name": "Neha",
      "identity.last_name": "Sharma"
    };
    
    // Test validation
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
