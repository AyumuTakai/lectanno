const { contextBridge, ipcRenderer } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

contextBridge.exposeInMainWorld("api", {
	setColor: (callback) =>
		ipcRenderer.on("setColor", (_event, color) => callback(color)),
	clearAll: (callback) => ipcRenderer.on("clearAll", (_event) => callback()),
	saveAnnotations: (url, lines) => ipcRenderer.send("saveAnnotations", url, lines),
	loadAnnotations: (url) => ipcRenderer.invoke("loadAnnotations", url),
});

window.addEventListener("load", () => {
	const script = document.createElement("script");
	script.innerHTML = fs.readFileSync(path.join(__dirname, "test.js"), "utf8");
	document.querySelector("body").appendChild(script);
});
