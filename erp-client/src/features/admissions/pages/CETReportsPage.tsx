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
// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 NAMING CONVENTION RULE 🚨
 * 1. "CLASSGRID PLATFORM" is strictly the REPO NAME.
 * 2. chat.classgrid.in (Classgrid AI) is the actual PRODUCT. The ERP is shut down.
 * 3. NEVER use "Classgrid Platform" anywhere in the frontend UI or user-facing text.
 * ─────────────────────────────────────────────────────────
 */

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
 * ─────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageShell, PageHeader, ExportMenu } from "../components/SharedAdmissions";
import { fetchWithRescue } from "@/lib/rescue";




export function CETReportsPage() {
    const token = localStorage.getItem("token") || "";

    const { data: cetData, isLoading, isError } = useQuery({
        queryKey: ["cet-dashboard"],
        queryFn: async () => {
            const res = await fetchWithRescue(`/api/admission/cet/dashboard`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch CET dashboard");
            return res.json();
        }
    });

    const formatBarData = (items: any[] = [], keyLabel: string = "_id", keyVal: string = "claimed") => {
        return items.map(item => ({
            label: item[keyLabel] || "Unknown",
            value: item[keyVal] || 0,
            total: item.total || 0,
            upgraded: item.upgraded || 0,
            cancelled: item.cancelled || 0
        }));
    };

    const formatPieData = (items: any[] = []) => {
        return items.map(item => ({
            id: item._id || "Pending",
            label: item._id || "Pending",
            value: item.count || 0
        }));
    };

    if (isLoading) return <PageShell><div className="p-8 text-center">Loading CET Statistics...</div></PageShell>;
    if (isError) return <PageShell><div className="p-8 text-center text-red-500">Error loading CET data. Ensure you have the correct permissions.</div></PageShell>;

    const branchData = formatBarData(cetData?.branch_fill_rates);
    const capRoundData = formatBarData(cetData?.cap_rounds);
    const rlaData = formatPieData(cetData?.rla_breakdown);

    return (
        <PageShell>
            <div className="flex justify-between items-start mb-6">
                <PageHeader 
                    title="CET / DTE Reports" 
                    subtitle="Engineering-specific metrics: CAP rounds, seat fill rates, and RLA statuses."
                />
                <ExportMenu onExport={(type) => console.log(`Exporting CET report as ${type}`)} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                
                {/* 1. Branch Fill Rates */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Branch Fill Rates (Claimed Seats)</h3>
                    <div className="h-[300px]">
                        <div 
                            data={branchData}
                            xAxisKey="label"
                            series={[
                                { key: "value", color: "hsl(var(--primary))", name: "Claimed Seats" },
                                { key: "total", color: "hsl(var(--muted-foreground))", name: "Total Allotted" }
                            ]}
                        />
                    </div>
                </motion.div>

                {/* 2. CAP Round Statistics */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">CAP Round Retention</h3>
                    <div className="h-[300px]">
                        <div 
                            data={capRoundData}
                            xAxisKey="label"
                            series={[
                                { key: "value", color: "hsl(var(--chart-2))", name: "Claimed" },
                                { key: "upgraded", color: "hsl(var(--chart-3))", name: "Upgraded" },
                                { key: "cancelled", color: "hsl(var(--destructive))", name: "Cancelled" }
                            ]}
                        />
                    </div>
                </motion.div>

                {/* 3. RLA Verification Status */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">RLA Verification Status</h3>
                    <div className="h-[300px]">
                        {rlaData.length > 0 ? (
                            <div data={rlaData} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                No RLA data available
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* 4. Live Seat Matrix Snapshot */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Live Seat Matrix (Vacancies)</h3>
                    <div className="h-[300px] overflow-y-auto pr-2">
                        {cetData?.seat_matrix?.length > 0 ? (
                            <div className="space-y-4">
                                {cetData.seat_matrix.map((matrix: any, idx: number) => (
                                    <div key={idx} className="border border-border rounded-lg p-4">
                                        <h4 className="font-medium mb-2">{matrix.hierarchy_id?.name || "Global"}</h4>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            {matrix.quotas?.map((q: any) => (
                                                <div key={q.name} className="flex justify-between items-center bg-muted/30 p-2 rounded">
                                                    <span>{q.name}</span>
                                                    <span className="font-mono">
                                                        <span className="text-green-600 dark:text-green-400 font-bold">{q.capacity - q.filled}</span>
                                                        <span className="text-muted-foreground"> / {q.capacity}</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                Seat Matrix not configured for this organization.
                            </div>
                        )}
                    </div>
                </motion.div>

            </div>
        </PageShell>
    );
}
