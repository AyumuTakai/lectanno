const { contextBridge, ipcRenderer } = require("electron");

// スクリプト注入は main.js の executeJavaScript で行うため、ここでは API のみ公開
contextBridge.exposeInMainWorld("api", {
	setColor: (callback) =>
		ipcRenderer.on("setColor", (_event, color) => callback(color)),
	setLineWidth: (callback) =>
		ipcRenderer.on("setLineWidth", (_event, width) => callback(width)),
	setEraser: (callback) =>
		ipcRenderer.on("setEraser", (_event, active) => callback(active)),
	undo: (callback) =>
		ipcRenderer.on("undo", (_event) => callback()),
	clearAll: (callback) =>
		ipcRenderer.on("clearAll", (_event) => callback()),
	setInteractMode: (callback) =>
		ipcRenderer.on("setInteractMode", (_event, active) => callback(active)),
	saveAnnotations: (url, lines) => ipcRenderer.send("saveAnnotations", url, lines),
	loadAnnotations: (url) => ipcRenderer.invoke("loadAnnotations", url),
});
