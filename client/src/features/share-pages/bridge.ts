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

// ── Comments at the spot (owner, 2026-11-16) ──
// The page is in a sandboxed frame, so the app can't look inside it. This second script, put into the page too,
// does the looking and tells the app only what a comment needs:
//   app -> page   { __cg: "comments", on, marks: [{ id, quote }], active }   comments on or off, and the open
//                                                                           comments' words to tint and find
//                 { __cg: "print" }                                         open the browser's print box
//   page -> app   { __cg: "pick", quote, x, y }    comments on: the person clicked a part of the page
//                 { __cg: "sel", quote, x, y }     comments off: the person picked some words ("" = no more)
//                 { __cg: "marks", items: [{ id, x, y }] }   where each open comment's words end, on screen
// A click while comments are on is a comment, not a click on the page (the page's own buttons do nothing then).
// (String.raw: the script is kept letter for letter, with its own backslashes)
const COMMENTS = String.raw`(function(){
var on=false,marks=[],active=null,busy=false,hadSel=false;
function say(m){m.__cg=m.t;delete m.t;window.parent.postMessage(m,"*");}
function squash(s){return String(s==null?"":s).replace(/\s+/g," ").trim();}
function words(s){s=squash(s);if(s.length<=240)return s;var h=s.slice(0,240);return h.slice(0,Math.max(h.lastIndexOf(" "),120));}
function find(quote){
  var wanted=String(quote||"").replace(/\s+/g,"");if(!wanted||!document.body)return null;
  var nodes=[],places=[],all="";
  var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  for(var n=w.nextNode();n;n=w.nextNode()){
    var p=n.parentElement;if(p&&/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName))continue;
    var t=n.data;for(var i=0;i<t.length;i++){if(/\s/.test(t[i]))continue;all+=t[i];nodes.push(n);places.push(i);}
  }
  var at=all.indexOf(wanted);if(at<0)return null;var last=at+wanted.length-1;
  var r=document.createRange();r.setStart(nodes[at],places[at]);r.setEnd(nodes[last],places[last]+1);return r;
}
function tint(name,ranges){
  try{if(!window.CSS||!CSS.highlights||!window.Highlight)return;
    if(!ranges.length)CSS.highlights.delete(name);else{var h=new Highlight();for(var i=0;i<ranges.length;i++)h.add(ranges[i]);CSS.highlights.set(name,h);}
  }catch(e){}
}
function report(){
  busy=false;var out=[],plain=[],hot=[];
  for(var i=0;i<marks.length;i++){
    var r=find(marks[i].quote);if(!r)continue;
    var rects=r.getClientRects();var last=rects[rects.length-1];if(!last||(!last.width&&!last.height))continue;
    out.push({id:marks[i].id,x:last.right,y:last.top});
    (marks[i].id===active?hot:plain).push(r);
  }
  tint("cg-comment",plain);tint("cg-comment-active",hot);
  say({t:"marks",items:out});
}
function soon(){if(busy)return;busy=true;(window.requestAnimationFrame||setTimeout)(report);}
function start(){
  var s=document.createElement("style");
  s.textContent="::highlight(cg-comment){background-color:rgba(14,165,233,.2)}::highlight(cg-comment-active){background-color:rgba(14,165,233,.42)}html.cg-commenting,html.cg-commenting *{cursor:pointer!important}";
  (document.head||document.documentElement).appendChild(s);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
window.addEventListener("message",function(e){
  var d=e.data;if(e.source!==window.parent||!d)return;
  if(d.__cg==="print"){try{window.print();}catch(x){}return;}
  if(d.__cg!=="comments")return;
  on=!!d.on;active=d.active||null;marks=Array.isArray(d.marks)?d.marks.slice(0,500):[];
  document.documentElement.classList.toggle("cg-commenting",on);
  soon();
});
function stop(e){if(!on)return;e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();}
window.addEventListener("click",function(e){
  if(!on)return;stop(e);
  var sel=window.getSelection&&window.getSelection();var picked=sel&&!sel.isCollapsed?squash(sel.toString()):"";
  var el=e.target&&e.target.nodeType===1?e.target:null;
  var quote=picked?picked.slice(0,2000):words(el?(el.innerText||el.textContent||el.getAttribute("aria-label")||el.getAttribute("alt")||el.getAttribute("placeholder")||""):"");
  say({t:"pick",quote:quote,x:e.clientX,y:e.clientY});
},true);
["mousedown","mouseup","pointerdown","pointerup","dblclick","submit"].forEach(function(n){window.addEventListener(n,function(e){if(n==="mousedown"||n==="pointerdown"){if(on&&e.detail>1)e.preventDefault();return;}if(n==="mouseup"||n==="pointerup")return;stop(e);},true);});
function selection(){
  if(on)return;
  var sel=window.getSelection&&window.getSelection();var text=sel&&!sel.isCollapsed?squash(sel.toString()):"";
  if(!text){if(hadSel){hadSel=false;say({t:"sel",quote:"",x:0,y:0});}return;}
  var r=sel.getRangeAt(0).getBoundingClientRect();hadSel=true;
  say({t:"sel",quote:text.slice(0,2000),x:r.right,y:r.top});
}
document.addEventListener("mouseup",function(){setTimeout(selection,0);});
document.addEventListener("keyup",function(){setTimeout(selection,0);});
window.addEventListener("scroll",soon,true);
window.addEventListener("resize",soon);
setInterval(function(){if(marks.length)soon();},1500);
})();`;

/** The page HTML with both scripts (saved data, and comments at the spot) as the first things in <head>. */
export function withPageScripts(html: string) {
  return withBridge(withScript(html, COMMENTS));
}
function withScript(html: string, script: string) {
  const tag = `<script>${script}</script>`;
  const m = html.match(/<head(\s[^>]*)?>/i) || html.match(/<html(\s[^>]*)?>/i) || html.match(/<!doctype[^>]*>/i);
  if (m && m.index !== undefined) {
    const at = m.index + m[0].length;
    return html.slice(0, at) + tag + html.slice(at);
  }
  return tag + html;
}

export type PagePoint = { quote: string; x: number; y: number };
export type PageMark = { id: string; x: number; y: number };
export type PageNote =
  | { kind: "pick"; at: PagePoint }
  | { kind: "sel"; at: PagePoint }
  | { kind: "marks"; items: PageMark[] };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Checks a comment message from the page (anything else, or anything odd, is null). */
export function readPageNote(data: unknown): PageNote | null {
  const d = data as { __cg?: unknown; quote?: unknown; x?: unknown; y?: unknown; items?: unknown } | null;
  if (!d || typeof d !== "object") return null;
  if (d.__cg === "pick" || d.__cg === "sel") {
    const x = num(d.x);
    const y = num(d.y);
    if (x === null || y === null || typeof d.quote !== "string") return null;
    return { kind: d.__cg, at: { quote: d.quote.replace(/\s+/g, " ").trim().slice(0, 2000), x, y } };
  }
  if (d.__cg === "marks" && Array.isArray(d.items)) {
    const items: PageMark[] = [];
    for (const raw of d.items.slice(0, 500)) {
      const item = raw as { id?: unknown; x?: unknown; y?: unknown } | null;
      const x = num(item?.x);
      const y = num(item?.y);
      if (item && typeof item.id === "string" && item.id.length <= 64 && x !== null && y !== null) items.push({ id: item.id, x, y });
    }
    return { kind: "marks", items };
  }
  return null;
}
