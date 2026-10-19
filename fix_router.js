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
const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/app/router.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update imports and add NavigateWithQuery
if (!content.includes('useLocation')) {
    content = content.replace(
        'import { Navigate, Route, Routes } from "react-router-dom";',
        'import { Navigate, Route, Routes, useLocation } from "react-router-dom";\n\nfunction NavigateWithQuery({ to, replace }: { to: string, replace?: boolean }) {\n  const { search } = useLocation();\n  return <Navigate to={{ pathname: to, search }} replace={replace} />;\n}'
    );
}

// 2. Replace <Navigate to= with <NavigateWithQuery to=
// (Make sure to NOT replace inside the NavigateWithQuery component definition)
content = content.replace(/<Navigate to="/g, '<NavigateWithQuery to="');
content = content.replace(/<Navigate to={getRedirectPath/g, '<NavigateWithQuery to={getRedirectPath');

// Undo the one inside NavigateWithQuery itself
content = content.replace(
    'return <NavigateWithQuery to={{ pathname: to, search }} replace={replace} />',
    'return <Navigate to={{ pathname: to, search }} replace={replace} />'
);

fs.writeFileSync(file, content);
console.log("Replaced Navigate with NavigateWithQuery");
