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
const p = 'client/src/features/auth/auth-helpers.ts';
let c = fs.readFileSync(p, 'utf8');

const target = 'export function getRedirectPath(role: string | null | undefined) {\n  const normalized = normalizeAuthRole(role);';
const target2 = 'export function getRedirectPath(role: string | null | undefined) {\r\n  const normalized = normalizeAuthRole(role);';
const replacement = `export function getRedirectPath(role: string | null | undefined) {
  if (typeof window !== 'undefined') {
    const subdomain = window.location.hostname.split('.')[0];
    if (subdomain === 'chat') return '/agent';
  }
  const normalized = normalizeAuthRole(role);`;

if (c.includes(target)) {
  c = c.replace(target, replacement);
  fs.writeFileSync(p, c);
  console.log('Done 1');
} else if (c.includes(target2)) {
  c = c.replace(target2, replacement);
  fs.writeFileSync(p, c);
  console.log('Done 2');
} else {
  console.log('Not found');
}
