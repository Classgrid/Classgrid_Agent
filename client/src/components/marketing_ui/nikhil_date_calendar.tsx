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

import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/marketing_ui/nikhil_calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { Clock, ChevronDownIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { cn } from "@/lib/utils";

interface NikhilDateCalendarProps {
  value?: { from?: Date; to?: Date };
  onChange: (date: { from?: Date; to?: Date } | undefined) => void;
  placeholder?: string;
  className?: string;
  popDirection?: "up" | "down" | "left" | "right";
  /** When provided, renders a Creation/Schedule toggle inside the calendar popup */
  dateType?: "createdAt" | "meetingScheduledAt";
  onDateTypeChange?: (type: "createdAt" | "meetingScheduledAt") => void;
  iconOnly?: boolean;
}

function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
  dropdownClassName,
  dropUp = false
}: {
  value: string;
  onValueChange: (val: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  dropUp?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick, true);
    return () => document.removeEventListener("mousedown", onClick, true);
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative w-full text-sm">
      <button
        type="button"
        onMouseDown={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm shadow-sm outline-none transition-colors focus:ring-1 focus:ring-ring",
          className
        )}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDownIcon className="h-4 w-4 opacity-50" />
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-[1000] max-h-56 w-full overflow-auto rounded-md border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
            dropUp ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top",
            dropdownClassName
          )}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-1">
            {options.map((opt) => (
              <div
                key={opt.value}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                  value === opt.value ? "bg-accent/50 text-accent-foreground font-medium" : ""
                )}
              >
                {value === opt.value && (
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                )}
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function NikhilDateCalendar({
  value,
  onChange,
  placeholder = "Pick date",
  className,
  popDirection = "down",
  dateType,
  onDateTypeChange,
  iconOnly,
}: NikhilDateCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickingMode, setPickingMode] = useState<"from" | "to">("from");

  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  const isValidRange = (v: any) => v && (isValidDate(v.from) || isValidDate(v.to));
  const validValue = isValidRange(value) ? value : { from: undefined, to: undefined };

  const [internalDate, setInternalDate] = useState<{from?: Date, to?: Date} | undefined>(validValue);

  useEffect(() => {
    if (isValidRange(value)) { setInternalDate(value as {from?: Date, to?: Date}); }
  }, [value]);

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState((internalDate?.from || new Date()).getMonth().toString());
  const [selectedYear, setSelectedYear] = useState((internalDate?.from || new Date()).getFullYear().toString());

  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
  ];
  const monthOptions = monthNames.map((m, i) => ({ label: m, value: i.toString() }));
  const yearOptions = Array.from({ length: 150 }, (_, i) => { const v = (currentYear - 100 + i).toString(); return { label: v, value: v }; });

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    const newDate = new Date(parseInt(selectedYear), parseInt(val), 1);
    
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    const newDate = new Date(parseInt(val), parseInt(selectedMonth), 1);
    
  };

  const handleApply = () => {
    onChange(internalDate);
    setIsOpen(false);
  };

  const displayString = value?.from ? (value.to ? format(value.from, "MMM d, yyyy") + " - " + format(value.to, "MMM d, yyyy") : format(value.from, "MMM d, yyyy")) : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "justify-start text-left font-normal border-border bg-background hover:bg-accent/50 overflow-hidden",
            !iconOnly && "w-full",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className={cn("h-4 w-4 shrink-0", !iconOnly && "mr-1.5")} />
          {!iconOnly && <span className="truncate min-w-0">{displayString}</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side={popDirection === "up" ? "top" : popDirection === "down" ? "bottom" : popDirection as any}
        sideOffset={8}
        className="w-auto p-0 border-none shadow-2xl rounded-xl bg-transparent z-[1000] nikhil-time-calendar-portal"
      >
        <div
          className="bg-popover text-popover-foreground border border-border rounded-xl shadow-xl w-[320px] flex flex-col"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {onDateTypeChange && (
            <div className="px-3 pt-3 pb-1">
              <div className="flex items-center rounded-lg overflow-hidden border border-border bg-muted/40 text-xs font-semibold">
                <button
                  type="button"
                  onMouseDown={(e) => { e.stopPropagation(); onDateTypeChange("createdAt"); }}
                  className={cn(
                    "flex-1 py-1.5 text-center transition-colors",
                    dateType === "createdAt"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Creation Date
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => { e.stopPropagation(); onDateTypeChange("meetingScheduledAt"); }}
                  className={cn(
                    "flex-1 py-1.5 text-center transition-colors",
                    dateType === "meetingScheduledAt"
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Schedule Date
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 pb-0">
            <div className="flex-1">
              <CustomSelect
                value={selectedMonth}
                onValueChange={handleMonthChange}
                options={monthOptions}
                className="h-8 border-none bg-accent/50 hover:bg-accent font-semibold"
                dropdownClassName="w-40 -ml-2"
              />
            </div>
            <div className="flex-1">
              <CustomSelect
                value={selectedYear}
                onValueChange={handleYearChange}
                options={yearOptions}
                className="h-8 border-none bg-accent/50 hover:bg-accent font-semibold"
                dropdownClassName="w-32"
              />
            </div>
          </div>

          <div className="px-3 pb-3">
            <CalendarComponent
              mode="single"
              month={new Date(parseInt(selectedYear), parseInt(selectedMonth))}
              onMonthChange={(d) => {
                 if (d) {
                    setSelectedMonth(d.getMonth().toString());
                    setSelectedYear(d.getFullYear().toString());
                 }
              }}
              selected={pickingMode === "from" ? internalDate?.from : internalDate?.to}
              disabled={pickingMode === "to" && internalDate?.from ? { before: internalDate.from } : undefined}
              fixedWeeks={true}
              showOutsideDays={true}
              onSelect={(d) => {
                if (!d) return;
                if (pickingMode === "from") {
                  setInternalDate(prev => {
                    const next = { ...prev, from: d };
                    if (next.to && d > next.to) {
                      next.to = undefined;
                    }
                    return next;
                  });
                  setPickingMode("to");
                } else {
                  setInternalDate(prev => ({ ...prev, to: d }));
                }
              }}
              className="bg-transparent p-0 mt-3 flex justify-center"
              classNames={{
                months: "bg-transparent",
                month: "bg-transparent",
                month_caption: "hidden",
                nav: "hidden",
                caption: "hidden",
                table: "w-full border-collapse space-y-1 mx-auto",
              }}
            />
          </div>

          <div className="px-3 pt-3 border-t border-border flex gap-2 pb-3">
             <button 
               type="button"
               onClick={() => setPickingMode("from")}
               className={cn("flex-1 p-2 border rounded-md text-sm text-center transition-colors outline-none", pickingMode === "from" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted")}
             >
               <div className="text-[10px] uppercase font-bold tracking-wider mb-1">Start Date</div>
               <div className="font-semibold text-foreground">{internalDate?.from ? format(internalDate.from, "MMM d, yyyy") : "-"}</div>
             </button>
             <button 
               type="button"
               onClick={() => setPickingMode("to")}
               className={cn("flex-1 p-2 border rounded-md text-sm text-center transition-colors outline-none", pickingMode === "to" ? "border-emerald-500 bg-emerald-500/10 text-emerald-500" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted")}
             >
               <div className="text-[10px] uppercase font-bold tracking-wider mb-1">End Date</div>
               <div className="font-semibold text-foreground">{internalDate?.to ? format(internalDate.to, "MMM d, yyyy") : "-"}</div>
             </button>
          </div>

          <div className="p-3 bg-muted/20 border-t border-border rounded-b-xl">
            <Button
              type="button"
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium"
              onClick={handleApply}
            >
              Apply Date
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
