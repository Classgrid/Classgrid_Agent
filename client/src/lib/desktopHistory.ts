// Desktop app only: the sidebar's back and forward arrows count every place the user goes.
// The router numbers each place (history.state.idx), and the arrows read that number. But opening a chat from the
// chat menu, a payment return and a few other spots set the URL with history.pushState / replaceState straight, with
// an empty state, which wiped the number: from then on the arrows thought there was nothing to go back to.
// This keeps the number on those calls too (a new one for pushState, the same one for replaceState) and tells the
// sidebar ("cg:history") so the arrows update at once.
export function installDesktopHistory() {
  if (import.meta.env.VITE_DESKTOP !== "1" || typeof window === "undefined") return;
  const h = window.history;
  const push = h.pushState.bind(h);
  const replace = h.replaceState.bind(h);
  const idxOf = () => (typeof h.state?.idx === "number" ? h.state.idx : 0);
  const newKey = () => Math.random().toString(36).slice(2, 10);
  const tell = (type: "push" | "replace") => window.dispatchEvent(new CustomEvent("cg:history", { detail: { type, idx: idxOf() } }));
  h.pushState = (state: any, title: string, url?: string | URL | null) => {
    const s = state && typeof state === "object" ? state : {};
    push(typeof s.idx === "number" ? s : { usr: null, key: newKey(), ...s, idx: idxOf() + 1 }, title, url);
    tell("push");
  };
  h.replaceState = (state: any, title: string, url?: string | URL | null) => {
    const s = state && typeof state === "object" ? state : {};
    replace(typeof s.idx === "number" ? s : { usr: null, key: h.state?.key ?? newKey(), ...s, idx: idxOf() }, title, url);
    tell("replace");
  };
}
