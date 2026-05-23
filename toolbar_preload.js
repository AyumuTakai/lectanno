const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	toggleDevTool: () => ipcRenderer.send("toggleDevTool"),
	toggleOverlay: () => ipcRenderer.send("toggleOverlay"),
	setColor: (color) => ipcRenderer.send("setColor", color),
	setLineWidth: (width) => ipcRenderer.send("setLineWidth", width),
	setEraser: (active) => ipcRenderer.send("setEraser", active),
	undo: () => ipcRenderer.send("undo"),
	clearAll: () => ipcRenderer.send("clearAll"),
	toggleBookmark: () => ipcRenderer.send("toggleBookmark"),
	setDrawMode: (mode) => ipcRenderer.send("setDrawMode", mode),
	setInteractMode: (active) => ipcRenderer.send("setInteractMode", active),
	onBookmarkStatus: (callback) =>
		ipcRenderer.on("bookmarkStatus", (_event, isBookmarked) => callback(isBookmarked)),
});
