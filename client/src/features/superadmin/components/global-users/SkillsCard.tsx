// The skills the person saved for their AI (owner, 2026-11-17: "show AI saved skills, memories, everything of the
// user"): each skill's name, whether it is on, when it was saved, and its full instructions. Memories are kept by the
// desktop app on the person's own computer, not on Classgrid's servers, so there are none to show here; the card says so.
import { Sparkles } from "lucide-react";
import { Badge } from "@/components/marketing_ui/badge";
import { SectionCard } from "./SectionCard";
import { dateText } from "./format";
import type { PersonOverview } from "./types";

export function SkillsCard({ skills }: { skills: PersonOverview["skills"] }) {
  const list = skills || [];
  return (
    <SectionCard icon={Sparkles} title="AI skills and memory" note="What they taught their AI.">
      {skills === null ? (
        <p className="text-sm text-muted-foreground">Couldn&apos;t read their skills right now.</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved skills.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {list.map((k) => (
            <li key={k._id} className="py-3 first:pt-0 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground break-words">{k.name || "Skill"}</span>
                <Badge variant={k.active ? "outline" : "neutral"}>{k.active ? "On" : "Off"}</Badge>
                {k.isDefault && <Badge variant="neutral">Default</Badge>}
                {(k.updatedAt || k.createdAt) && <span className="text-xs text-muted-foreground">{`Saved ${dateText(k.updatedAt || k.createdAt)}`}</span>}
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap break-words">{k.instructions}</p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
        Memories are saved by the desktop app on their own computer, so Classgrid&apos;s servers don&apos;t have them.
      </p>
    </SectionCard>
  );
}
