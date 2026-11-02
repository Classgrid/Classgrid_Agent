// The tiny script put into every share page, so the page can call window.classgrid.data.get / set / list.
// The page runs in a sandboxed iframe with no access to the app; it only sends postMessage requests and the
// parent page checks them and calls the API.

export const DATA_KEY_RE = /^[A-Za-z0-9_\-:]{1,100}$/;
export const DATA_VALUE_MAX_BYTES = 500 * 1024;

const BRIDGE = `(function(){var n=0,w={};window.addEventListener("message",function(e){var d=e.data;if(e.source!==window.parent||!d||d.__cg!=="res"||!w[d.id])return;var p=w[d.id];delete w[d.id];if(d.ok)p[0](d.value);else p[1](new Error(d.error||"Failed"));});function call(op,key,value){return new Promise(function(res,rej){var id=++n;w[id]=[res,rej];window.parent.postMessage({__cg:"req",id:id,op:op,key:key,value:value},"*");});}window.classgrid={data:{get:function(k){return call("get",k);},set:function(k,v){return call("set",k,v);},list:function(){return call("list");}}};})();`;

/** The page HTML with the bridge script added as the first thing in <head>. */
export function withBridge(html: string) {
  const tag = `<script>${BRIDGE}</script>`;
  const m = html.match(/<head(\s[^>]*)?>/i) || html.match(/<html(\s[^>]*)?>/i) || html.match(/<!doctype[^>]*>/i);
  if (m && m.index !== undefined) {
    const at = m.index + m[0].length;
    return html.slice(0, at) + tag + html.slice(at);
  }
  return tag + html;
}

export type BridgeRequest = { __cg: "req"; id: number; op: "get" | "set" | "list"; key?: string; value?: unknown };

/** Checks a message from the page. Returns the request, or an error text to send back. */
export function readBridgeRequest(data: any): { req?: BridgeRequest; error?: string } | null {
  if (!data || data.__cg !== "req" || typeof data.id !== "number") return null;
  if (data.op === "list") return { req: data };
  if (data.op !== "get" && data.op !== "set") return { error: "Unknown action." };
  if (typeof data.key !== "string" || !DATA_KEY_RE.test(data.key)) return { error: "Key must be 1-100 letters, numbers, _ - or :." };
  if (data.op === "set") {
    let text: string | undefined;
    try { text = JSON.stringify(data.value === undefined ? null : data.value); } catch { return { error: "Value must be plain JSON." }; }
    if (text === undefined || new Blob([text]).size > DATA_VALUE_MAX_BYTES) return { error: "Value is too big (max 500 KB)." };
  }
  return { req: data };
}
