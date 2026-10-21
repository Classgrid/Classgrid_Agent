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

const file = 'c:/CLASSGRIDPLATFORM/classgrid_platoform-desktop-/client/src/components/ai/components/credits/AiCreditsPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const prefix = "                        <TableCell>";
const suffix = "                        </TableCell>";

const startIndex = content.indexOf(prefix);
const endIndex = content.indexOf(suffix, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const before = content.substring(0, startIndex + prefix.length);
    const after = content.substring(endIndex);

    const newMid = `
                          {(() => {
                            let displayStatus = txn.status;
                            let colorClass = 'bg-muted text-muted-foreground';

                            if (txn.status === 'revoked') {
                              displayStatus = 'Revoked';
                              colorClass = 'bg-red-500/10 text-red-600';
                            } else if (txn.status === 'paused') {
                              displayStatus = 'Paused';
                              colorClass = 'bg-amber-500/10 text-amber-600';
                            } else if (txn.status === 'expired') {
                              displayStatus = 'Expired';
                              colorClass = 'bg-red-500/10 text-red-600';
                            } else if (txn.status === 'success' || txn.status === 'active') {
                              displayStatus = 'Active';
                              colorClass = 'bg-emerald-500/10 text-emerald-600';
                            } else if (txn.status === 'pending') {
                              displayStatus = 'Pending';
                              colorClass = 'bg-amber-500/10 text-amber-600';
                            } else if (txn.status === 'failed') {
                              displayStatus = 'Failed';
                              colorClass = 'bg-red-500/10 text-red-600';
                            }

                            if (txn.type === 'grant' && (txn.status === 'success' || txn.status === 'active')) {
                              const promoPool = balance?.pools?.find((p: any) => p.creditType === "Promotion");
                              if (!promoPool || promoPool.status === 'Expired' || promoPool.amountRemaining <= 0) {
                                displayStatus = 'Expired';
                                colorClass = 'bg-red-500/10 text-red-600';
                              } else if (promoPool.status === 'Paused') {
                                displayStatus = 'Paused';
                                colorClass = 'bg-amber-500/10 text-amber-600';
                              }
                            } else if (txn.type === 'topup' && (txn.status === 'success' || txn.status === 'active')) {
                              const purchasedPool = balance?.pools?.find((p: any) => p.creditType === "Purchased");
                              if (!purchasedPool || purchasedPool.status === 'Expired' || purchasedPool.amountRemaining <= 0) {
                                displayStatus = 'Expired';
                                colorClass = 'bg-red-500/10 text-red-600';
                              }
                            }

                            return (
                              <span className={\`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium \${colorClass}\`}>
                                {displayStatus}
                              </span>
                            );
                          })()}
`;

    content = before + newMid + after;
    fs.writeFileSync(file, content);
    console.log("UI Replaced.");
} else {
    console.log("Could not find start or end tags.");
}
