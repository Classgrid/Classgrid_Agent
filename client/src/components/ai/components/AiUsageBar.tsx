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
import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { getSocket } from '@/lib/socketClient';

// Whole percent only (no "<1"); any usage above zero shows at least 1%.
const formatPercent = (pct: number) => (pct > 0 && pct < 1 ? "1" : String(Math.round(pct)));

// Countdown text for the weekly reset, computed from the resetDate the API returns
const formatResetCountdown = (resetDate?: string | null) => {
    if (!resetDate) return "Resets weekly";
    const diffMs = new Date(resetDate).getTime() - Date.now();
    if (isNaN(diffMs)) return "Resets weekly";
    if (diffMs <= 0) return "Resets soon";
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    if (days >= 1) return `Resets in ${days} day${days === 1 ? "" : "s"}`;
    if (hours >= 1) return `Resets in ${hours} hour${hours === 1 ? "" : "s"}`;
    return "Resets in <1 hour";
};

export const AiUsageBar = ({ initialData, showExactTokens }: { initialData?: any, showExactTokens?: boolean }) => {
    const [usageData, setUsageData] = useState<any>(initialData || {
        type: 'free',
        used: 0,
        limit: 100000,
        remaining: 100000,
        resetDate: null,
        freeData: null
    });
    const [loading, setLoading] = useState(!initialData);

    const fetchUsage = async () => {
        try {
            const res = await apiClient.get('/api/ai/my-usage');
            if (res.data) {
                setUsageData(res.data);
            }
        } catch (e) {
            console.error("Failed to fetch AI usage:", e);
        } finally {
            setLoading(false);
        }
    };

    // Only fetch fresh on mount
    useEffect(() => {
        fetchUsage();
    }, []);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleTokenUpdate = () => {
            fetchUsage();
        };

        socket.on('ai_token_update', handleTokenUpdate);
        return () => {
            socket.off('ai_token_update', handleTokenUpdate);
        };
    }, []);

    const percentUsed = useMemo(() => {
        if (!usageData.limit) return 0;
        return Math.min(100, Math.max(0, (usageData.used / usageData.limit) * 100));
    }, [usageData]);

    const percentUsedFree = useMemo(() => {
        if (!usageData.freeData || !usageData.freeData.limit) return 0;
        return Math.min(100, Math.max(0, (usageData.freeData.used / usageData.freeData.limit) * 100));
    }, [usageData]);

    if (loading) {
        return (
            <div className="w-full flex flex-col gap-4 py-4 animate-pulse">
                <div className="w-full flex items-start justify-between">
                    <div className="flex flex-col gap-2 pr-6 min-w-[150px] mt-0.5">
                        <div className="h-4 w-24 bg-muted rounded"></div>
                        <div className="h-3 w-20 bg-muted rounded"></div>
                    </div>
                    <div className="flex-1 flex items-center gap-4 mt-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full"></div>
                        <div className="h-3 w-10 bg-muted rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-4 py-4">
            {/* Free Tier Bar (Always show) */}
            <div className="w-full flex items-start justify-between">
                <div className="flex flex-col gap-1 pr-6 min-w-[150px]">
                    <span className="text-sm font-medium text-foreground">
                        {usageData.type === 'pro' ? "Personal Limits" : "Weekly"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        {formatResetCountdown(usageData.freeData?.resetDate || usageData.resetDate)}
                    </span>
                </div>
                
                <div className="flex-1 flex flex-col gap-1.5 mt-1">
                    <div className="w-full flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">
                            {formatPercent(usageData.type === 'pro' ? percentUsedFree : percentUsed)}% Used
                        </span>
                        {showExactTokens && (
                            <span className="text-muted-foreground font-medium">
                                {usageData.type === 'pro' 
                                    ? `${(usageData.freeData?.used || 0).toLocaleString()} / ${(usageData.freeData?.limit || 0).toLocaleString()} Tokens`
                                    : `${(usageData.used || 0).toLocaleString()} / ${(usageData.limit || 0).toLocaleString()} Tokens`}
                            </span>
                        )}
                    </div>
                    <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${usageData.type === 'pro' ? percentUsedFree : percentUsed}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Pro Tier Bar (Only if they have Pro enabled) */}
            {usageData.type === 'pro' && (
                <div className="w-full flex items-start justify-between mt-2">
                    <div className="flex flex-col gap-1 pr-6 min-w-[150px]">
                        <span className="text-sm font-medium text-foreground">
                            Org Pool
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Shared Pro pool
                        </span>
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-1.5 mt-1">
                        <div className="w-full flex items-center justify-between text-xs mb-1">
                            <span className="font-medium text-foreground">
                                {formatPercent(percentUsed)}% Used
                            </span>
                            {showExactTokens && (
                                <span className="text-muted-foreground font-medium">
                                    {(usageData.used || 0).toLocaleString()} / {(usageData.limit || 0).toLocaleString()} Tokens
                                </span>
                            )}
                        </div>
                        <div className="w-full h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentUsed}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
