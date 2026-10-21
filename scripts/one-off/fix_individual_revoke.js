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

// 1. Update Routes
const routesPath = path.join(__dirname, 'server/src/routes/super-admin/ai-usage.routes.js');
let routes = fs.readFileSync(routesPath, 'utf8');
routes = routes.replace(
  'router.post("/users/:userId/credits/remove", adminController.removeGrantedCredits);',
  'router.post("/users/:userId/credits/:transactionId/remove", adminController.removeGrantedCredits);'
);
routes = routes.replace(
  'router.post("/users/:userId/credits/pause", adminController.pauseGrantedCredits);',
  'router.post("/users/:userId/credits/:transactionId/pause", adminController.pauseGrantedCredits);'
);
fs.writeFileSync(routesPath, routes);
console.log("Routes updated");

// 2. Update Controller
const ctrlPath = path.join(__dirname, 'server/src/controllers/super-admin/ai-credits-admin.controller.js');
let ctrl = fs.readFileSync(ctrlPath, 'utf8');

// For removeGrantedCredits
ctrl = ctrl.replace(
  `export const removeGrantedCredits = async (req, res) => {
    try {
        const { userId } = req.params;`,
  `export const removeGrantedCredits = async (req, res) => {
    try {
        const { userId, transactionId } = req.params;`
);

ctrl = ctrl.replace(
  `        const user = await User.findByIdAndUpdate(userId, {
            $set: { 
                "ai_tokens.promotion_credits_revoked": true
            }
        });`,
  `        const user = await User.findById(userId);`
);

ctrl = ctrl.replace(
  `        if (user) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            await AiCreditTransaction.updateMany(
                { userId: user._id, type: "grant" },
                { $set: { status: "revoked" } }
            );
        }`,
  `        if (user && transactionId) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            const txn = await AiCreditTransaction.findOneAndUpdate(
                { _id: transactionId, userId: user._id, type: "grant", status: { $ne: "revoked" } },
                { $set: { status: "revoked" } }
            );
            if (txn && txn.credits_added) {
                // Deduct from user's granted pool
                const currentBalance = user.ai_tokens?.promotion_credits_balance || 0;
                const newBalance = Math.max(0, currentBalance - txn.credits_added);
                const currentGranted = user.ai_tokens?.total_promotion_credits_granted || 0;
                const newGranted = Math.max(0, currentGranted - txn.credits_added);
                
                await User.findByIdAndUpdate(userId, {
                    $set: {
                        "ai_tokens.promotion_credits_balance": newBalance,
                        "ai_tokens.total_promotion_credits_granted": newGranted
                    }
                });
            }
        }`
);

// For pauseGrantedCredits
ctrl = ctrl.replace(
  `export const pauseGrantedCredits = async (req, res) => {
    try {
        const { userId } = req.params;`,
  `export const pauseGrantedCredits = async (req, res) => {
    try {
        const { userId, transactionId } = req.params;`
);

ctrl = ctrl.replace(
  `        const user = await User.findByIdAndUpdate(userId, {
            $set: { "ai_tokens.promotion_credits_paused": isPaused }
        });`,
  `        const user = await User.findById(userId);`
);

ctrl = ctrl.replace(
  `        if (user) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            await AiCreditTransaction.updateMany(
                { userId: user._id, type: "grant" },
                { $set: { status: isPaused ? "paused" : "active" } }
            );
        }`,
  `        if (user && transactionId) {
            const AiCreditTransaction = (await import("../../models/AiCreditTransaction.js")).default;
            await AiCreditTransaction.findOneAndUpdate(
                { _id: transactionId, userId: user._id, type: "grant" },
                { $set: { status: isPaused ? "paused" : "active" } }
            );
        }`
);
fs.writeFileSync(ctrlPath, ctrl);
console.log("Controller updated");

// 3. Update PauseUserGrantedCredits.tsx
const pausePath = path.join(__dirname, 'client/src/features/superadmin/components/ai-usage/PauseUserGrantedCredits.tsx');
let pause = fs.readFileSync(pausePath, 'utf8');
pause = pause.replace(
  `export function PauseUserGrantedCredits({ userId, isPaused = false }: { userId: string, isPaused?: boolean }) {`,
  `export function PauseUserGrantedCredits({ userId, transactionId, isPaused = false }: { userId: string, transactionId: string, isPaused?: boolean }) {`
);
pause = pause.replace(
  `await apiClient.post(\`/api/super-admin/ai-usage/users/\${userId}/credits/pause\`, { isPaused: !isPaused });`,
  `await apiClient.post(\`/api/super-admin/ai-usage/users/\${userId}/credits/\${transactionId}/pause\`, { isPaused: !isPaused });`
);
fs.writeFileSync(pausePath, pause);
console.log("Pause frontend updated");

// 4. Update RemoveUserGrantedCredits.tsx
const removePath = path.join(__dirname, 'client/src/features/superadmin/components/ai-usage/RemoveUserGrantedCredits.tsx');
let remove = fs.readFileSync(removePath, 'utf8');
remove = remove.replace(
  `export function RemoveUserGrantedCredits({ userId }: { userId: string }) {`,
  `export function RemoveUserGrantedCredits({ userId, transactionId }: { userId: string, transactionId: string }) {`
);
remove = remove.replace(
  `await apiClient.post(\`/api/super-admin/ai-usage/users/\${userId}/credits/remove\`);`,
  `await apiClient.post(\`/api/super-admin/ai-usage/users/\${userId}/credits/\${transactionId}/remove\`);`
);
remove = remove.replace(
  `description="Are you sure you want to remove all remaining granted credits for this user? This action cannot be undone and will revoke their active promotional credits immediately."`,
  `description="Are you sure you want to revoke this specific grant? This will permanently deduct the remaining credits from their promotional pool."`
);
remove = remove.replace(
  `warningMessage="The user's granted balance will be permanently set to zero."`,
  `warningMessage="This action cannot be undone."`
);
fs.writeFileSync(removePath, remove);
console.log("Remove frontend updated");

// 5. Update AiUserDetailPanel.tsx
const panelPath = path.join(__dirname, 'client/src/features/superadmin/components/ai-usage/AiUserDetailPanel.tsx');
let panel = fs.readFileSync(panelPath, 'utf8');
panel = panel.replace(
  `<PauseUserGrantedCredits userId={userDetail._id} isPaused={isPaused} />
                              <RemoveUserGrantedCredits userId={userDetail._id} />`,
  `<PauseUserGrantedCredits userId={userDetail._id} transactionId={row._id || row.id} isPaused={rowStatus === 'paused'} />
                              <RemoveUserGrantedCredits userId={userDetail._id} transactionId={row._id || row.id} />`
);
fs.writeFileSync(panelPath, panel);
console.log("Panel frontend updated");
