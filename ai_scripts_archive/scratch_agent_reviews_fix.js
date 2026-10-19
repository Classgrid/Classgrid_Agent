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
const path = require('path');

const filePath = path.join('client', 'src', 'features', 'superadmin', 'pages', 'AgentReviewsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add formatRoleName helper
const formatRoleHelper = [
"const formatRoleName = (role: string) => {",
"  const overrides: Record<string, string> = {",
"    'org_admin': 'Organization Admin',",
"    'super_admin': 'Super Admin',",
"    'student': 'Student',",
"    'faculty': 'Faculty',",
"    'teacher': 'Teacher'",
"  };",
"  return overrides[role] || (role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' '));",
"};"
].join('\n');

content = content.replace('const REVIEW_STATUS_OPTIONS = [', formatRoleHelper + '\n\nconst REVIEW_STATUS_OPTIONS = [');

// 2. Remove filterType state
content = content.replace(/const \[filterType, setFilterType\] = useState<"all" \| "down">.*?;\n/, '');

// 3. Remove filterType from filteredReviews
content = content.replace(/if \(filterType !== "all" && review\.type !== filterType\) return false;\s*/, '');
content = content.replace(/\[reviews, filterType, searchTerm, selectedDateFilter\]/, '[reviews, searchTerm, selectedDateFilter]');

// 4. Remove toggle buttons
const buttonsRegex = /<div className="flex items-center gap-2">\s*<Button\s*variant=\{filterType === "all" \? "default" : "outline"\}[\s\S]*?<\/div>/;
content = content.replace(buttonsRegex, '');

// 5. Use formatRoleName in breadcrumbs and folders
content = content.replace(/\{path\.role\.charAt\(0\)\.toUpperCase\(\) \+ path\.role\.slice\(1\)\}/g, '{formatRoleName(path.role)}');
content = content.replace(/label=\{role\.charAt\(0\)\.toUpperCase\(\) \+ role\.slice\(1\)\}/g, 'label={formatRoleName(role)}');

fs.writeFileSync(filePath, content);
console.log('Successfully updated AgentReviewsPage.tsx');
