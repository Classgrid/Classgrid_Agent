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

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/marketing_ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/marketing_ui/table';
import { Badge } from '@/components/marketing_ui/badge';
import { Button } from '@/components/marketing_ui/button';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { Input } from '@/components/marketing_ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/marketing_ui/select';
import { format } from 'date-fns';
import { Mail, MessageSquare, AlertCircle, CheckCircle2, Search, ArrowRight, Activity } from 'lucide-react';
import { useNotificationLogs } from '../hooks/useNotifications';

export const NotificationLogViewer: React.FC = () => {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [orgIdFilter, setOrgIdFilter] = useState<string>('');
    const [searchOrgInput, setSearchOrgInput] = useState('');

    const { data, isLoading, error } = useNotificationLogs({
        page,
        limit: 50,
        status: statusFilter === 'all' ? undefined : statusFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        orgId: orgIdFilter || undefined
    });

    if (error) {
        return <div className="p-4 text-red-500 bg-red-50 rounded-md">Error loading notification logs</div>;
    }

    return (
        <Card className="flex flex-col h-full border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            System Dispatch Logs
                        </CardTitle>
                        <CardDescription>
                            Real-time audit logs of all SES emails and SNS SMS sent by the platform.
                        </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Filter by Org ID..." 
                                className="pl-8 w-[200px]"
                                value={searchOrgInput}
                                onChange={(e) => setSearchOrgInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && setOrgIdFilter(searchOrgInput)}
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="EMAIL">Email</SelectItem>
                                <SelectItem value="SMS">SMS</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="SENT">Sent</SelectItem>
                                <SelectItem value="DELIVERED">Delivered</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                                <SelectItem value="BOUNCED">Bounced</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 flex-1 flex flex-col">
                <div className="border rounded-md bg-card flex-1 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Recipient</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(10).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[40px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[160px]" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : data?.logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                        No dispatch logs found matching criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data?.logs.map((log) => (
                                    <TableRow key={log._id}>
                                        <TableCell className="whitespace-nowrap text-sm">
                                            {format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-muted-foreground">
                                                {log.type === 'EMAIL' ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium text-sm">
                                            {log.recipient}
                                        </TableCell>
                                        <TableCell>
                                            {log.organizationId ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{log.organizationId.name}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{log.organizationId.code}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {log.templateId ? (
                                                <Badge variant="outline" className="font-normal text-xs">{log.templateId.name}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Direct / API</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {['SENT', 'DELIVERED'].includes(log.status) ? (
                                                <div className="flex items-center gap-1.5 text-green-600">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{log.status}</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-600">
                                                    <AlertCircle className="w-4 h-4" />
                                                    <span className="text-xs font-medium">{log.status}</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {data && data.pages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-muted-foreground">
                            Showing page {page} of {data.pages} ({data.total} total logs)
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={page === data.pages}
                                onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
