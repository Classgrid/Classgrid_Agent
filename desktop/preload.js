// What our screens can ask the desktop app for (window.classgridDesktop). Nothing else from the computer is exposed.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("classgridDesktop", {
  isDesktop: true,
  version: ipcRenderer.sendSync("cg:version"),
  openExternal: (url) => ipcRenderer.invoke("cg:openExternal", url),
  pickFolder: () => ipcRenderer.invoke("cg:pickFolder"),
  setToken: (token) => ipcRenderer.send("cg:setToken", token),
  retry: () => ipcRenderer.invoke("cg:retry"),
  openFolder: (folder) => ipcRenderer.invoke("cg:openFolder", folder),
  cloneRepo: (repo) => ipcRenderer.invoke("cg:cloneRepo", repo),
  openInEditor: (folder) => ipcRenderer.invoke("cg:openInEditor", folder),
});
