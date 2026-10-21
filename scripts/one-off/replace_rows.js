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

const file = 'c:\\CLASSGRIDPLATFORM\\classgrid_platoform-desktop-\\client\\src\\features\\superadmin\\components\\ai-usage\\AiUserDetailPanel.tsx';
let code = fs.readFileSync(file, 'utf8');

const regex = /\{\s*key: "dates",\s*header: "Dates",\s*width: "w-\[20%\]",\s*render: \(\) => \(([\s\S]*?)emptyMessage="No active granted credits."/m;

const replacement = `{
                  key: "dates",
                  header: "Dates",
                  width: "w-[20%]",
                  render: (_: any, row: any) => (
                    <div className="flex flex-col text-xs text-muted-foreground">
                      <span className="truncate">Granted: {row.date ? new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}</span>
                      <span className="truncate">Expires: {userDetail.ai_tokens?.promotion_credits_end_date ? new Date(userDetail.ai_tokens.promotion_credits_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "N/A"}</span>
                    </div>
                  )
                },
                {
                  key: "credits",
                  header: "Credits Added",
                  width: "w-[25%]",
                  render: (_: any, row: any) => {
                    return (
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-base">+{formatNumber(row.credits_added || 0)}</span>
                        <span className="text-xs text-muted-foreground">to Promotional Pool</span>
                      </div>
                    )
                  }
                },
                {
                  key: "status",
                  header: "Pool Status",
                  width: "w-[10%]",
                  render: () => {
                    const isPaused = userDetail.ai_tokens?.promotion_credits_paused;
                    const limit = userDetail.ai_tokens?.total_promotion_credits_granted || 0;
                    const remaining = userDetail.ai_tokens?.promotion_credits_balance || 0;
                    const endDate = userDetail.ai_tokens?.promotion_credits_end_date;
                    const isExpired = endDate && new Date(endDate).getTime() < Date.now();
                    const isRevoked = userDetail.ai_tokens?.promotion_credits_revoked;

                    let statusLabel = "ACTIVE";
                    let statusClass = "bg-green-500/10 text-green-500";

                    if (isRevoked) {
                      statusLabel = "REVOKED";
                      statusClass = "bg-red-500/10 text-red-500";
                    } else if (remaining <= 0 && limit > 0) {
                      statusLabel = "EXHAUSTED";
                      statusClass = "bg-slate-500/10 text-slate-600 dark:text-slate-400";
                    } else if (isExpired) {
                      statusLabel = "EXPIRED";
                      statusClass = "bg-red-500/10 text-red-500";
                    } else if (isPaused) {
                      statusLabel = "PAUSED";
                      statusClass = "bg-amber-500/10 text-amber-500";
                    }

                    return (
                      <span className={\`inline-flex px-2 py-0.5 rounded-full text-xs font-medium \${statusClass}\`}>
                        {statusLabel}
                      </span>
                    );
                  }
                },
                {
                  key: "actions",
                  header: "Pool Actions",
                  width: "w-[25%]",
                  render: () => {
                    const isPaused = userDetail.ai_tokens?.promotion_credits_paused;
                    const limit = userDetail.ai_tokens?.total_promotion_credits_granted || 0;
                    const remaining = userDetail.ai_tokens?.promotion_credits_balance || 0;
                    const used = Math.max(0, limit - remaining);
                    const isRevoked = userDetail.ai_tokens?.promotion_credits_revoked;

                    let statusLabel = "ACTIVE";
                    if (isRevoked) statusLabel = "REVOKED";
                    else if (remaining <= 0 && limit > 0) statusLabel = "EXHAUSTED";
                    else if (userDetail.ai_tokens?.promotion_credits_end_date && new Date(userDetail.ai_tokens.promotion_credits_end_date).getTime() < Date.now()) statusLabel = "EXPIRED";
                    else if (isPaused) statusLabel = "PAUSED";

                      return (
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 min-w-0 max-w-full scrollbar-thin scrollbar-thumb-muted-foreground/20 [&>*]:shrink-0">
                          <ViewGrantedCreditsDetails used={used} limit={limit} history={userDetail.promotionHistory || []} status={statusLabel} />
                          {!isRevoked && (
                            <>
                              <ExtendUserGrantedCredits userId={userDetail.id} currentExpiry={userDetail.ai_tokens?.promotion_credits_end_date} />
                              <PauseUserGrantedCredits userId={userDetail.id} isPaused={isPaused} />
                              <RemoveUserGrantedCredits userId={userDetail.id} />
                            </>
                          )}
                        </div>
                      )
                  }
                }
              ]} 
              rows={(userDetail.promotionHistory || []).filter((h: any) => h.type === 'grant' || h.type === 'granted').map((h: any, i: number) => ({ ...h, id: h.id || h._id || i }))} 
              emptyMessage="No active granted credits."`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync(file, code);
    console.log("Replaced successfully!");
} else {
    console.log("Regex did not match!");
}
