// A small menu to pick one of a few choices, each with a line saying what it means (a person's role on a doc, who
// can open it). It opens above a dialog too (the UI kit's own menu sits under dialogs), so the Share box uses it.
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { boxLine, menuCard, menuSep } from "./docLook";

export type PickChoice<T extends string> = {
  value: T;
  name: string;
  /** What picking it means, under the name. */
  about?: string;
  /** Shown in red, after a line (Remove). */
  danger?: boolean;
};

export function PickMenu<T extends string>({ label, value, shown, choices, onPick, disabled, align = "end", quiet, className }: {
  /** For screen readers: what is being picked. */
  label: string;
  value: T | null;
  /** The words on the button (the picked choice's name when left out). */
  shown?: string;
  choices: PickChoice<T>[];
  onPick: (value: T) => void;
  disabled?: boolean;
  align?: "start" | "end";
  /** The button has no background until hovered (inside a line of text). */
  quiet?: boolean;
  /** More classes for the button (the Docs list's kind filter matches its search box). */
  className?: string;
}) {
  const picked = choices.find((c) => c.value === value);
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        disabled={disabled}
        className={cn(
          "inline-flex h-8 max-w-full shrink-0 cursor-pointer items-center gap-1 rounded-md text-[13px] font-medium text-foreground outline-none transition-colors hover:bg-black/[0.04] focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60 data-[popup-open]:bg-black/[0.04] dark:hover:bg-white/[0.05] dark:data-[popup-open]:bg-white/[0.05]",
          quiet ? "-ml-2 px-2" : cn("border pl-2.5 pr-2", boxLine),
          className,
        )}
      >
        <span className="[overflow-wrap:anywhere]">{shown ?? picked?.name ?? ""}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align={align} side="bottom" sideOffset={6} className="isolate z-[10010] outline-none">
          <Menu.Popup className={cn("w-[min(280px,calc(100vw-24px))] origin-(--transform-origin) outline-none", menuCard)}>
            {choices.map((choice) => (
              <div key={choice.value}>
                {choice.danger && <div className={cn("-mx-2 h-px", menuSep)} />}
                <Menu.Item
                  onClick={() => onPick(choice.value)}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl px-3 py-2 text-left outline-none select-none transition-colors data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-[#343541]",
                    choice.danger && "text-[#ef4444] data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-500/10",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] leading-5">{choice.name}</span>
                    {choice.about && <span className="mt-0.5 block text-[12.5px] leading-[17px] text-slate-500 dark:text-white/60">{choice.about}</span>}
                  </span>
                  {choice.value === value && <Check aria-hidden className="mt-0.5 size-4 shrink-0" />}
                </Menu.Item>
              </div>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
