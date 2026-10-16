import { AskAiPanel } from "@/components/ai";
import { useCurrentUser } from "@/features/auth/queries/useCurrentUser";

// Project mode: shown inside the normal layout (left sidebar). The middle is the code editor (OpenVSCode Server on
// the sandbox at ide.classgrid.in, which lets in only super admins via their Classgrid login), the right side is the
// AI panel in its overlay layout.
export function ProjectModePage() {
  const { data: currentUser } = useCurrentUser();
  const isSuperAdmin = (currentUser as any)?.role === "super_admin";

  return (
    <div className="h-full flex flex-col !bg-[#fafafa] dark:!bg-[#000000] text-foreground sm:pr-[400px]">
      <div className="shrink-0 flex items-center h-8 box-content py-4 pl-16 pr-4 border-b border-border">{/* same height as the AI panel header, so both lines meet */}
        <span className="text-sm font-medium">Project Mode</span>
      </div>
      {isSuperAdmin ? (
        <iframe src="https://ide.classgrid.in/" title="Code editor" className="flex-1 w-full border-0 [color-scheme:light] dark:[color-scheme:dark]" allow="clipboard-read; clipboard-write" />
      ) : (
        <div className="flex-1" />
      )}
      <AskAiPanel open onOpenChange={() => {}} variant="overlay" />
    </div>
  );
}
