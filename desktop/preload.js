// What our screens can ask the desktop app for (window.classgridDesktop). Nothing else from the computer is exposed.
const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("classgridDesktop", {
  isDesktop: true,
  version: ipcRenderer.sendSync("cg:version"),
  // This computer's scrambled Windows ID (the free AI limit counts per computer)
  deviceId: ipcRenderer.sendSync("cg:deviceId"),
  openExternal: (url) => ipcRenderer.invoke("cg:openExternal", url),
  // Notification settings shared with Classgrid Code (one file on this computer)
  getNotificationSettings: () => ipcRenderer.invoke("cg:getNotificationSettings"),
  saveNotificationSettings: (s) => ipcRenderer.invoke("cg:saveNotificationSettings", s),
  // Settings → General: the Classgrid extension in VS Code, Cursor, Windsurf, VSCodium on this computer
  editorExtension: () => ipcRenderer.invoke("cg:editorExtension"),
  setEditorExtension: (on) => ipcRenderer.invoke("cg:setEditorExtension", !!on),
  // A Windows notification (a Grids message while the window is in the background)
  notify: (title, body) => ipcRenderer.invoke("cg:notify", { title, body }),
  // A file on this computer shown in a Studio tab
  fileUrl: (file) => ipcRenderer.sendSync("cg:fileUrl", file),
  fileInfo: (file) => ipcRenderer.invoke("cg:fileInfo", file),
  openPath: (file) => ipcRenderer.invoke("cg:openPath", file),
  showInFolder: (file) => ipcRenderer.invoke("cg:showInFolder", file),
  openRecordings: () => ipcRenderer.invoke("cg:openRecordings"),
  pickFolder: () => ipcRenderer.invoke("cg:pickFolder"),
  // A code or text file: { file, folder }, { error } for a picture, video, sound or archive, or null when cancelled
  pickFile: () => ipcRenderer.invoke("cg:pickFile"),
  // Studio's Uploads tab: files kept on this computer. A dropped or picked file is copied from where it is; one
  // without a place on disk (pasted) is sent as its bytes
  uploadsList: () => ipcRenderer.invoke("cg:uploadsList"),
  uploadsAdd: async (files, chatId) => ipcRenderer.invoke("cg:uploadsAdd", await Promise.all([...files].map(async (f) => {
    const at = webUtils.getPathForFile(f);
    return at ? { path: at, name: f.name, type: f.type } : { name: f.name, type: f.type, data: new Uint8Array(await f.arrayBuffer()) };
  })), chatId || null),
  uploadsRemove: (id) => ipcRenderer.invoke("cg:uploadsRemove", id),
  uploadsPick: (chatId) => ipcRenderer.invoke("cg:uploadsPick", chatId || null),
  uploadsFolder: () => ipcRenderer.invoke("cg:uploadsFolder"),
  setToken: (token) => ipcRenderer.send("cg:setToken", token),
  // The user's own terminals (Studio's Terminal tab): PowerShell, Git Bash or Command Prompt on this computer
  termShells: () => ipcRenderer.invoke("cg:termShells"),
  termOpen: (opts) => ipcRenderer.invoke("cg:termOpen", opts),
  termInput: (id, data) => ipcRenderer.send("cg:termInput", { id, data }),
  termResize: (id, cols, rows) => ipcRenderer.send("cg:termResize", { id, cols, rows }),
  termClose: (id) => ipcRenderer.send("cg:termClose", { id }),
  onTermData: (cb) => { const f = (_e, m) => cb(m); ipcRenderer.on("cg:termData", f); return () => ipcRenderer.removeListener("cg:termData", f); },
  onTermExit: (cb) => { const f = (_e, m) => cb(m); ipcRenderer.on("cg:termExit", f); return () => ipcRenderer.removeListener("cg:termExit", f); },
  // The AI's memory of each account on this computer (switching accounts keeps it)
  saveMemory: (m) => ipcRenderer.invoke("cg:saveMemory", m),
  otherMemory: () => ipcRenderer.invoke("cg:otherMemory"),
  memoryIndex: () => ipcRenderer.invoke("cg:memoryIndex"),
  // Chats kept on this computer, for reading when offline (only the logged-in user's)
  saveChat: (chat) => ipcRenderer.invoke("cg:saveChat", chat),
  listChats: () => ipcRenderer.invoke("cg:listChats"),
  readChat: (id) => ipcRenderer.invoke("cg:readChat", id),
  removeChat: (id) => ipcRenderer.invoke("cg:removeChat", id),
  // The other accounts' chats saved on this computer (read only)
  listOtherChats: () => ipcRenderer.invoke("cg:listOtherChats"),
  readOtherChat: (userId, id) => ipcRenderer.invoke("cg:readOtherChat", userId, id),
  retry: () => ipcRenderer.invoke("cg:retry"),
  openFolder: (folder) => ipcRenderer.invoke("cg:openFolder", folder),
  cloneRepo: (repo) => ipcRenderer.invoke("cg:cloneRepo", repo),
  listFiles: (folder) => ipcRenderer.invoke("cg:listFiles", folder),
  githubRepo: (folder) => ipcRenderer.invoke("cg:githubRepo", folder),
  readFile: (folder, rel) => ipcRenderer.invoke("cg:readFile", folder, rel),
  // One AI step on this computer, asked by the chat for a pc_tool_call on the answer's own stream (runner.js runTool)
  runTool: (req) => ipcRenderer.invoke("cg:runTool", req),
  // The editor notes (open file, cursor, selection, problems, terminal runs) sent with each message, so the server
  // never asks this computer for them in front of an answer
  editorContext: () => ipcRenderer.invoke("cg:editorContext"),
  openInEditor: (folder, file, line) => ipcRenderer.invoke("cg:openInEditor", folder, file, line),
  startEditor: (folder) => ipcRenderer.invoke("cg:startEditor", folder),
  revealInEditor: (folder, file, startLine, endLine) => ipcRenderer.invoke("cg:revealInEditor", folder, file, startLine, endLine),
  editorCommand: (command) => ipcRenderer.invoke("cg:editorCommand", command),
  // A folder picked in the built-in editor's own "Open Folder" / "New Window" (null: Project Mode's start page)
  onOpenFolderProject: (fn) => {
    const listener = (_e, folder) => fn(folder);
    ipcRenderer.on("cg:openFolderProject", listener);
    return () => ipcRenderer.removeListener("cg:openFolderProject", listener);
  },
  // Our top bar's light or dark colour, for the window buttons next to it
  setTitleBar: (dark) => ipcRenderer.send("cg:titleBar", !!dark),
  // The welcome screen's colour for the window buttons while it shows (on), and back to the top bar's after it (off)
  setSplashBar: (on, dark) => ipcRenderer.send("cg:splashBar", !!on, !!dark),
  // The top bar's Edit menu: undo, redo, cut, copy, paste, selectAll
  edit: (action) => ipcRenderer.send("cg:edit", action),
  // Studio's Browser tab: the AI's browser runs in this app and sits over the tab (rect = the tab's place on screen)
  browserShow: (rect) => ipcRenderer.send("cg:browserShow", rect),
  browserHide: () => ipcRenderer.send("cg:browserHide"),
  browserChat: (id) => ipcRenderer.send("cg:browserChat", id),
  browserState: () => ipcRenderer.invoke("cg:browserState"),
  browserAct: (step) => ipcRenderer.invoke("cg:browserAct", step),
  browserShot: () => ipcRenderer.invoke("cg:browserShot"),
  browserHistory: (q) => ipcRenderer.invoke("cg:browserHistory", q),
  browserHistoryClear: () => ipcRenderer.invoke("cg:browserHistoryClear"),
  // Settings → Browser: one history entry, the choices (site permissions, downloads), the download folder, download
  // history (open, show in folder, remove, clear) and clearing all browsing data
  browserHistoryRemove: (url, at) => ipcRenderer.invoke("cg:browserHistoryRemove", url, at),
  browserSettings: (patch) => ipcRenderer.invoke("cg:browserSettings", patch),
  browserPickDownloadDir: () => ipcRenderer.invoke("cg:browserPickDownloadDir"),
  browserDownloads: (q) => ipcRenderer.invoke("cg:browserDownloads", q),
  browserDownloadAct: (id, action) => ipcRenderer.invoke("cg:browserDownloadAct", id, action),
  browserClearData: () => ipcRenderer.invoke("cg:browserClearData"),
  onBrowser: (fn) => {
    const listener = (_e, msg) => fn(msg);
    ipcRenderer.on("cg:browser", listener);
    return () => ipcRenderer.removeListener("cg:browser", listener);
  },
});
