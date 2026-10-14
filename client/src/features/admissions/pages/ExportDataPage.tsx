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

import React, { useState } from "react";
import { motion } from "framer-motion";
import { PageShell, PageHeader } from "../components/SharedAdmissions";

import { FiDownloadCloud, FiFileText, FiDatabase, FiLayers } from "react-icons/fi";

import { Button } from "@/components/marketing_ui/button";
import { fetchWithRescue } from "@/lib/rescue";

const EXPORT_MODULES = [
    {
        id: "dte",
        title: "DTE format (Maharashtra)",
        description: "Official Direct Second Year / Engineering format required for DTE verification. Includes CAP rounds, EN numbers, and Seat Types.",
        icon: <FiDatabase className="w-8 h-8 text-blue-500" />,
        route: "/api/admission/export/dte",
        requiredRole: "engineering",
        tags: ["Engineering", "Diploma", "DTE"]
    },
    {
        id: "aicte",
        title: "AICTE Format",
        description: "Standardized format for AICTE portal upload. Includes all mandatory student demographics and previous academic history.",
        icon: <FiLayers className="w-8 h-8 text-purple-500" />,
        route: "/api/admission/export/aicte",
        requiredRole: "engineering",
        tags: ["Engineering", "AICTE"]
    },
    {
        id: "saral",
        title: "SARAL Portal Format",
        description: "Standard school education portal format. Includes UDISE codes, standard applied, and previous school details.",
        icon: <FiFileText className="w-8 h-8 text-green-500" />,
        route: "/api/admission/export/saral",
        requiredRole: "school",
        tags: ["School", "SARAL"]
    },
    {
        id: "state-board",
        title: "State Board Format",
        description: "HSC Board format for Junior College enrollments. Includes 10th percentage, stream, and basic student identity data.",
        icon: <FiDownloadCloud className="w-8 h-8 text-orange-500" />,
        route: "/api/admission/export/state-board",
        requiredRole: "junior_college",
        tags: ["Junior College", "State Board"]
    }
];

export function ExportDataPage() {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    const handleDownload = async (module: typeof EXPORT_MODULES[0]) => {
        setDownloadingId(module.id);
        
        try {
            const token = localStorage.getItem("token");
            const res = await fetchWithRescue(module.route, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to download export");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Classgrid_${module.id}_export_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to export data. Please try again or check your permissions.");
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <PageShell>
            <PageHeader 
                title="Data Export Center" 
                subtitle="Download admission data in officially required formats for government portals."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                {EXPORT_MODULES.map((module, idx) => (
                    <motion.div
                        key={module.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        whileHover={{ y: -4 }}
                        className=" p-6 flex flex-col h-full"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-muted rounded-xl">
                                    {module.icon}
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">{module.title}</h3>
                                    <div className="flex gap-2 mt-1">
                                        {module.tags.map(tag => (
                                            <div key={tag} variant="secondary" className="text-xs">
                                                {tag}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-muted-foreground text-sm flex-grow mb-6">
                            {module.description}
                        </p>

                        <Button
                            onClick={() => handleDownload(module)}
                            disabled={downloadingId === module.id}
                            className={`inline-flex items-center justify-center rounded-md text-sm font-medium border h-9 px-4 py-2 w-full flex items-center justify-center gap-2 ${
                                downloadingId === module.id ? "opacity-50 cursor-not-allowed" : "bg-primary text-primary-foreground shadow"
                            }`}
                        >
                            {downloadingId === module.id ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                                    Generating CSV...
                                </>
                            ) : (
                                <>
                                    <FiDownloadCloud className="w-4 h-4" />
                                    Download CSV
                                </>
                            )}
                        </Button>
                    </motion.div>
                ))}
            </div>

            <div className="mt-12 p-6 bg-muted/30 rounded-xl border border-border">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="text-yellow-500">⚠️</span> Important Note on Exports
                </h4>
                <p className="text-sm text-muted-foreground">
                    These exports are generated in real-time from the database and are pre-formatted to match the exact header names and column orders required by the respective government portals. Make sure your admission configuration has mapped the necessary custom fields for your selected format.
                </p>
            </div>
        </PageShell>
    );
}
