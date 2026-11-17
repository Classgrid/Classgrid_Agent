// A person's photo, or the first letter of their name on a plain muted circle (no coloured palette, so the page keeps
// to the theme in light and dark mode). A photo that fails to load falls back to the letter.
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PersonAvatarProps {
  name: string;
  email?: string;
  photoUrl: string | null;
  size?: number;
  className?: string;
}

export function PersonAvatar({ name, email, photoUrl, size = 32, className }: PersonAvatarProps) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [photoUrl]);
  const initial = ((name || email || "").trim().charAt(0) || "?").toUpperCase();
  const style = { width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.4)) };

  if (photoUrl && !broken) {
    return (
      <img
        src={photoUrl}
        alt=""
        onError={() => setBroken(true)}
        style={style}
        className={cn("rounded-full object-cover shrink-0 bg-muted", className)}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={style}
      className={cn("rounded-full bg-muted text-foreground font-semibold flex items-center justify-center shrink-0", className)}
    >
      {initial}
    </div>
  );
}
