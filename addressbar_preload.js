const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	onSetURL: (callback) =>
		ipcRenderer.on("setURL", (_event, url) => callback(url)),
	setURL: (url) => ipcRenderer.send("setURL", url),
	back: () => ipcRenderer.send("browserBack"),
	forward: () => ipcRenderer.send("browserForward"),
	reload: () => ipcRenderer.send("browserReload"),
	openBookmark: () => ipcRenderer.send("openBookmark"),
});
