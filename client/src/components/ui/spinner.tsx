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
import React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

function Spinner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("relative inline-block w-4 h-4 text-current", className)}
      {...props}
    >
      {Array.from({ length: 12 }).map((_, i) => (
        <span
          key={i}
          className="absolute top-0 left-[46%] w-[8%] h-[28%] bg-current rounded-full"
          style={{
            transformOrigin: '50% 178%',
            transform: `rotate(${i * 30}deg)`,
            animation: 'vercel-spinner-fade 1.2s linear infinite',
            animationDelay: `${-1.2 + (i * 0.1)}s`,
          }}
        />
      ))}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vercel-spinner-fade {
          0% { opacity: 1; }
          100% { opacity: 0.15; }
        }
      `}} />
    </div>
  )
}

export { Spinner }
