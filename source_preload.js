const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	onWheel: (callback) =>
		ipcRenderer.on("wheel", (_event, value) => callback(value)),
});

// let y = 0;

function addLine(svg, x1, y1, x2, y2) {
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	const stroke = "yellow";
	const opacity = 0.5;
	const width = 10;
	line.setAttribute("x1", x1);
	line.setAttribute("y1", y1);
	line.setAttribute("x2", x2);
	line.setAttribute("y2", y2);
	line.setAttribute("stroke", stroke);
	line.setAttribute("stroke-width", width);
	line.setAttribute("stroke-opacity", opacity);
	svg.appendChild(line);
}

window.addEventListener("load", () => {
	// document.querySelector("h1").textContent = "test";

	// const script = document.createElement("script");
	// script.innerHTML = `

	// `;
	// document.querySelector("body").appendChild(script);

	const div = document.createElement("div");
	div.style.position = "fixed";
	div.style.height = "100vh";
	div.style.width = "100vw";
	div.style.top = 0;
	div.style.left = 0;
	div.style.background = "rgba(0,0,0,0.0)";
	div.style.zIndex = 999;
	div.addEventListener("wheel", (event) => {
		const container = document.querySelector("#viewerContainer");
		console.log({ event });
		container.scrollBy(0, event.deltaY);
	});
	document.querySelector("body").appendChild(div);
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "100%");
	svg.setAttribute("height", "100%");
	addLine(svg, 0, 0, 100, 100);
	div.appendChild(svg);
});
