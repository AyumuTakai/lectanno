const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	toggleDevTool: () => ipcRenderer.send("toggleDevTool"),
	setColor: (color) => ipcRenderer.send("setColor", color),
	clearAll: () => ipcRenderer.send("clearAll"),
});
