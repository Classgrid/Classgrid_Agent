// The "/" commands of the chat box (Project Mode and Studio): typed at the start of a message, sent as body.command
import { motion, AnimatePresence } from "framer-motion";
import { CalendarClock, Globe, GraduationCap, LayoutGrid, ListChecks, MessageCircleQuestion, Minimize2, Puzzle, Target, Users, Zap, type LucideIcon } from "lucide-react";
import { cn } from "../utils";

export type SlashCommand = { id: string; description: string; icon: LucideIcon; studioOnly?: boolean };

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: "plan", description: "Plan first, build after you approve", icon: ListChecks },
  { id: "goal", description: "Keep working until it is done", icon: Target },
  { id: "schedule", description: "Make a schedule or reminder", icon: CalendarClock },
  { id: "browser", description: "Use the live browser", icon: Globe, studioOnly: true },
  { id: "generative_ui", description: "Answer with interactive cards", icon: LayoutGrid },
  { id: "grill-me", description: "Ask me questions before starting", icon: MessageCircleQuestion },
  { id: "plugin", description: "Open plugins", icon: Puzzle },
  { id: "teamwork", description: "Split the job across helpers", icon: Users },
  { id: "boost", description: "Think harder for this message", icon: Zap },
  { id: "learn", description: "Save this as a skill for future chats", icon: GraduationCap },
  { id: "compact", description: "Shrink the chat memory now", icon: Minimize2 },
];

export const slashCommandsFor = (inStudio: boolean, query: string) =>
  SLASH_COMMANDS.filter((c) => (inStudio || !c.studioOnly) && c.id.includes(query.toLowerCase()));

// The command a message starts with ("/plan fix the header" -> "plan"), or undefined
export function leadingSlashCommand(text: string, inStudio: boolean): string | undefined {
  const m = /^\/([a-z_-]+)(?=\s|$)/.exec(text.trimStart());
  return m && m[1] !== "plugin" && SLASH_COMMANDS.some((c) => c.id === m[1] && (inStudio || !c.studioOnly)) ? m[1] : undefined;
}

// The popover, drawn like the "@" menu (above the chat box, or below it in the empty chat)
export function SlashCommandMenu({ open, items, selectedIndex, onHover, onPick, below }: {
  open: boolean;
  items: SlashCommand[];
  selectedIndex: number;
  onHover: (index: number) => void;
  onPick: (command: SlashCommand) => void;
  below?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: below ? -10 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: below ? -10 : 10 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute left-0 w-full overflow-y-auto bg-popover rounded-2xl border border-border shadow-2xl z-50 flex flex-col p-1.5",
            below ? "top-[100%] mt-2 max-h-[160px] custom-scrollbar" : "bottom-[100%] mb-2 max-h-[350px]"
          )}
        >
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(item)}
                onMouseEnter={() => onHover(index)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-colors",
                  index === selectedIndex ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <Icon className="w-5 h-5 text-popover-foreground/70 shrink-0" />
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[14px] text-popover-foreground font-medium whitespace-nowrap">/{item.id}</span>
                  <span className="text-[14px] text-muted-foreground truncate">{item.description}</span>
                </div>
              </button>
            );
          })}
          {items.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">No results found</div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
