const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	toggleDevTool: () => ipcRenderer.send("toggleDevTool"),
	toggleOverlay: () => ipcRenderer.send("toggleOverlay"),
	setColor: (color) => ipcRenderer.send("setColor", color),
	clearAll: () => ipcRenderer.send("clearAll"),
});
