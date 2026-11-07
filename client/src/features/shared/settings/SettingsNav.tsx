// Settings' own left sidebar (instead of the app's menu while Settings is open): a search box and the sections, one
// per row
import { useState } from "react";
import { Search } from "lucide-react";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/marketing_ui/sidebar";
import { useUserProfile } from "@/features/shared/queries/useUserProfile";
import { settingsSections, useSettingsSection } from "./settingsSections";

export function SettingsNav() {
  const { data: profile } = useUserProfile();
  const sections = settingsSections({ role: profile?.role });
  const { section, go } = useSettingsSection(sections);
  const [q, setQ] = useState("");
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = sections.filter((s) => words.every((w) => `${s.label} ${s.words}`.toLowerCase().includes(w)));

  // (no back button or title of its own: the back arrow leaves Settings and the page's top bar says "Settings"; the
  // search box is hidden while the sidebar is folded to icons)
  return (
    <div className="flex flex-col gap-2 px-2 pt-1">
      <div className="relative group-data-[collapsible=icon]:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          aria-label="Search settings"
          className="w-full h-9 pl-9 pr-3 rounded-full bg-sidebar-accent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>
      <SidebarMenu className="mt-1">
        {shown.map((s) => (
          <SidebarMenuItem key={s.id}>
            <SidebarMenuButton
              isActive={s.id === section}
              onClick={() => go(s.id)}
              className="cursor-pointer"
              render={
                <div className="flex items-center gap-3 w-full">
                  <s.icon className="size-[18px] shrink-0" />
                  <span className="truncate">{s.label}</span>
                </div>
              }
            />
          </SidebarMenuItem>
        ))}
        {!shown.length && <p className="px-2 py-2 text-xs text-muted-foreground">No settings match "{q}"</p>}
      </SidebarMenu>
    </div>
  );
}
