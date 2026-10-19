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
import { Calendar } from "@/components/marketing_ui/nikhil_calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/marketing_ui/popover";
import { Clock, Calendar as CalendarIcon, ChevronDownIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";
import { cn } from "@/lib/utils";

interface NikhilTimeCalendarProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  popDirection?: "up" | "down" | "left" | "right";
  showTime?: boolean;
  /** When provided, renders a Creation/Schedule toggle inside the calendar popup */
  dateType?: "createdAt" | "meetingScheduledAt";
  onDateTypeChange?: (type: "createdAt" | "meetingScheduledAt") => void;
}

// Completely custom Select component that perfectly matches the styling
// but uses absolutely zero portals, guaranteeing no Base UI / Radix conflicts
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
    // Use capture phase to ensure we close before other listeners fire
    document.addEventListener("mousedown", onClick, true);
    return () => document.removeEventListener("mousedown", onClick, true);
  }, [open]);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative w-full text-sm">
      <button
        type="button"
        onMouseDown={(e) => {
          e.stopPropagation(); // Don't bubble to Popover
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
          // Prevent click inside dropdown from bubbling
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

export function NikhilTimeCalendar({
  value,
  onChange,
  placeholder = "Pick date & time",
  className,
  popDirection = "down",
  showTime = true,
  dateType,
  onDateTypeChange,
}: NikhilTimeCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isValidDate = (d: any) => d instanceof Date && !isNaN(d.getTime());
  const validValue = isValidDate(value) ? value : undefined;

  const [internalDate, setInternalDate] = useState<Date | undefined>(validValue);
  const [hour, setHour] = useState(validValue ? format(validValue, "hh") : "10");
  const [minute, setMinute] = useState(validValue ? format(validValue, "mm") : "00");
  const [ampm, setAmpm] = useState(validValue ? format(validValue, "a") : "AM");

  // Keep internal state synced if value changes externally
  useEffect(() => {
    if (isValidDate(value)) {
      const validVal = value as Date;
      setInternalDate(validVal);
      setHour(format(validVal, "hh"));
      setMinute(format(validVal, "mm"));
      setAmpm(format(validVal, "a"));
    }
  }, [value]);

  // Create month and year state
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState((internalDate || new Date()).getMonth().toString());
  const [selectedYear, setSelectedYear] = useState((internalDate || new Date()).getFullYear().toString());

  // Create options for dropdowns
  const hourOptions = Array.from({ length: 12 }, (_, i) => {
    const v = (i + 1).toString().padStart(2, "0");
    return { label: v, value: v };
  });

  const minuteOptions = Array.from({ length: 60 }, (_, i) => {
    const v = i.toString().padStart(2, "0");
    return { label: v, value: v };
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December",
  ];
  const monthOptions = monthNames.map((m, i) => ({ label: m, value: i.toString() }));

  const yearOptions = Array.from({ length: 150 }, (_, i) => { const v = (currentYear - 100 + i).toString(); return { label: v, value: v }; });

  const ampmOptions = [
    { label: "AM", value: "AM" },
    { label: "PM", value: "PM" }
  ];

  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    const newDate = new Date(parseInt(selectedYear), parseInt(val), 1);
    setInternalDate(newDate);
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    const newDate = new Date(parseInt(val), parseInt(selectedMonth), 1);
    setInternalDate(newDate);
  };

  const handleApply = () => {
    const baseDate = internalDate || new Date();
    const finalDate = new Date(baseDate);
    if (showTime) {
      let h = parseInt(hour);
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      finalDate.setHours(h);
      finalDate.setMinutes(parseInt(minute));
      finalDate.setSeconds(0);
      finalDate.setMilliseconds(0);
    } else {
      finalDate.setHours(0, 0, 0, 0);
    }
    onChange(finalDate);
    setIsOpen(false);
  };

  const displayString = isValidDate(value)
    ? showTime
      ? `${format(value as Date, "MMM do, yyyy")} at ${format(value as Date, "hh:mm a")}`
      : format(value as Date, "MMM do, yyyy")
    : placeholder;

  return (
    <Popover open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal border-border bg-background hover:bg-accent/50 overflow-hidden",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-1.5 h-4 w-4 shrink-0" />
          <span className="truncate min-w-0">{displayString}</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side={popDirection === "up" ? "top" : popDirection === "down" ? "bottom" : popDirection as any}
        sideOffset={8}
        className="w-auto p-0 border-none shadow-2xl rounded-xl bg-transparent z-[1000] nikhil-time-calendar-portal"
      >
        <div
          // Removed overflow-hidden so our custom dropdowns can pop out seamlessly!
          className="bg-popover text-popover-foreground border border-border rounded-xl shadow-xl w-[320px] flex flex-col"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Date Type Toggle — only shown when parent passes dateType props */}
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

          {/* Custom Month/Year Header */}
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

          {/* Calendar Section */}
          <div className="px-3 pb-3">
            <Calendar
              mode="single"
              month={internalDate || new Date()}
              onMonthChange={setInternalDate}
              selected={internalDate}
              fixedWeeks={true}
              showOutsideDays={true}
              onSelect={(d) => {
                if (d) {
                  setInternalDate(d);
                  setSelectedMonth(d.getMonth().toString());
                  setSelectedYear(d.getFullYear().toString());
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

          {/* Time Picker Section — only when showTime is true */}
          {showTime && (
            <>
              <div className="w-full h-px bg-border/50" />
              <div className="p-4 flex flex-col gap-3 bg-muted/20">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <Clock size={16} />
                  <span>Select Time</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-[2]">
                    <CustomSelect
                      value={hour}
                      onValueChange={setHour}
                      options={hourOptions}
                      className="h-9 border-border bg-background font-medium"
                      dropUp={true}
                    />
                  </div>
                  <span className="text-lg font-bold text-muted-foreground pb-1">:</span>
                  <div className="flex-[2]">
                    <CustomSelect
                      value={minute}
                      onValueChange={setMinute}
                      options={minuteOptions}
                      className="h-9 border-border bg-background font-medium"
                      dropUp={true}
                    />
                  </div>
                  <div className="w-2" />
                  <div className="flex-[2]">
                    <CustomSelect
                      value={ampm}
                      onValueChange={setAmpm}
                      options={ampmOptions}
                      className="h-9 border-none bg-emerald-500/10 text-emerald-500 font-bold hover:bg-emerald-500/20"
                      dropUp={true}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <div className="p-3 bg-muted/20 border-t border-border rounded-b-xl">
            <Button
              type="button"
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium"
              onClick={handleApply}
            >
              {showTime ? "Apply Date & Time" : "Apply Date"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

