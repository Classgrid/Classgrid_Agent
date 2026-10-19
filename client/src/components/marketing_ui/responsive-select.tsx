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

import * as React from "react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { NativeSelect, NativeSelectOption } from "./native-select"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"

// Max items to render at once to prevent browser freezing on huge lists
const MAX_VISIBLE_ITEMS = 200

export interface ResponsiveSelectProps
  extends Omit<React.ComponentProps<"select">, "size"> {
  size?: "sm" | "default"
  placeholder?: string
  popDirection?: "up" | "down"
}

export function ResponsiveSelect({
  className,
  size = "default",
  children,
  value,
  onChange,
  disabled,
  placeholder,
  popDirection = "down",
  ...props
}: ResponsiveSelectProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Extract options from children
  const options = React.useMemo(() => {
    const opts: { value: string; label: React.ReactNode; labelStr: string; color?: string }[] = []
    const flattenChildren = (kids: any) => {
      React.Children.forEach(kids, (child) => {
        if (!React.isValidElement<any>(child)) return;
        if (child.type === React.Fragment) {
          flattenChildren(child.props.children);
        } else if (child.props && (child.props.value !== undefined || child.type === "option")) {
          let val = String(child.props.value !== undefined ? child.props.value : child.props.children);
          if (val === "") val = "__empty__";
          const labelText = typeof child.props.children === "string" ? child.props.children : val;
          opts.push({
            value: val,
            label: child.props.children,
            labelStr: labelText,
            color: child.props["data-color"]
          })
        }
      })
    }
    flattenChildren(children)
    return opts
  }, [children])

  const showSearch = options.length > 10
  const isHugeList = options.length > MAX_VISIBLE_ITEMS

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) {
      if (isHugeList) return options.slice(0, MAX_VISIBLE_ITEMS)
      return options
    }
    const lower = search.toLowerCase()
    return options.filter((opt) => opt.labelStr.toLowerCase().includes(lower)).slice(0, MAX_VISIBLE_ITEMS)
  }, [options, search, isHugeList])

  // Reset search on close
  React.useEffect(() => {
    if (!open) setSearch("")
  }, [open])

  // Close dropdown on click outside
  React.useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEsc)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEsc)
    }
  }, [open])

  // Custom Select (Desktop) — ALL dropdowns
  if (isDesktop) {
    let displayValue = value !== undefined ? String(value) : undefined;
    if (displayValue === "") displayValue = "__empty__";
    const selectedOption = options.find((opt) => opt.value === displayValue)

    return (
      <div className="relative w-full">
        <button
          ref={triggerRef}
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-black dark:border-white/10",
            size === "sm" ? "h-7 rounded-md px-2 text-xs" : "h-9",
            className
          )}
        >
          <div className="flex items-center gap-2 text-foreground flex-1 text-left truncate">
            {selectedOption?.color && (
              <span className={`shrink-0 w-2 h-2 rounded-full ${selectedOption.color}`} />
            )}
            <span className="truncate">{selectedOption ? selectedOption.label : (placeholder || "Select...")}</span>
          </div>
          <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-50" />
        </button>

        {/* Dropdown - ALWAYS opens below, NEVER repositions */}
        {open && (
          <div
            ref={dropdownRef}
            className={cn(
              "absolute left-0 z-[1050] min-w-full w-max max-w-[320px] rounded-lg border border-border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 duration-100",
              popDirection === "up" ? "bottom-full mb-1 origin-bottom" : "top-full mt-1 origin-top"
            )}
          >
            {/* Search input */}
            {showSearch && (
              <div className="flex items-center gap-2 border-b border-border/40 px-3 py-2">
                <SearchIcon className="size-4 shrink-0 text-muted-foreground/50" />
                <input
                  type="text"
                  data-no-ring
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isHugeList ? "Type to search..." : "Search..."}
                  autoFocus
                  className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground/50"
                  style={{ outline: "none", boxShadow: "none", border: "none" }}
                />
              </div>
            )}
            {/* Options list */}
            <div className="max-h-60 overflow-y-auto overflow-x-hidden p-1">
              {filteredOptions.length === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">No results found.</div>
              )}
              {filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={cn(
                    "relative flex w-full cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground transition-colors",
                    displayValue === opt.value && "bg-accent/50"
                  )}
                  onClick={() => {
                    if (onChange) {
                      const trueVal = opt.value === "__empty__" ? "" : opt.value;
                      const event = {
                        target: { value: trueVal },
                        currentTarget: { value: trueVal },
                        preventDefault: () => {},
                        stopPropagation: () => {},
                      } as any;
                      onChange(event);
                    }
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {opt.color && <span className={`shrink-0 w-2 h-2 rounded-full ${opt.color}`} />}
                    <span className="whitespace-nowrap truncate">{opt.label}</span>
                  </div>
                  {displayValue === opt.value && (
                    <CheckIcon className="ml-auto h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Native Select (Mobile only)
  return (
    <NativeSelect
      className={className}
      size={size}
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...props}
    >
      {placeholder && (
        <NativeSelectOption value="" disabled>
          {placeholder}
        </NativeSelectOption>
      )}
      {children}
    </NativeSelect>
  )
}
