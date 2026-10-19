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

import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/marketing_ui/nikhil_calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/marketing_ui/select";
import { Clock, Calendar as CalendarIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/marketing_ui/button";

export function DateTimePickerSandbox() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [ampm, setAmpm] = useState("AM");
  
  // Create month and year state
  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());

  // Create arrays for select dropdowns
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  // 100 Years (50 past, 50 future)
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - 50 + i).toString());

  // Handle month/year changes and update calendar date
  const handleMonthChange = (val: string) => {
    setSelectedMonth(val);
    const newDate = new Date(parseInt(selectedYear), parseInt(val), 1);
    setDate(newDate);
  };

  const handleYearChange = (val: string) => {
    setSelectedYear(val);
    const newDate = new Date(parseInt(val), parseInt(selectedMonth), 1);
    setDate(newDate);
  };

  // Calculate the final datetime for display
  const displayString = date 
    ? `${format(date, 'MMM do, yyyy')} at ${hour}:${minute} ${ampm}`
    : "No date selected";

  return (
    <div className="min-h-screen bg-background p-10 flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="z-10 w-full max-w-lg flex flex-col items-center gap-6">
        
        <div className="text-center space-y-2 mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Date & Time</h1>
          <p className="text-muted-foreground">Unified Widget Demo</p>
        </div>

        {/* The Unified Picker Widget */}
        <div className="bg-popover text-popover-foreground border border-border rounded-xl shadow-xl w-fit flex flex-col">
          
          {/* Custom Month/Year Header */}
          <div className="flex items-center gap-2 p-3 pb-0">
            <div className="flex-1">
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-8 border-none bg-accent/50 hover:bg-accent rounded-md text-sm font-semibold">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="h-8 border-none bg-accent/50 hover:bg-accent rounded-md text-sm font-semibold">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="px-3 pb-3">
            <Calendar
              mode="single"
              month={date || new Date()}
              onMonthChange={setDate}
              selected={date}
              fixedWeeks={true}
              showOutsideDays={true}
              onSelect={(d) => {
                if (d) {
                  setDate(d);
                  setSelectedMonth(d.getMonth().toString());
                  setSelectedYear(d.getFullYear().toString());
                }
              }}
              className="bg-transparent p-0 mt-3"
              classNames={{
                months: "bg-transparent",
                month: "bg-transparent",
                caption: "hidden", // Hide original header
              }}
            />
          </div>

          <div className="w-full h-px bg-border/50" />

          {/* Time Picker Section */}
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <Clock size={16} />
              <span>Select Time</span>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex-[2]">
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger className="h-9 border-border bg-background rounded-md text-sm font-medium">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-lg font-bold text-muted-foreground pb-1">:</span>
              <div className="flex-[2]">
                <Select value={minute} onValueChange={setMinute}>
                  <SelectTrigger className="h-9 border-border bg-background rounded-md text-sm font-medium">
                    <SelectValue placeholder="Minute" />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-2" />
              <div className="flex-[2]">
                <Select value={ampm} onValueChange={setAmpm}>
                  <SelectTrigger className="h-9 border-none bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-md text-sm font-bold">
                    <SelectValue placeholder="AM/PM" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AM">AM</SelectItem>
                    <SelectItem value="PM">PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
        </div>

        {/* Output Display */}
        <div className="mt-4 w-[320px]">
          <Button className="w-full h-12 rounded-xl font-semibold shadow-lg flex items-center justify-between px-4" variant="outline">
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-muted-foreground" />
              <span>{displayString}</span>
            </div>
            <ChevronRight size={16} className="opacity-50" />
          </Button>
        </div>

      </div>
    </div>
  );
}

export default DateTimePickerSandbox;
