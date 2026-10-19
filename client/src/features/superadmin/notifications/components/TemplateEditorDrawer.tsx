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

import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/marketing_ui/drawer';
import { Button } from '@/components/marketing_ui/button';
import { Input } from '@/components/marketing_ui/input';
import { Label } from '@/components/marketing_ui/label';
import { Textarea } from '@/components/marketing_ui/textarea';
import { Badge } from '@/components/marketing_ui/badge';
import { Skeleton } from '@/components/marketing_ui/skeleton';
import { useNotificationTemplate, useUpdateNotificationTemplate } from '../hooks/useNotifications';
import { Code, Eye, Save } from 'lucide-react';

export const TemplateEditorDrawer: React.FC<{ isOpen: boolean; onClose: () => void; templateId: string }> = ({ isOpen, onClose, templateId }) => {
    const { data: template, isLoading } = useNotificationTemplate(templateId);
    const updateMutation = useUpdateNotificationTemplate();

    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [textBody, setTextBody] = useState('');
    const [fromEmail, setFromEmail] = useState('');
    const [fromName, setFromName] = useState('');
    const [mode, setMode] = useState<'edit' | 'preview'>('edit');

    useEffect(() => {
        if (template) {
            setSubject(template.subject || '');
            setHtmlBody(template.htmlBody || '');
            setTextBody(template.textBody || '');
            setFromEmail(template.fromEmail || '');
            setFromName(template.fromName || '');
        }
    }, [template]);

    const handleSave = () => {
        updateMutation.mutate({
            id: templateId,
            data: { subject, htmlBody, textBody, fromEmail, fromName }
        }, {
            onSuccess: () => onClose()
        });
    };

    return (
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DrawerContent className="max-w-4xl ml-auto right-0 left-auto h-full rounded-l-xl rounded-r-none flex flex-col">
                <DrawerHeader className="border-b shrink-0 flex justify-between items-center bg-card">
                    <div>
                        <DrawerTitle className="text-xl flex items-center gap-2">
                            Edit Template
                            {template && <Badge variant="outline" className="ml-2 font-mono">{template.name}</Badge>}
                        </DrawerTitle>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}>
                            {mode === 'edit' ? <Eye className="w-4 h-4 mr-2" /> : <Code className="w-4 h-4 mr-2" />}
                            {mode === 'edit' ? 'Preview' : 'Editor'}
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending || isLoading}>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="sm">Cancel</Button>
                        </DrawerClose>
                    </div>
                </DrawerHeader>
                
                <div className="flex-1 overflow-y-auto p-6 bg-muted/10 space-y-6">
                    {isLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </div>
                    ) : template && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Default From Name</Label>
                                    <Input 
                                        value={fromName} 
                                        onChange={(e) => setFromName(e.target.value)} 
                                        placeholder="e.g. Classgrid Billing" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Default From Email</Label>
                                    <Input 
                                        value={fromEmail} 
                                        onChange={(e) => setFromEmail(e.target.value)} 
                                        placeholder="e.g. billing@classgrid.in" 
                                    />
                                </div>
                            </div>
                            
                            {template.type === 'EMAIL' && (
                                <div className="space-y-2">
                                    <Label>Subject Line (Handlebars supported)</Label>
                                    <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                                </div>
                            )}

                            {template.type === 'EMAIL' ? (
                                <div className="space-y-2 flex-1 flex flex-col">
                                    <div className="flex justify-between items-end">
                                        <Label>HTML Body (Handlebars supported)</Label>
                                        <div className="text-xs text-muted-foreground">
                                            Placeholders: {template.requiredPlaceholders.map(p => `{{${p}}}`).join(', ')}
                                        </div>
                                    </div>
                                    {mode === 'edit' ? (
                                        <Textarea 
                                            value={htmlBody} 
                                            onChange={(e) => setHtmlBody(e.target.value)} 
                                            className="font-mono text-sm min-h-[400px] flex-1"
                                        />
                                    ) : (
                                        <div 
                                            className="bg-white border rounded-md min-h-[400px] p-6 shadow-sm overflow-x-auto text-black"
                                            dangerouslySetInnerHTML={{ __html: htmlBody }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2 flex-1 flex flex-col">
                                    <Label>SMS Text Body (Handlebars supported)</Label>
                                    <Textarea 
                                        value={textBody} 
                                        onChange={(e) => setTextBody(e.target.value)} 
                                        className="font-mono text-sm min-h-[200px]"
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
};
