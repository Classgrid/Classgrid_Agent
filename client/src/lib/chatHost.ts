// chat.classgrid.in, or the desktop app (it shows the same chat.classgrid.in screens from this computer)
export const isChatHost = () => import.meta.env.VITE_DESKTOP === "1" || (typeof window !== "undefined" && window.location.hostname.startsWith("chat."));
