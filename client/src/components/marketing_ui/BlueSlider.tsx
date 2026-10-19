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
import * as React from "react"
import { cn } from "@/lib/utils"

export interface BlueSliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function BlueSlider({ 
  className, 
  min = 0, 
  max = 100, 
  step = 1, 
  value, 
  onValueChange, 
  ...props 
}: BlueSliderProps) {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(Number(e.target.value));
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("relative flex w-full items-center", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        className={cn(
          "w-full h-2 rounded-full appearance-none cursor-pointer outline-none",
          "accent-blue-600 hover:accent-blue-700",
        )}
        style={{
          background: `linear-gradient(to right, #2563eb ${percentage}%, #e2e8f0 ${percentage}%)`,
        }}
        {...props}
      />
    </div>
  )
}
