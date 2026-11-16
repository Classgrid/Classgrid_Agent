// The website's own look for menus, top bar buttons and small boxes, used by live docs and published pages so they
// are the same as the chat's (owner, 2026-11-16: "use my standard dropdown, button, all things that the website,
// Studio and Agent mode have"). Word for word from the chat's own menu and boxes
// (components/ai/components/StudioChatMenu.tsx) and the chat's top bar (AskAiPanel.tsx: Share and the three dots).

// ── The dropdown (the chat's three dots menu) ──
export const menuCard = "z-[100] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl data-closed:animate-none";
export const menuItem = "gap-3 py-2 px-3 text-[14px] cursor-pointer hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1] rounded-xl transition-colors";
export const menuIcon = "w-4 h-4 shrink-0 text-slate-500 dark:text-white/70";
export const menuSep = "bg-slate-100 dark:bg-white/10 my-1";
export const menuDanger = `${menuItem} text-[#ef4444] focus:text-[#ef4444] dark:focus:text-[#ef4444] focus:bg-red-50 dark:focus:bg-red-500/10`;
// (a line of small words at the top of a menu: "Updated 3 minutes ago · 11 views")
export const menuNote = "px-3 pt-1.5 pb-2 text-[12.5px] leading-[17px] font-normal text-slate-500 dark:text-white/60 [overflow-wrap:anywhere]";

// ── The top bar (the chat's: an icon button, and a button with words like Share) ──
export const barIcon = "flex items-center justify-center h-8 w-8 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer";
export const barButton = "flex items-center gap-1.5 h-8 px-2.5 shrink-0 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 text-[13px] font-medium transition-colors cursor-pointer disabled:cursor-default disabled:opacity-60";

// ── A small box (the chat's Rename and Archived chats boxes) ──
export const boxCls = "gap-0 p-0 overflow-hidden rounded-xl bg-white dark:!bg-[#1e1e1e] ring-black/10 dark:ring-white/10 shadow-2xl";
export const boxOverlay = "bg-black/50 supports-backdrop-filter:backdrop-blur-none";
export const boxHead = "px-5 pt-4 pb-3";
export const boxTitle = "text-[15px] font-medium [overflow-wrap:anywhere]";
export const boxAbout = "mt-0.5 text-[13px] text-muted-foreground";
export const boxFoot = "flex items-center justify-end gap-2 px-5 py-3 border-t border-black/10 dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1a1a1a]";
export const boxLine = "border-black/10 dark:border-white/[0.08]";
export const boxInput = "w-full h-9 px-3 rounded-md border border-black/10 dark:border-white/[0.08] bg-white dark:bg-[#161616] text-[13px] outline-none focus:border-black/30 dark:focus:border-white/25";
const boxBtn = "inline-flex items-center justify-center gap-1.5 h-8 px-3 shrink-0 rounded-md text-[13px] transition-[background-color,opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100";
export const boxBtnPlain = `${boxBtn} border border-black/10 dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]`;
export const boxBtnMain = `${boxBtn} bg-foreground text-background font-medium hover:opacity-90`;
