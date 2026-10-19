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
import React, { useState } from "react";
import { Button } from "@/components/marketing_ui/button";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { NikhilDateCalendar } from "@/components/marketing_ui/nikhil_date_calendar";
import { format } from "date-fns";
import { aiUsageApi } from "../../queries/useAiUsage";

export function ExtendUserGrantedCredits({ userId, currentExpiry }: { userId: string, currentExpiry?: string | null }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    currentExpiry ? new Date(currentExpiry) : undefined
  );
  const queryClient = useQueryClient();

  const handleExtend = async () => {
    if (!selectedDate) {
      toast.error("Please select an end date");
      return;
    }
    setIsLoading(true);
    try {
      await aiUsageApi.extendCredits(userId, selectedDate.toISOString());
      toast.success("Granted credits expiration extended successfully.");
      queryClient.invalidateQueries({ queryKey: ["aiUsage", "user", userId] });
      queryClient.invalidateQueries({ queryKey: ["aiUsage"] });
      queryClient.invalidateQueries({ queryKey: ["ai-usage-user"] });
      setIsOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.error || "Failed to extend credits");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          size="sm"
          variant="outline" 
          onClick={(e) => e.stopPropagation()}
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Extend
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4 bg-card border border-border" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm text-foreground">Extend Expiration</h4>
            <p className="text-xs text-muted-foreground">Select a new expiration date.</p>
          </div>
          
          <div className="w-[280px]">
             <NikhilDateCalendar
               value={selectedDate ? { from: selectedDate, to: selectedDate } : undefined}
               onChange={(val: any) => setSelectedDate(val?.to || val?.from || undefined)}
               placeholder="Select expiration date"
             />
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleExtend} disabled={isLoading || !selectedDate}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Expiry
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
