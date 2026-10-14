// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
/*
 * =========================================================================================
 * 🚨 CRITICAL AI & SYSTEM RULE 🚨
 * NO FRONTEND GITHUB ACTIONS: NEVER create yaml files that build/deploy the frontend to EC2.
 * The frontend is hosted 100% on Vercel. EC2 is only for the backend.
 * =========================================================================================
 */

/**
 * ==============================================================================
 * 🚨 AI AGENT WARNING: BREADCRUMB POLICY 🚨
 * ==============================================================================
 * NEVER hardcode "Super Admin Dashboard /" as a breadcrumb on any deep dive page.
 * Deep dive pages or sub-pages MUST accurately reflect the actual parent pages 
 * they were opened from (e.g., Organizations / [Name] / Configuration / ...).
 * DO NOT use generic dashboard text for breadcrumbs.
 * ==============================================================================
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

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/marketing_ui/card';
import { Input } from '@/components/marketing_ui/input';
import { Button } from '@/components/marketing_ui/button';
import { Badge } from '@/components/marketing_ui/badge';
import axios from 'axios';
import { isMainDownStatus, markMainDown, toRescueUrl } from '@/lib/rescue';

interface FraudLog {
    id: string;
    paymentId: string;
    orderId: string;
    amount: number;
    currency: string;
    fraudScore: number | null;
    reason: string;
    organizationName: string;
    blockedAt: string;
}

interface Summary {
    totalBlocked: number;
    totalAmountBlocked: number;
}

const FraudLogsPage: React.FC = () => {
    const [logs, setLogs] = useState<FraudLog[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '20' });
            if (search) params.set('search', search);
            const url = `/api/superadmin/fraud-logs?${params}`;
            const res = await axios.get(url, { withCredentials: true }).catch((err) => {
                if (!isMainDownStatus(err?.response?.status)) throw err;
                markMainDown();
                return axios.get(toRescueUrl(url), { withCredentials: true });
            });
            setLogs(res.data.data);
            setSummary(res.data.summary);
            setTotalPages(res.data.pagination.totalPages);
        } catch (err) {
            console.error('[FraudLogs] Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setSearch(searchInput.trim()), 350);
        return () => clearTimeout(t);
    }, [searchInput]);

    const formatAmount = (amount: number, currency = 'INR') =>
        new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
        });

    const scoreColor = (score: number | null) => {
        if (score === null) return 'text-muted-foreground';
        if (score >= 0.9) return 'text-red-500 font-bold';
        if (score >= 0.7) return 'text-orange-500 font-semibold';
        return 'text-yellow-500';
    };

    return (
        <div className="flex flex-col h-full bg-background text-foreground">
            {/* Header */}
            <div className="border-b border-border bg-card p-6">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🚨</span>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight">Fraud Engine Logs</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Real-time view of every payment blocked by the Classgrid Fraud Detection Engine.
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="border-red-500/30 bg-red-500/5">
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">Total Blocked</p>
                                <p className="text-3xl font-bold text-red-500 mt-1">{summary.totalBlocked}</p>
                                <p className="text-xs text-muted-foreground mt-1">payments auto-refunded</p>
                            </CardContent>
                        </Card>
                        <Card className="border-orange-500/30 bg-orange-500/5">
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">Amount Blocked</p>
                                <p className="text-3xl font-bold text-orange-500 mt-1">
                                    {formatAmount(summary.totalAmountBlocked)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">total fraud value intercepted</p>
                            </CardContent>
                        </Card>
                        <Card className="border-emerald-500/30 bg-emerald-500/5">
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">Detection Method</p>
                                <p className="text-xl font-bold text-emerald-500 mt-1">VPN + IP Analysis</p>
                                <p className="text-xs text-muted-foreground mt-1">via ip-api.com + rule engine</p>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Table */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            Blocked Payment Log
                        </CardTitle>
                        <div className="flex gap-2">
                            <Input
                                value={searchInput}
                                onChange={e => setSearchInput(e.target.value)}
                                placeholder="Search by payment ID or reason..."
                                className="w-72"
                            />
                            <Button variant="ghost" size="sm" onClick={fetchLogs}>↻ Refresh</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/50">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Payment ID</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fraud Score</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Org</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Blocked At</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="border-b border-border">
                                                {Array.from({ length: 7 }).map((_, j) => (
                                                    <td key={j} className="px-4 py-3">
                                                        <div className="h-4 bg-muted rounded animate-pulse" />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : logs.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                                <div className="text-4xl mb-2">✅</div>
                                                <p className="font-medium">No fraud detected yet</p>
                                                <p className="text-xs mt-1">All payments are clean. The engine is running.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map(log => (
                                            <tr key={log.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                                    {log.paymentId}
                                                </td>
                                                <td className={`px-4 py-3 font-mono ${scoreColor(log.fraudScore)}`}>
                                                    {log.fraudScore !== null ? `${(log.fraudScore * 100).toFixed(0)}%` : '—'}
                                                </td>
                                                <td className="px-4 py-3 max-w-xs">
                                                    <span className="text-xs text-muted-foreground truncate block" title={log.reason}>
                                                        {log.reason}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {formatAmount(log.amount, log.currency)}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {log.organizationName}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDate(log.blockedAt)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="destructive" className="text-xs">
                                                        BLOCKED + REFUNDED
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-end gap-2 p-4 border-t border-border">
                                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</Button>
                                <span className="text-sm text-muted-foreground flex items-center px-2">Page {page} of {totalPages}</span>
                                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default FraudLogsPage;
