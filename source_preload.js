const { contextBridge, ipcRenderer } = require("electron");

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
	saveAnnotations: (url, lines) => ipcRenderer.send("saveAnnotations", url, lines),
	loadAnnotations: (url) => ipcRenderer.invoke("loadAnnotations", url),
});

// サンドボックス環境では node:fs が使えないため IPC 経由でスクリプト内容を取得する
window.addEventListener("load", async () => {
	const content = await ipcRenderer.invoke("getAnnotationScript");
	const script = document.createElement("script");
	script.innerHTML = content;
	document.querySelector("body").appendChild(script);
});
