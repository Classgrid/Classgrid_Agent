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
import { useState } from "react";
import { Info, Check, X, Clock, CalendarDays, Rocket } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";

interface ViewGrantedCreditsDetailsProps {
  used: number;
  limit: number;
  history: Array<{
    id: string;
    type: string;
    credits_added: number;
    status: string;
    date: string;
    metadata: any;
  }>;
}

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' 
  });
};

export function ViewGrantedCreditsDetails({ used, limit, history }: ViewGrantedCreditsDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getTimelineSteps = () => {
    if (!history || history.length === 0) return { steps: [], currentStep: 0 };

    const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const isExhausted = used >= limit;
    const isCurrentlyPaused = sortedHistory.length > 0 && sortedHistory[sortedHistory.length - 1].type === "paused";
    const isRevoked = sortedHistory.length > 0 && sortedHistory.some(s => s.type === "revoked");

    const generatedSteps = [];

    // Step 1: Grant
    const grantEvent = sortedHistory.find(h => h.type === "granted");
    if (grantEvent) {
      generatedSteps.push({
        id: "granted",
        title: "Granted",
        description: formatDateTime(grantEvent.date),
        isCompleted: true,
        isActive: false,
      });
    } else {
      generatedSteps.push({
        id: "granted",
        title: "Granted",
        description: "Initial Grant",
        isCompleted: true,
        isActive: false,
      });
    }

    // Middle Steps
    const middleEvents = sortedHistory.filter(h => h.type !== "granted");
    for (const event of middleEvents) {
      generatedSteps.push({
        id: event.id,
        title: event.type === "paused" ? "Paused" : event.type === "resumed" ? "Resumed" : event.type === "revoked" ? "Revoked" : event.type === "extended" ? "Extended" : event.type,
        description: formatDateTime(event.date),
        isCompleted: true,
        isActive: false,
      });
    }

    // Final Status Step
    if (!isRevoked) {
      if (isExhausted) {
        generatedSteps.push({
          id: "exhausted",
          title: "Exhausted",
          description: "All credits used",
          isCompleted: false,
          isActive: true,
        });
      } else if (isCurrentlyPaused) {
        const last = generatedSteps.filter(s => s.title === "Paused").pop();
        if (last) {
           last.isActive = true;
           last.isCompleted = false;
        }
        generatedSteps.push({
          id: "expiration",
          title: "Expiration",
          description: "Pending",
          isCompleted: false,
          isActive: false,
        });
      } else {
        generatedSteps.push({
          id: "active",
          title: "Active",
          description: "Consuming credits",
          isCompleted: false,
          isActive: true,
        });
        generatedSteps.push({
          id: "expiration",
          title: "Expiration",
          description: "Pending",
          isCompleted: false,
          isActive: false,
        });
      }
    }

    const activeIndex = generatedSteps.findIndex(s => s.isActive);
    const currentStep = activeIndex !== -1 ? activeIndex : generatedSteps.length;

    return {
      steps: generatedSteps.map(s => ({ ...s })),
      currentStep
    };
  };

  const timeline = getTimelineSteps();
  const totalSteps = timeline.steps.length;
  const progressPercentage = totalSteps > 1 ? Math.min(100, Math.max(0, (timeline.currentStep / (totalSteps - 1)) * 100)) : 100;

  return (
    <>
      <Button variant="outline" size="sm" className="h-8" onClick={() => setIsOpen(true)}>
        <Info className="w-4 h-4 mr-2" />
        Details
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-10">
          {/* Backdrop - NO BLUR */}
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Main Card */}
          <div className="relative w-full max-w-6xl bg-background border border-border shadow-2xl rounded-lg flex flex-col">
            
            {/* Header matching the Pipeline screenshot */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-border bg-background rounded-t-lg">
              <div className="flex items-center gap-2">
                <Rocket className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground tracking-tight">Audit Timeline</h2>
                <span className="text-muted-foreground text-xs ml-2">·</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {timeline.currentStep} of {totalSteps} completed
                </span>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-muted" onClick={() => setIsOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Stepper Content Area */}
            <div className="p-10 pt-16 pb-16 bg-background flex flex-col w-full overflow-x-auto">
              {(!history || history.length === 0) ? (
                <div className="text-sm text-muted-foreground italic bg-muted/10 p-4 rounded-lg border border-border/30 text-center">
                  No timeline records found.
                </div>
              ) : (
                <div className="flex items-start w-full min-w-[700px] justify-between relative px-8">
                  {timeline.steps.map((step, index) => {
                    const isCompleted = index < timeline.currentStep;
                    const isActive = index === timeline.currentStep;
                    const isNextCompleted = (index + 1) < timeline.currentStep;
                    
                    return (
                      <div key={index} className="flex flex-col items-center relative flex-1">
                        
                        {/* Connecting Line (drawn to the right of the current node, except for the last node) */}
                        {index !== totalSteps - 1 && (
                          <div className="absolute top-5 left-[50%] right-[-50%] h-[2px] z-0">
                             {/* Base inactive line */}
                             <div className="absolute inset-0 bg-border/40" />
                             {/* Active overlay line */}
                             <div className={`absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-700 ${isCompleted ? 'w-full' : 'w-0'}`} />
                          </div>
                        )}

                        {/* Node Circle */}
                        <div 
                          className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-background transition-colors duration-300
                            ${isCompleted 
                              ? "bg-foreground border-foreground text-background" 
                              : isActive 
                                ? "border-foreground text-foreground shadow-[0_0_0_4px_rgba(255,255,255,0.05)] dark:shadow-[0_0_0_4px_rgba(0,0,0,0.2)]" 
                                : "border-border text-muted-foreground"}
                          `}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 stroke-[3]" />
                          ) : (
                            <span className="text-sm font-semibold">{index + 1}</span>
                          )}
                        </div>

                        {/* Title & Description */}
                        <div className="mt-4 flex flex-col items-center text-center max-w-[120px]">
                          <span className={`text-sm font-medium
                            ${isActive || isCompleted ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {step.title}
                          </span>
                          {step.description && (
                            <span className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              {step.description}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Progress Bar area */}
            <div className="p-4 px-6 border-t border-border bg-background rounded-b-lg flex items-center gap-4">
              <div className="h-1.5 w-full bg-border/40 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-foreground transition-all duration-1000" 
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground w-8 text-right">
                {Math.round(progressPercentage)}%
              </span>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
