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
let code = fs.readFileSync('client/src/lib/socketClient.ts', 'utf8');

// Cleanup previous echoes
code = code.replace(/export function joinAiUsageDashboard\(\).*$/gm, '');
code = code.replace(/export function leaveAiUsageDashboard\(\).*$/gm, '');

// Ensure clean format
code = code.trim();

// Insert before export default {
code = code.replace('export default {', `export function joinAiUsageDashboard() {
  socket?.emit("join_ai_usage_dashboard");
}

export function leaveAiUsageDashboard() {
  socket?.emit("leave_ai_usage_dashboard");
}

export default {`);

// Insert into export default {
code = code.replace('emitThreadTyping,', 'emitThreadTyping,\n  joinAiUsageDashboard,\n  leaveAiUsageDashboard,');

fs.writeFileSync('client/src/lib/socketClient.ts', code);
console.log('Done!');
