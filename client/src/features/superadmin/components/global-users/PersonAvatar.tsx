// A person's picture, or the first letter of their name (or email) when there is no picture or it fails to load.
// "sm" is the list size (32px), "xl" the person page header.
import { Avatar, AvatarFallback, AvatarImage } from "@/components/marketing_ui/avatar";
import { cn } from "@/lib/utils";

export function PersonAvatar({ name, email, src, size = "sm" }: { name?: string | null; email?: string | null; src?: string | null; size?: "sm" | "xl" }) {
  const letter = ((name || "").trim()[0] || (email || "").trim()[0] || "?").toUpperCase();
  return (
    <Avatar className={cn(size === "xl" ? "size-16" : "size-8")}>
      {src && <AvatarImage src={src} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className={cn("font-medium text-foreground", size === "xl" ? "text-xl" : "text-xs")}>{letter}</AvatarFallback>
    </Avatar>
  );
}
