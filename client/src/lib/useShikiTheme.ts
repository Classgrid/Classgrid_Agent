// The Shiki theme that follows the page's light or dark mode as it changes: code coloured with it is coloured again
// when the mode switches (owner, 2026-11-12: switching modes left the Files tab and the Review diff in the old colours).
import { useEffect, useState } from "react";
import { shikiTheme } from "./shikiCode";

export function useShikiTheme(): "dark-plus" | "light-plus" {
  const [theme, setTheme] = useState(shikiTheme);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setTheme(shikiTheme());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}
