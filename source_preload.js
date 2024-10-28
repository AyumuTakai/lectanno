const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
	setColor: (callback) =>
		ipcRenderer.on("setColor", (_event, color) => callback(color)),
	clearAll: (callback) => ipcRenderer.on("clearAll", (_event) => callback()),
});

function createScript() {
	const script = document.createElement("script");
	// script.innerHTML = "alert('test')";
	script.src = "http://localhost:8000/test.js";
	return script;
}

window.addEventListener("load", () => {
	document.querySelector("body").appendChild(createScript());
});
