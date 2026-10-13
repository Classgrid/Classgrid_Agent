// CLASSGRID USES CLOUDFLARE USAGE TO CALCULATE TOKENS, NOT GPT-TOKENIZER (WHICH IS ONLY A FALLBACK)
import React, { useState } from "react";
import { Button } from "@/components/marketing_ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/marketing_ui/dialog";
import { Input } from "@/components/marketing_ui/input";
import { Label } from "@/components/marketing_ui/label";
import { BlueSlider } from "@/components/marketing_ui/BlueSlider";
import { toast } from "sonner";
import { Spinner } from "@/components/marketing_ui/spinner";
import { Switch } from "@/components/marketing_ui/switch";
import { useUpdateOrgAiLimits, type ResetPeriod, type ResetUnit } from "@/features/superadmin/queries/useAiUsage";

export const RESET_UNITS: { value: ResetUnit; label: string }[] = [
  { value: "second", label: "Second" },
  { value: "minute", label: "Minute" },
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];
export const DEFAULT_RESET_PERIOD: ResetPeriod = { value: 7, unit: "day" };

export const toResetPeriod = (p?: ResetPeriod | null): ResetPeriod => (p?.value && p?.unit ? { value: p.value, unit: p.unit } : DEFAULT_RESET_PERIOD);

const UNIT_SECONDS: Record<ResetUnit, number> = { second: 1, minute: 60, hour: 3600, day: 86400, week: 604800, month: 2592000 };
const MAX_RESET_SECONDS = 366 * 86400;
const PERIOD_PARTS = [
  { key: "days", label: "Days", size: 86400 },
  { key: "hours", label: "Hours", size: 3600 },
  { key: "minutes", label: "Minutes", size: 60 },
  { key: "seconds", label: "Seconds", size: 1 },
] as const;
type PeriodParts = Record<(typeof PERIOD_PARTS)[number]["key"], number>;

const periodToSeconds = (p?: ResetPeriod | null) => {
  const { value, unit } = toResetPeriod(p);
  return value * UNIT_SECONDS[unit];
};
const secondsToPeriod = (total: number): ResetPeriod => {
  for (const unit of ["day", "hour", "minute"] as const) {
    if (total % UNIT_SECONDS[unit] === 0) return { value: total / UNIT_SECONDS[unit], unit };
  }
  return { value: total, unit: "second" };
};
const splitSeconds = (total: number): PeriodParts => {
  let rest = total;
  const parts = {} as PeriodParts;
  for (const { key, size } of PERIOD_PARTS) {
    parts[key] = Math.floor(rest / size);
    rest -= parts[key] * size;
  }
  return parts;
};

export function formatResetPeriod(p?: ResetPeriod | null) {
  const { value, unit } = toResetPeriod(p);
  if (unit === "week" || unit === "month") return `Resets every ${value} ${unit}${value === 1 ? "" : "s"}`;
  const parts = splitSeconds(periodToSeconds(p));
  const text = PERIOD_PARTS.filter(({ key }) => parts[key] > 0)
    .map(({ key, label }) => `${parts[key]} ${parts[key] === 1 ? label.slice(0, -1).toLowerCase() : label.toLowerCase()}`)
    .join(" ");
  return `Resets every ${text}`;
}

export function ResetPeriodInput({ id, value, onChange, disabled }: { id: string; value: ResetPeriod; onChange: (p: ResetPeriod) => void; disabled?: boolean }) {
  const [parts, setParts] = useState<PeriodParts>(() => splitSeconds(periodToSeconds(value)));
  React.useEffect(() => { setParts(splitSeconds(periodToSeconds(value))); }, [value.value, value.unit]);

  const total = PERIOD_PARTS.reduce((sum, { key, size }) => sum + parts[key] * size, 0);
  const invalid = total < 1 || total > MAX_RESET_SECONDS;

  const setPart = (key: keyof PeriodParts, raw: string) => {
    const next = { ...parts, [key]: Math.max(0, Math.floor(Number(raw) || 0)) };
    setParts(next);
    const nextTotal = PERIOD_PARTS.reduce((sum, p) => sum + next[p.key] * p.size, 0);
    if (nextTotal >= 1 && nextTotal <= MAX_RESET_SECONDS) onChange(secondsToPeriod(nextTotal));
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">Resets every</Label>
      <div className="grid grid-cols-4 gap-2">
        {PERIOD_PARTS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-1">
            <Input
              id={`${id}-reset-${key}`}
              type="number"
              min={0}
              step={1}
              value={parts[key]}
              onChange={(e) => setPart(key, e.target.value)}
              disabled={disabled}
              aria-label={label}
            />
            <Label htmlFor={`${id}-reset-${key}`} className="text-xs text-muted-foreground">{label}</Label>
          </div>
        ))}
      </div>
      {!invalid && <p className="text-xs text-muted-foreground">{formatResetPeriod(secondsToPeriod(total))}</p>}
    </div>
  );
}

