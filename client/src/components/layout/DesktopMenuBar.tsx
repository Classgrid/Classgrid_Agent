// Desktop app: a File / Edit / View … menu in the app's top bar, like Cursor. Project Mode shows the code editor's own
// menu (each item runs the same VS Code command inside the editor); Studio Mode shows Studio's own actions.
import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarShortcut, MenubarTrigger } from "@/components/marketing_ui/menubar";

// The Edit menu acts on the box the user was typing in (opening the menu takes the focus away from it)
let lastTyping: HTMLElement | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("focusin", (e) => {
    const t = e.target as HTMLElement | null;
    if (t?.matches?.("input, textarea, [contenteditable]:not([contenteditable='false'])")) lastTyping = t;
  });
}
export function editAction(action: "undo" | "redo" | "cut" | "copy" | "paste" | "selectAll") {
  setTimeout(() => {
    if (lastTyping?.isConnected) lastTyping.focus();
    (window as any).classgridDesktop?.edit?.(action);
  }, 80);
}

export type MenuEntry = { label: string; keys?: string; run: () => void } | "-";
export type MenuSpec = { label: string; items: MenuEntry[] };

export function DesktopMenuBar({ menus }: { menus: MenuSpec[] }) {
  return (
    <Menubar className="shrink-0 h-8 gap-0 border-0 bg-transparent p-0">
      {menus.map((m) => (
        <MenubarMenu key={m.label}>
          <MenubarTrigger className="h-7 px-2 text-[13px] font-normal text-muted-foreground hover:text-foreground aria-expanded:text-foreground">{m.label}</MenubarTrigger>
          {/* The same colours as Studio's ⋯ menu (StudioChatMenu), not black */}
          <MenubarContent className="w-auto min-w-[260px] bg-white dark:bg-[#202123] text-slate-700 dark:text-[#ececf1] ring-0 border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-2xl">
            {m.items.map((it, i) =>
              it === "-" ? (
                <MenubarSeparator key={i} className="dark:bg-white/10" />
              ) : (
                <MenubarItem key={i} onClick={it.run} className="px-3 py-1.5 text-[13px] rounded-xl hover:bg-slate-100 dark:hover:bg-[#343541] focus:bg-slate-100 dark:focus:bg-[#343541] focus:text-slate-900 dark:focus:text-[#ececf1]">
                  {it.label}
                  {it.keys && <MenubarShortcut className="pl-8 tracking-normal text-slate-500 dark:text-[#8e8ea0]">{it.keys}</MenubarShortcut>}
                </MenubarItem>
              ),
            )}
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  );
}

// The built-in code editor's menu, the same as VS Code's (run: sends the command to the editor). Open Folder uses
// Windows' own folder picker (openFolder) and opens the folder as a Project Mode project.
export function editorMenus(run: (command: string) => void, openFolder: () => void): MenuSpec[] {
  const c = (label: string, command: string, keys?: string): MenuEntry => ({ label, keys, run: () => run(command) });
  return [
    { label: "File", items: [
      c("New Text File", "workbench.action.files.newUntitledFile", "Ctrl+N"),
      c("New File...", "welcome.showNewFileEntries"),
      c("New Window", "workbench.action.newWindow"),
      "-",
      c("Open File...", "workbench.action.files.openFile", "Ctrl+O"),
      { label: "Open Folder...", run: openFolder },
      "-",
      c("Save", "workbench.action.files.save", "Ctrl+S"),
      c("Save As...", "workbench.action.files.saveAs", "Ctrl+Shift+S"),
      c("Save All", "workbench.action.files.saveAll"),
      "-",
      c("Auto Save", "workbench.action.toggleAutoSave"),
      c("Settings", "workbench.action.openSettings", "Ctrl+,"),
      c("Keyboard Shortcuts", "workbench.action.openGlobalKeybindings"),
      c("Color Theme", "workbench.action.selectTheme"),
      "-",
      c("Revert File", "workbench.action.files.revert"),
      c("Close Editor", "workbench.action.closeActiveEditor", "Ctrl+F4"),
    ] },
    { label: "Edit", items: [
      c("Undo", "undo", "Ctrl+Z"),
      c("Redo", "redo", "Ctrl+Y"),
      "-",
      c("Cut", "editor.action.clipboardCutAction", "Ctrl+X"),
      c("Copy", "editor.action.clipboardCopyAction", "Ctrl+C"),
      c("Paste", "editor.action.clipboardPasteAction", "Ctrl+V"),
      "-",
      c("Find", "actions.find", "Ctrl+F"),
      c("Replace", "editor.action.startFindReplaceAction", "Ctrl+H"),
      "-",
      c("Find in Files", "workbench.action.findInFiles", "Ctrl+Shift+F"),
      c("Replace in Files", "workbench.action.replaceInFiles", "Ctrl+Shift+H"),
      "-",
      c("Toggle Line Comment", "editor.action.commentLine", "Ctrl+/"),
      c("Toggle Block Comment", "editor.action.blockComment", "Shift+Alt+A"),
    ] },
    { label: "Selection", items: [
      c("Select All", "editor.action.selectAll", "Ctrl+A"),
      c("Expand Selection", "editor.action.smartSelect.expand", "Shift+Alt+RightArrow"),
      c("Shrink Selection", "editor.action.smartSelect.shrink", "Shift+Alt+LeftArrow"),
      "-",
      c("Copy Line Up", "editor.action.copyLinesUpAction", "Shift+Alt+UpArrow"),
      c("Copy Line Down", "editor.action.copyLinesDownAction", "Shift+Alt+DownArrow"),
      c("Move Line Up", "editor.action.moveLinesUpAction", "Alt+UpArrow"),
      c("Move Line Down", "editor.action.moveLinesDownAction", "Alt+DownArrow"),
      c("Duplicate Selection", "editor.action.duplicateSelection"),
      "-",
      c("Add Cursor Above", "editor.action.insertCursorAbove", "Ctrl+Alt+UpArrow"),
      c("Add Cursor Below", "editor.action.insertCursorBelow", "Ctrl+Alt+DownArrow"),
      c("Add Cursors to Line Ends", "editor.action.insertCursorAtEndOfEachLineSelected", "Shift+Alt+I"),
      c("Add Next Occurrence", "editor.action.addSelectionToNextFindMatch", "Ctrl+D"),
      c("Add Previous Occurrence", "editor.action.addSelectionToPreviousFindMatch"),
      c("Select All Occurrences", "editor.action.selectHighlights", "Ctrl+Shift+L"),
      "-",
      c("Column Selection Mode", "editor.action.toggleColumnSelection"),
    ] },
    { label: "View", items: [
      c("Command Palette...", "workbench.action.showCommands", "Ctrl+Shift+P"),
      c("Open View...", "workbench.action.openView"),
      "-",
      c("Explorer", "workbench.view.explorer", "Ctrl+Shift+E"),
      c("Search", "workbench.view.search", "Ctrl+Shift+F"),
      c("Source Control", "workbench.view.scm", "Ctrl+Shift+G"),
      c("Run", "workbench.view.debug", "Ctrl+Shift+D"),
      c("Extensions", "workbench.view.extensions", "Ctrl+Shift+X"),
      "-",
      c("Problems", "workbench.actions.view.problems", "Ctrl+Shift+M"),
      c("Output", "workbench.action.output.toggleOutput", "Ctrl+Shift+U"),
      c("Debug Console", "workbench.debug.action.toggleRepl", "Ctrl+Shift+Y"),
      c("Terminal", "workbench.action.terminal.toggleTerminal", "Ctrl+`"),
      "-",
      c("Word Wrap", "editor.action.toggleWordWrap", "Alt+Z"),
      c("Minimap", "editor.action.toggleMinimap"),
      "-",
      c("Zoom In", "editor.action.fontZoomIn"),
      c("Zoom Out", "editor.action.fontZoomOut"),
      c("Reset Zoom", "editor.action.fontZoomReset"),
    ] },
    { label: "Go", items: [
      c("Back", "workbench.action.navigateBack", "Alt+LeftArrow"),
      c("Forward", "workbench.action.navigateForward", "Alt+RightArrow"),
      c("Last Edit Location", "workbench.action.navigateToLastEditLocation"),
      "-",
      c("Go to File...", "workbench.action.quickOpen", "Ctrl+P"),
      c("Go to Symbol in Workspace...", "workbench.action.showAllSymbols", "Ctrl+T"),
      c("Go to Symbol in Editor...", "workbench.action.gotoSymbol", "Ctrl+Shift+O"),
      c("Go to Definition", "editor.action.revealDefinition", "F12"),
      c("Go to References", "editor.action.goToReferences", "Shift+F12"),
      c("Go to Line/Column...", "workbench.action.gotoLine", "Ctrl+G"),
      c("Go to Bracket", "editor.action.jumpToBracket", "Ctrl+Shift+\\"),
      "-",
      c("Next Problem", "editor.action.marker.nextInFiles", "F8"),
      c("Previous Problem", "editor.action.marker.prevInFiles", "Shift+F8"),
    ] },
    { label: "Run", items: [
      c("Start Debugging", "workbench.action.debug.start", "F5"),
      c("Run Without Debugging", "workbench.action.debug.run", "Ctrl+F5"),
      c("Stop Debugging", "workbench.action.debug.stop", "Shift+F5"),
      c("Restart Debugging", "workbench.action.debug.restart", "Ctrl+Shift+F5"),
      "-",
      c("Open Configurations", "workbench.action.debug.configure"),
      c("Add Configuration...", "debug.addConfiguration"),
      "-",
      c("Toggle Breakpoint", "editor.debug.action.toggleBreakpoint", "F9"),
    ] },
    { label: "Terminal", items: [
      c("New Terminal", "workbench.action.terminal.new", "Ctrl+Shift+`"),
      c("Split Terminal", "workbench.action.terminal.split", "Ctrl+Shift+5"),
      "-",
      c("Run Task...", "workbench.action.tasks.runTask"),
      c("Run Build Task...", "workbench.action.tasks.build", "Ctrl+Shift+B"),
      c("Run Active File", "workbench.action.terminal.runActiveFile"),
      c("Run Selected Text", "workbench.action.terminal.runSelectedText"),
      "-",
      c("Configure Tasks...", "workbench.action.tasks.configureTaskRunner"),
    ] },
    { label: "Help", items: [
      c("Show All Commands", "workbench.action.showCommands", "Ctrl+Shift+P"),
      c("Editor Playground", "workbench.action.showInteractivePlayground"),
      c("Keyboard Shortcuts Reference", "workbench.action.keybindingsReference"),
      "-",
      c("About", "workbench.action.showAboutDialog"),
    ] },
  ];
}
