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
"use client";

/*
 * ─────────────────────────────────────────────────────────
 * 🚨 HOSTING & ARCHITECTURE RULE 🚨
 * 1. BACKEND IS HOSTED ON AWS EC2 AT API.CLASSGRID.IN
 * 2. FRONTEND IS HOSTED ON VERCEL
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
 * 🚨 CRITICAL AI AND SYSTEM RULES 🚨
 * 1. NEVER DELETE ANY ENVIRONMENT VARIABLES.
 * 2. LOCALHOST TESTING IS STRICTLY BANNED. NO AI WILL EVER TRY TO WORK LOCALLY.
 * 3. THIS REPO IS PRODUCTION-FIRST. DO NOT TOUCH OR REMOVE KEYS.
 * ─────────────────────────────────────────────────────────
 */

/*
 * =========================================================================================
 * STRICT SECURITY POLICY:
 * NO ONE CAN EVER CHANGE THE ORGANIZATION TYPE FROM THE FRONTEND OR BACKEND.
 * NEVER ADD A DROPDOWN OR OPTION TO CHANGE IT ANYWHERE IN THE CODEBASE.
 * NO MEANS NO. THIS IS A FIXED PLATFORM RULE.
 * =========================================================================================
 */


import React, { useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/marketing_ui/dialog";
import { Button } from "@/components/marketing_ui/button";
import { Spinner } from "@/components/marketing_ui/spinner";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface ConfirmationStep {
    /** Label shown above the input, e.g. 'To confirm, type' */
    label: string;
    /** The exact value the user must type to pass this step */
    value: string;
    /** If true, the expected value will NOT be displayed in the UI next to the label */
    hideValueFromUI?: boolean;
}

export interface DangerConfirmDialogProps {
    /** Controls dialog open/close state */
    open: boolean;
    /** Called when the dialog wants to close (cancel, X, escape) */
    onOpenChange: (open: boolean) => void;

    /** Dialog title — displayed large at the top */
    title: string;
    /** Description text below the title */
    description?: string | React.ReactNode;

    /**
     * Array of confirmation steps. Each step shows a label and requires
     * the user to type a specific value. Steps are revealed sequentially —
     * step N+1 only appears after step N is correctly filled.
     *
     * Example:
     * ```
     * [
     *   { label: 'To confirm, type', value: 'bill' },
     *   { label: 'To confirm, type', value: 'delete my domain' }
     * ]
     * ```
     */
    confirmationSteps?: ConfirmationStep[];

    /** Warning message shown in the red banner at the bottom */
    warningMessage: string | React.ReactNode;

    /** Text for the action button. Default: "Confirm" */
    actionLabel?: string;
    /** Whether the action is currently loading */
    isLoading?: boolean;
    /** Called when all confirmations pass and user clicks the action button */
    onConfirm: () => void;
    /** Text for the cancel button. Default: "Cancel" */
    cancelLabel?: string;

    /** 
     * Variant controls the warning banner and action button color theme.
     * - "danger" (default): Red warning banner, red action button
     * - "warning": Amber warning banner, amber action button
     */
    variant?: "danger" | "warning";

    /** Max width class override. Default: "sm:max-w-md" */
    maxWidth?: string;

    /** Additional content to render between description and confirmation steps */
    children?: React.ReactNode;
    
    /** Optional override to disable the confirm button (useful when using children for custom inputs) */
    isConfirmDisabled?: boolean;

    /** If true, the cancel button is completely hidden */
    hideCancelButton?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function DangerConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmationSteps = [],
    warningMessage,
    actionLabel = "Confirm",
    isLoading = false,
    onConfirm,
    cancelLabel = "Cancel",
    variant = "danger",
    maxWidth = "sm:max-w-md",
    children,
    isConfirmDisabled,
    hideCancelButton = false,
}: DangerConfirmDialogProps) {
    const [stepValues, setStepValues] = useState<string[]>([]);

    // Reset all inputs when dialog opens/closes
    useEffect(() => {
        if (open) {
            setStepValues(confirmationSteps.map(() => ""));
        }
    }, [open, confirmationSteps.length]);

    const handleStepChange = useCallback((index: number, value: string) => {
        setStepValues(prev => {
            const next = [...prev];
            next[index] = value;
            return next;
        });
    }, []);

    const normalizeString = (str: string) => { return (str || "").replace(/\s+/g, " ").trim().toLowerCase(); };

    // Check if a step is completed (value matches case-insensitively and whitespace-normalized)
    const isStepComplete = (index: number) => {
        const typedValue = normalizeString(stepValues[index]);
        const expectedValue = normalizeString(confirmationSteps[index]?.value);
        return typedValue === expectedValue;
    };

    // Check if all steps are completed
    const allStepsComplete = confirmationSteps.length === 0 || 
        confirmationSteps.every((_, i) => isStepComplete(i));

    // A step is visible if it's the first step, or the previous step is complete
    const isStepVisible = (index: number) => {
        if (index === 0) return true;
        return isStepComplete(index - 1);
    };

    // Variant-based styles
    const variantStyles = {
        danger: {
            bannerBg: "bg-red-500/10 dark:bg-red-500/10",
            bannerBorder: "border-red-500/20 dark:border-red-500/20",
            bannerText: "text-red-600 dark:text-red-400",
            bannerIcon: "text-red-500 dark:text-red-400",
            buttonClass: "bg-red-500 text-white hover:bg-red-600",
        },
        warning: {
            bannerBg: "bg-amber-500/10 dark:bg-amber-500/10",
            bannerBorder: "border-amber-500/20 dark:border-amber-500/20",
            bannerText: "text-amber-700 dark:text-amber-400",
            bannerIcon: "text-amber-600 dark:text-amber-500",
            buttonClass: "bg-amber-500 text-white hover:bg-amber-600",
        },
    };

    const styles = variantStyles[variant];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && allStepsComplete && !isLoading) {
            e.preventDefault();
            onConfirm();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                className={cn(
                    "max-w-[calc(100%-2rem)] p-0 gap-0 border border-border shadow-2xl rounded-xl overflow-hidden bg-background flex flex-col max-h-[90dvh]", 
                    maxWidth
                )}
                showCloseButton={false}
                onKeyDown={handleKeyDown}
            >
                {/* ── Section 1: Header ───────────────────────────── */}
                <div className="px-6 py-6 border-b border-border bg-muted dark:bg-black shrink-0">
                    <DialogTitle className="text-xl font-semibold text-foreground tracking-tight">
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription className="text-[15px] text-muted-foreground leading-relaxed mt-3">
                            {description}
                        </DialogDescription>
                    )}
                </div>

                {/* ── Scrollable Body ──────────────────────────────── */}
                <div className="flex-1 overflow-y-auto min-h-0">
                {/* ── Section 2: Confirmation Steps ─────────────────── */}
                {confirmationSteps.length > 0 && (
                    <div className="flex flex-col gap-5 px-6 py-6 border-b border-border bg-background">
                        {confirmationSteps.map((step, index) => (
                            <div
                                key={index}
                                className="flex flex-col gap-2.5"
                            >
                                <label className="text-sm text-foreground/80">
                                    {step.label}{" "}
                                    {!step.hideValueFromUI && (
                                        <span className="font-bold text-foreground">
                                            &ldquo;{(step.value || "").replace(/\s+/g, " ").trim()}&rdquo;
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="text"
                                    value={stepValues[index] || ""}
                                    onChange={(e) => handleStepChange(index, e.target.value)}
                                    placeholder=""
                                    autoComplete="off"
                                    spellCheck={false}
                                    className={cn(
                                        "h-10 w-full rounded-md border bg-background dark:bg-black px-3 text-sm text-foreground outline-none transition-all duration-200",
                                        "focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50",
                                        "border-input"
                                    )}
                                    disabled={isLoading}
                                    autoFocus={index === 0}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Custom Children Content ──────────────────────── */}
                {children && <div className="px-6 py-4 bg-background">{children}</div>}
                </div>

                {/* ── Section 3: Footer (Warning + Buttons) ─────────── */}
                <div className="px-6 py-5 flex flex-col gap-5 bg-muted dark:bg-black border-t border-border shrink-0">
                    {/* Warning Banner */}
                    <div className={cn(
                        "flex items-center gap-3 rounded-md border px-4 py-3",
                        styles.bannerBg,
                        styles.bannerBorder
                    )}>
                        <AlertTriangle className={cn("w-[18px] h-[18px] shrink-0", styles.bannerIcon)} />
                        <span className={cn("text-sm", styles.bannerText)}>
                            {warningMessage}
                        </span>
                    </div>

                    {/* Buttons */}
                    <div className={cn("flex items-center w-full mt-1", hideCancelButton ? "justify-end" : "justify-between")}>
                        {!hideCancelButton && (
                            <button
                                onClick={() => onOpenChange(false)}
                                disabled={isLoading}
                                className="h-10 px-4 rounded-md border border-border bg-transparent text-sm font-medium text-foreground hover:bg-muted transition-colors"
                            >
                                {cancelLabel}
                            </button>
                        )}
                        <button
                            onClick={onConfirm}
                            disabled={(isConfirmDisabled !== undefined ? isConfirmDisabled : !allStepsComplete) || isLoading}
                            className={cn(
                                "inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 transition-all duration-200",
                                (isConfirmDisabled !== undefined ? !isConfirmDisabled : allStepsComplete)
                                    ? styles.buttonClass
                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                            )}
                        >
                            {isLoading && <Spinner className="mr-2" />}
                            {actionLabel}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