export interface SetupUsageCreditsProps {
  orgId: string;
  orgName: string;
  currentPoolLimit: number;
  currentUserWeeklyLimit: number;
  currentImageLimit?: number;
  currentWhatsappLimit?: number;
  customLimitsEnabled?: boolean;
  currentResetPeriods?: { tokens?: ResetPeriod; image?: ResetPeriod; whatsapp?: ResetPeriod };
}

export function SetupUsageCredits({ orgId, orgName, currentPoolLimit, currentUserWeeklyLimit, currentImageLimit, currentWhatsappLimit, customLimitsEnabled, currentResetPeriods }: SetupUsageCreditsProps) {
  const isClassgrid = orgId === "classgrid";
  // chat.classgrid.in's public chat organization: its users are never org admins, so the shared org pool
  // (used only by org_admin accounts) never applies there and is hidden
  const isPublicChatOrg = orgId === "6ac4b95e0f8a97f45e98b0ff";
  const [isCustomLimits, setIsCustomLimits] = useState(customLimitsEnabled ?? false);
  // State for Pools
  const [individualUsage, setIndividualUsage] = useState(currentUserWeeklyLimit ?? 0);
  const [orgPool, setOrgPool] = useState(currentPoolLimit ?? 0);

  // State for Media/Messaging
  const [images, setImages] = useState<number>(currentImageLimit ?? 0);
  const [whatsapp, setWhatsapp] = useState<number>(currentWhatsappLimit ?? 0);

  const [tokenReset, setTokenReset] = useState<ResetPeriod>(toResetPeriod(currentResetPeriods?.tokens));
  const [imageReset, setImageReset] = useState<ResetPeriod>(toResetPeriod(currentResetPeriods?.image));
  const [whatsappReset, setWhatsappReset] = useState<ResetPeriod>(toResetPeriod(currentResetPeriods?.whatsapp));

  // Loading States
  const [openIndividual, setOpenIndividual] = useState(false);
  const [openOrg, setOpenOrg] = useState(false);
  const [openImages, setOpenImages] = useState(false);
  const [openWhatsapp, setOpenWhatsapp] = useState(false);

  React.useEffect(() => { if (!openIndividual) setIndividualUsage(currentUserWeeklyLimit ?? 0); }, [openIndividual, currentUserWeeklyLimit]);
  React.useEffect(() => { if (!openOrg) setOrgPool(currentPoolLimit ?? 0); }, [openOrg, currentPoolLimit]);
  React.useEffect(() => { if (!openImages) setImages(currentImageLimit ?? 0); }, [openImages, currentImageLimit]);
  React.useEffect(() => { if (!openWhatsapp) setWhatsapp(currentWhatsappLimit ?? 0); }, [openWhatsapp, currentWhatsappLimit]);
  const tokenResetKey = `${currentResetPeriods?.tokens?.value}-${currentResetPeriods?.tokens?.unit}`;
  const imageResetKey = `${currentResetPeriods?.image?.value}-${currentResetPeriods?.image?.unit}`;
  const whatsappResetKey = `${currentResetPeriods?.whatsapp?.value}-${currentResetPeriods?.whatsapp?.unit}`;
  React.useEffect(() => { if (!openIndividual) setTokenReset(toResetPeriod(currentResetPeriods?.tokens)); }, [openIndividual, tokenResetKey]);
  React.useEffect(() => { if (!openImages) setImageReset(toResetPeriod(currentResetPeriods?.image)); }, [openImages, imageResetKey]);
  React.useEffect(() => { if (!openWhatsapp) setWhatsappReset(toResetPeriod(currentResetPeriods?.whatsapp)); }, [openWhatsapp, whatsappResetKey]);

  const updateLimitsMutation = useUpdateOrgAiLimits();

  const handleToggleCustomLimits = (checked: boolean) => {
    setIsCustomLimits(checked);
    updateLimitsMutation.mutate({
      orgId,
      data: { 
         custom_limits_enabled: checked
      }
    }, {
      onSuccess: () => {
        toast.success(checked ? "Custom limits enabled for this organization." : "Organization is now following global limits.");
      },
      onError: () => {
        setIsCustomLimits(!checked); // Revert on failure
        toast.error("Failed to update limit settings.");
      }
    });
  };


  const handleSave = (
    setOpen: (v: boolean) => void,
    successMessage: string
  ) => {
    updateLimitsMutation.mutate({
      orgId,
      data: { 
         pro_pool_limit: orgPool, 
         free_weekly_limit_per_user: individualUsage,
         image_generation_limit: images,
         whatsapp_scheduling_limit: whatsapp,
         token_reset_value: tokenReset.value,
         token_reset_unit: tokenReset.unit,
         image_reset_value: imageReset.value,
         image_reset_unit: imageReset.unit,
         whatsapp_reset_value: whatsappReset.value,
         whatsapp_reset_unit: whatsappReset.unit
      }
    }, {
      onSuccess: () => {
        toast.success(successMessage);
        setOpen(false);
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden h-full">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Setup Usage Credits (DEBUG orgId: '{orgId}')</h2>
            <p className="text-sm text-muted-foreground">Manage default limits and quotas for {orgName}.</p>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="custom-limits" className="text-sm font-medium whitespace-nowrap">
              Follow Global Limits
            </Label>
            <Switch
              id="custom-limits"
              checked={!isCustomLimits}
              onCheckedChange={(checked) => handleToggleCustomLimits(!checked)}
              disabled={updateLimitsMutation.isPending}
            />
          </div>
        </div>

        <div className="p-0 flex flex-col h-full">
          <div className={`grid grid-cols-1 ${isPublicChatOrg ? "" : "md:grid-cols-2"} gap-px bg-border border-b border-border flex-1`}>
            {/* Individual Usage */}
            <Dialog open={openIndividual} onOpenChange={setOpenIndividual}>
              <DialogTrigger asChild>
                <button disabled={!isCustomLimits} className={`bg-card p-5 flex flex-col gap-2 text-left transition-colors ${!isCustomLimits ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"}`}>
                  <span className="text-sm font-medium text-muted-foreground">Individual Usage</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {individualUsage.toLocaleString()} <span className="text-sm font-normal text-muted-foreground ml-1">Tokens</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{formatResetPeriod(tokenReset)}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Individual Limit</DialogTitle>
                  <DialogDescription>Adjust the token limit for individuals and how often it resets.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Individual Usage per Period</Label>
                    <span className="text-sm font-bold text-blue-600">{individualUsage.toLocaleString()}</span>
                  </div>
                  <BlueSlider min={1000} max={100000000} step={1000} value={individualUsage} onValueChange={setIndividualUsage} disabled={updateLimitsMutation.isPending} />
                  <Input type="number" min={1000} max={100000000} value={individualUsage} onChange={(e) => setIndividualUsage(Math.max(1000, Math.min(100000000, Number(e.target.value) || 1000)))} disabled={updateLimitsMutation.isPending} className="mt-1 text-sm" placeholder="Type exact value e.g. 500000" />
                  <ResetPeriodInput id="individual" value={tokenReset} onChange={setTokenReset} disabled={updateLimitsMutation.isPending} />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpenIndividual(false)} disabled={updateLimitsMutation.isPending}>Cancel</Button>
                  <Button type="button" onClick={() => handleSave(setOpenIndividual, "Individual limit saved successfully!")} disabled={updateLimitsMutation.isPending}>
                    {updateLimitsMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Organization Pool (not for the public chat organization) */}
            {!isPublicChatOrg && (
            <Dialog open={openOrg} onOpenChange={setOpenOrg}>
              <DialogTrigger asChild>
                <button disabled={!isCustomLimits} className={`bg-card p-5 flex flex-col gap-2 text-left transition-colors ${!isCustomLimits ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"}`}>
                  <span className="text-sm font-medium text-muted-foreground">Organization Pool</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {orgPool.toLocaleString()} <span className="text-sm font-normal text-muted-foreground ml-1">Tokens</span>
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Organization Pool</DialogTitle>
                  <DialogDescription>Adjust the shared token limit for organizations.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Organization Shared Pool</Label>
                    <span className="text-sm font-bold text-blue-600">{orgPool.toLocaleString()}</span>
                  </div>
                  <BlueSlider min={10000} max={100000000} step={1000} value={orgPool} onValueChange={setOrgPool} disabled={updateLimitsMutation.isPending} />
                  <Input type="number" min={10000} max={100000000} value={orgPool} onChange={(e) => setOrgPool(Math.max(10000, Math.min(100000000, Number(e.target.value) || 10000)))} disabled={updateLimitsMutation.isPending} className="mt-1 text-sm" placeholder="Type exact value e.g. 5000000" />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpenOrg(false)} disabled={updateLimitsMutation.isPending}>Cancel</Button>
                  <Button type="button" onClick={() => handleSave(setOpenOrg, "Organization pool limit saved successfully!")} disabled={updateLimitsMutation.isPending}>
                    {updateLimitsMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border flex-1">
            {/* Image Generations */}
            <Dialog open={openImages} onOpenChange={setOpenImages}>
              <DialogTrigger asChild>
                <button disabled={!isCustomLimits} className={`bg-card p-5 flex flex-col gap-2 text-left transition-colors ${!isCustomLimits ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"}`}>
                  <span className="text-sm font-medium text-muted-foreground">Image Generations</span>
                  <span className="text-xl font-bold text-foreground">
                    {images} <span className="text-sm font-normal text-muted-foreground ml-1">Images</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{formatResetPeriod(imageReset)}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Image Limits</DialogTitle>
                  <DialogDescription>Make changes to the Image generation limits.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 py-4">
                  <Label htmlFor="images" className="text-sm font-medium">Image Generations</Label>
                  <Input 
                    id="images" 
                    type="number"
                    min={0}
                    value={images} 
                    onChange={(e) => setImages(Number(e.target.value))} 
                    placeholder="e.g. 20" 
                    disabled={updateLimitsMutation.isPending}
                  />
                  <ResetPeriodInput id="images" value={imageReset} onChange={setImageReset} disabled={updateLimitsMutation.isPending} />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpenImages(false)} disabled={updateLimitsMutation.isPending}>Cancel</Button>
                  <Button type="button" onClick={() => handleSave(setOpenImages, "Image limit saved successfully!")} disabled={updateLimitsMutation.isPending}>
                    {updateLimitsMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* WhatsApp Scheduling */}
            <Dialog open={openWhatsapp} onOpenChange={setOpenWhatsapp}>
              <DialogTrigger asChild>
                <button disabled={!isCustomLimits} className={`bg-card p-5 flex flex-col gap-2 text-left transition-colors ${!isCustomLimits ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/30"}`}>
                  <span className="text-sm font-medium text-muted-foreground">WhatsApp Scheduling</span>
                  <span className="text-xl font-bold text-foreground">
                    {whatsapp} <span className="text-sm font-normal text-muted-foreground ml-1">Messages</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{formatResetPeriod(whatsappReset)}</span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit WhatsApp Limits</DialogTitle>
                  <DialogDescription>Make changes to the WhatsApp Scheduling limits.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-2 py-4">
                  <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp Scheduling</Label>
                  <Input 
                    id="whatsapp" 
                    type="number"
                    min={0}
                    value={whatsapp} 
                    onChange={(e) => setWhatsapp(Number(e.target.value))} 
                    placeholder="e.g. 10" 
                    disabled={updateLimitsMutation.isPending}
                  />
                  <ResetPeriodInput id="whatsapp" value={whatsappReset} onChange={setWhatsappReset} disabled={updateLimitsMutation.isPending} />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpenWhatsapp(false)} disabled={updateLimitsMutation.isPending}>Cancel</Button>
                  <Button type="button" onClick={() => handleSave(setOpenWhatsapp, "WhatsApp limit saved successfully!")} disabled={updateLimitsMutation.isPending}>
                    {updateLimitsMutation.isPending && <Spinner className="w-4 h-4 mr-2" />}
                    Save changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}
