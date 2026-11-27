// Classgrid added from Zoom's side (Zoom App Marketplace "Add", or the app's install link). Zoom sends the person back
// to the server with no Classgrid account attached, so the server holds the Zoom sign-in for 15 minutes and sends the
// person here with ?zoom_install=<id> (server/src/routes/zoom.routes.js). The id is kept until the person is signed
// in (already, or after signing in or up), then given to POST /api/zoom/claim, which makes it this account's Zoom
// connection. Nothing is shown: Zoom then shows as connected in Plugins.
import { apiClient } from "@/lib/apiClient";

const KEY = "cg_zoom_install";
const HOLD_MS = 15 * 60 * 1000;

type Pending = { id: string; at: number };

const read = (): Pending | null => {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || "null");
    return p && typeof p.id === "string" && typeof p.at === "number" ? p : null;
  } catch {
    return null;
  }
};
const forget = () => { try { localStorage.removeItem(KEY); } catch { /* storage blocked */ } };
const signedIn = () => {
  try {
    const t = localStorage.getItem("token");
    return !!t && t !== "null";
  } catch {
    return false;
  }
};

/** Keeps a ?zoom_install= id from the address (and takes it out of the address), then claims it once signed in. */
export function watchZoomInstall() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("zoom_install");
  if (id) {
    try { localStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() })); } catch { /* storage blocked */ }
    params.delete("zoom_install");
    const rest = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
  }
  if (!read()) return;

  let busy = false;
  const tick = async () => {
    const p = read();
    if (!p || Date.now() - p.at > HOLD_MS) { forget(); clearInterval(timer); return; }
    if (busy || !signedIn()) return;
    busy = true;
    try {
      await apiClient.post("/api/zoom/claim", { installId: p.id });
      forget();
      clearInterval(timer);
      try { localStorage.setItem("integration_callback", JSON.stringify({ type: "integration_success", provider: "zoom", timestamp: Date.now() })); } catch { /* storage blocked */ }
    } catch (e: any) {
      const status = e?.response?.status;
      // used, expired or not valid: nothing more to claim. A sign-in that is not finished (401) or a network
      // problem is tried again on the next tick.
      if (status === 400 || status === 404) { forget(); clearInterval(timer); }
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(tick, 2000);
  void tick();
}
