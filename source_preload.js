const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	setColor: (callback) =>
		ipcRenderer.on("setColor", (_event, color) => callback(color)),
	clearAll: (callback) => ipcRenderer.on("clearAll", (_event) => callback()),
});

const fs = require("node:fs");
const path = require("node:path");

window.addEventListener("load", () => {
	const script = document.createElement("script");
	script.innerHTML = fs.readFileSync(path.join(__dirname, "test.js"), "utf8");
	document.querySelector("body").appendChild(script);
});
