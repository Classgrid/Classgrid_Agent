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
import { useUpdateOrgAiLimits } from "@/features/superadmin/queries/useAiUsage";

export interface SetupUsageCreditsProps {
  orgId: string;
  orgName: string;
  currentPoolLimit: number;
  currentUserWeeklyLimit: number;
  currentImageLimit?: number;
  currentWhatsappLimit?: number;
  customLimitsEnabled?: boolean;
}

export function SetupUsageCredits({ orgId, orgName, currentPoolLimit, currentUserWeeklyLimit, currentImageLimit, currentWhatsappLimit, customLimitsEnabled }: SetupUsageCreditsProps) {
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

  // Loading States
  const [openIndividual, setOpenIndividual] = useState(false);
  const [openOrg, setOpenOrg] = useState(false);
  const [openImages, setOpenImages] = useState(false);
  const [openWhatsapp, setOpenWhatsapp] = useState(false);

  React.useEffect(() => { if (!openIndividual) setIndividualUsage(currentUserWeeklyLimit ?? 0); }, [openIndividual, currentUserWeeklyLimit]);
  React.useEffect(() => { if (!openOrg) setOrgPool(currentPoolLimit ?? 0); }, [openOrg, currentPoolLimit]);
  React.useEffect(() => { if (!openImages) setImages(currentImageLimit ?? 0); }, [openImages, currentImageLimit]);
  React.useEffect(() => { if (!openWhatsapp) setWhatsapp(currentWhatsappLimit ?? 0); }, [openWhatsapp, currentWhatsappLimit]);

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
         whatsapp_scheduling_limit: whatsapp
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
                  <span className="text-sm font-medium text-muted-foreground">Individual Weekly Usage</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                    {individualUsage.toLocaleString()} <span className="text-sm font-normal text-muted-foreground ml-1">Tokens</span>
                  </span>
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Individual Limit</DialogTitle>
                  <DialogDescription>Adjust the 7-day token limit for individuals.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3 py-4">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-semibold">Individual 7-Day Usage</Label>
                    <span className="text-sm font-bold text-blue-600">{individualUsage.toLocaleString()}</span>
                  </div>
                  <BlueSlider min={1000} max={100000000} step={1000} value={individualUsage} onValueChange={setIndividualUsage} disabled={updateLimitsMutation.isPending} />
                  <Input type="number" min={1000} max={100000000} value={individualUsage} onChange={(e) => setIndividualUsage(Math.max(1000, Math.min(100000000, Number(e.target.value) || 1000)))} disabled={updateLimitsMutation.isPending} className="mt-1 text-sm" placeholder="Type exact value e.g. 500000" />
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
