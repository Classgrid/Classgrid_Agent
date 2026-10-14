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
 * 2. "CLASSGRID ERP" is the actual PRODUCT NAME.
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

import { ResponsiveSelect } from "@/components/marketing_ui/responsive-select";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { PageShell, PageHeader, ExportMenu } from "../components/SharedAdmissions";
import { fetchWithRescue } from "@/lib/rescue";







export default function AdmissionAnalyticsPage() {
    const [selectedHierarchy, setSelectedHierarchy] = useState<string>("");

    // Use token from local storage (or your auth context)
    const token = localStorage.getItem("token") || "";

    const { data: analyticsData, isLoading, isError } = useQuery({
        queryKey: ["admission-analytics", selectedHierarchy],
        queryFn: async () => {
            const url = selectedHierarchy 
                ? `/api/admission/analytics?hierarchy_id=${selectedHierarchy}`
                : `/api/admission/analytics`;
            
            const res = await fetchWithRescue(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error("Failed to fetch analytics");
            return res.json();
        }
    });

    const formatFunnelData = (funnel: Record<string, number> = {}) => {
        return Object.entries(funnel).map(([stage, count]) => ({
            name: stage.replace(/_/g, " ").toUpperCase(),
            value: count
        }));
    };

    const formatLineChartData = (dailyTrend: any[] = []) => {
        let cumulative = 0;
        return dailyTrend.map(day => {
            cumulative += day.count;
            return {
                label: day._id,
                value: cumulative
            };
        });
    };

    const formatHistogramData = (buckets: any[] = []) => {
        return buckets.map(b => ({
            range: typeof b._id === "number" ? `${b._id}-${b._id + 10}` : "Other",
            count: b.count
        }));
    };

    const formatBarData = (categoryCounts: any[] = []) => {
        return categoryCounts.map(c => ({
            label: c._id || "Unspecified",
            value: c.count
        }));
    };

    const pieCategoryData = analyticsData?.breakdown?.by_category?.map((c: any) => ({
        id: c._id || "None",
        label: c._id || "None",
        value: c.count
    })) || [];

    const pieSeatData = analyticsData?.breakdown?.by_seat_type?.map((s: any) => ({
        id: s._id || "None",
        label: s._id || "None",
        value: s.count
    })) || [];

    if (isLoading) return <PageShell><div className="p-8 text-center">Loading Analytics...</div></PageShell>;
    if (isError) return <PageShell><div className="p-8 text-center text-red-500">Error loading data.</div></PageShell>;

    return (
        <PageShell>
            <div className="flex justify-between items-start mb-6">
                <PageHeader 
                    title="Admission Analytics" 
                    subtitle="Comprehensive dashboard with maximum data visualization"
                />
                <div className="flex gap-4">
                    <ResponsiveSelect 
                        
                        value={selectedHierarchy}
                        onChange={(e) => setSelectedHierarchy(e.target.value)}
                    >
                        <option value="">All Branches / Global</option>
                        {/* Mock options since actual hierarchy context is elsewhere */}
                        <option value="school">School Division</option>
                        <option value="engineering">Engineering Division</option>
                    </ResponsiveSelect>
                    <ExportMenu onExport={(type) => console.log(`Exporting ${type}`)} />
                </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <motion.div whileHover={{ y: -4 }} className=" p-4 flex flex-col justify-center">
                    <span className="text-sm text-muted-foreground">Total Applications</span>
                    <span className="text-3xl font-bold">{analyticsData?.summary?.total_applications || 0}</span>
                </motion.div>
                <motion.div whileHover={{ y: -4 }} className=" p-4 flex flex-col justify-center">
                    <span className="text-sm text-muted-foreground">Conversion Rate</span>
                    <span className="text-3xl font-bold text-green-500">{analyticsData?.summary?.conversion_rate || "0%"}</span>
                </motion.div>
                <motion.div whileHover={{ y: -4 }} className=" p-4 flex flex-col justify-center">
                    <span className="text-sm text-muted-foreground">Fee Collected</span>
                    <span className="text-3xl font-bold text-primary">₹{analyticsData?.summary?.fee_total_revenue?.toLocaleString() || 0}</span>
                </motion.div>
                <motion.div whileHover={{ y: -4 }} className=" p-4 flex flex-col justify-center">
                    <span className="text-sm text-muted-foreground">Verified Docs</span>
                    <span className="text-3xl font-bold">{analyticsData?.document_summary?.verified || 0}</span>
                </motion.div>
            </div>

            {/* MANDATORY CHARTS LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                
                {/* 1. Line Chart: Cumulative Applications Over Time */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Cumulative Applications Over Time</h3>
                    <div className="h-[300px]">
                        <div 
                            data={formatLineChartData(analyticsData?.daily_trend)}
                            xAxisKey="label"
                            series={[{ key: "value", color: "hsl(var(--primary))", name: "Total Applications" }]}
                        />
                    </div>
                </motion.div>

                {/* 2. Donut Chart: Conversion Funnel */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Conversion Funnel</h3>
                    <div className="h-[300px]">
                        <div 
                            data={formatFunnelData(analyticsData?.summary?.funnel)} 
                            centerLabel="Funnel"
                        />
                    </div>
                </motion.div>

                {/* 3. Histogram: Score Distribution */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Score Distribution (Merit Buckets)</h3>
                    <div className="h-[300px]">
                        <div 
                            data={formatHistogramData(analyticsData?.score_distribution)}
                            xAxisKey="range"
                            barKey="count"
                            color="hsl(var(--chart-2))"
                        />
                    </div>
                </motion.div>

                {/* 4. Bar Graph: Category Breakdown */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Category Daily Trends</h3>
                    <div className="h-[300px]">
                        <div 
                            data={formatBarData(analyticsData?.breakdown?.by_category)}
                            xAxisKey="label"
                            series={[{ key: "value", color: "hsl(var(--chart-3))", name: "Count" }]}
                        />
                    </div>
                </motion.div>

                {/* 5. Pie Chart: Seat Type Breakdown */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Seat Type Breakdown</h3>
                    <div className="h-[300px]">
                        <div data={pieSeatData} />
                    </div>
                </motion.div>

                {/* 6. Pie Chart: Document Status */}
                <motion.div 
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                    className=" p-6"
                >
                    <h3 className="text-lg font-semibold mb-4">Document Verification Status</h3>
                    <div className="h-[300px]">
                        <div data={[
                            { id: "Verified", label: "Verified", value: analyticsData?.document_summary?.verified || 0 },
                            { id: "Pending", label: "Pending", value: analyticsData?.document_summary?.pending || 0 },
                            { id: "Rejected", label: "Rejected", value: analyticsData?.document_summary?.rejected || 0 }
                        ]} />
                    </div>
                </motion.div>

            </div>
        </PageShell>
    );
}
