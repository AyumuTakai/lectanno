const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	setTitle: (title) => ipcRenderer.send("set-title", title),
	onWheel: (event) => ipcRenderer.send("onWheel", event),
});
