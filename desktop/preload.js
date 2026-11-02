// What our screens can ask the desktop app for (window.classgridDesktop). Nothing else from the computer is exposed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("classgridDesktop", {
  isDesktop: true,
  version: ipcRenderer.sendSync("cg:version"),
  openExternal: (url) => ipcRenderer.invoke("cg:openExternal", url),
  // A file on this computer shown in a Studio tab
  fileUrl: (file) => ipcRenderer.sendSync("cg:fileUrl", file),
  fileInfo: (file) => ipcRenderer.invoke("cg:fileInfo", file),
  openPath: (file) => ipcRenderer.invoke("cg:openPath", file),
  showInFolder: (file) => ipcRenderer.invoke("cg:showInFolder", file),
  openRecordings: () => ipcRenderer.invoke("cg:openRecordings"),
  pickFolder: () => ipcRenderer.invoke("cg:pickFolder"),
  setToken: (token) => ipcRenderer.send("cg:setToken", token),
  // Chats kept on this computer, for reading when offline (only the logged-in user's)
  saveChat: (chat) => ipcRenderer.invoke("cg:saveChat", chat),
  listChats: () => ipcRenderer.invoke("cg:listChats"),
  readChat: (id) => ipcRenderer.invoke("cg:readChat", id),
  removeChat: (id) => ipcRenderer.invoke("cg:removeChat", id),
  retry: () => ipcRenderer.invoke("cg:retry"),
  openFolder: (folder) => ipcRenderer.invoke("cg:openFolder", folder),
  cloneRepo: (repo) => ipcRenderer.invoke("cg:cloneRepo", repo),
  listFiles: (folder) => ipcRenderer.invoke("cg:listFiles", folder),
  readFile: (folder, rel) => ipcRenderer.invoke("cg:readFile", folder, rel),
  openInEditor: (folder, file, line) => ipcRenderer.invoke("cg:openInEditor", folder, file, line),
  startEditor: (folder) => ipcRenderer.invoke("cg:startEditor", folder),
  revealInEditor: (folder, file, startLine, endLine) => ipcRenderer.invoke("cg:revealInEditor", folder, file, startLine, endLine),
  // Studio's Browser tab: the AI's browser runs in this app and sits over the tab (rect = the tab's place on screen)
  browserShow: (rect) => ipcRenderer.send("cg:browserShow", rect),
  browserHide: () => ipcRenderer.send("cg:browserHide"),
  browserChat: (id) => ipcRenderer.send("cg:browserChat", id),
  browserState: () => ipcRenderer.invoke("cg:browserState"),
  browserAct: (step) => ipcRenderer.invoke("cg:browserAct", step),
  browserShot: () => ipcRenderer.invoke("cg:browserShot"),
  onBrowser: (fn) => {
    const listener = (_e, msg) => fn(msg);
    ipcRenderer.on("cg:browser", listener);
    return () => ipcRenderer.removeListener("cg:browser", listener);
  },
});
