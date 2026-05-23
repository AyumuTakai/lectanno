let currentColor = "yellow";
let currentWidth = 10;
let isEraser = false;
const allLines = [];

function distanceToSegment(px, py, x1, y1, x2, y2) {
	const dx = x2 - x1, dy = y2 - y1;
	const lenSq = dx * dx + dy * dy;
	if (lenSq === 0) return Math.hypot(px - x1, py - y1);
	const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lenSq));
	return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function addLine(svg, x1, y1, x2, y2, color, width) {
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line.setAttribute("x1", x1);
	line.setAttribute("y1", y1);
	line.setAttribute("x2", x2);
	line.setAttribute("y2", y2);
	line.setAttribute("stroke", color);
	line.setAttribute("stroke-width", width);
	line.setAttribute("stroke-opacity", 0.5);
	line.setAttribute("stroke-linecap", "round");
	svg.appendChild(line);
	return line;
}

function eraseNearPoint(svg, x, y) {
	const radius = 20;
	for (let i = allLines.length - 1; i >= 0; i--) {
		const l = allLines[i];
		if (distanceToSegment(x, y, l.x1, l.y1, l.x2, l.y2) < radius) {
			svg.removeChild(svg.childNodes[i]);
			allLines.splice(i, 1);
		}
	}
}

function createContainer() {
	const div = document.createElement("div");
	div.style.position = "fixed";
	div.style.height = "100vh";
	div.style.width = "100vw";
	div.style.top = 0;
	div.style.left = 0;
	div.style.background = "rgba(0,0,0,0.0)";
	div.style.zIndex = 999;
	div.style.overflow = "hidden";
	div.addEventListener("wheel", (event) => {
		// PDF.js ページのみスクロール同期
		const container = document.querySelector("#viewerContainer");
		if (container) container.scrollBy(0, event.deltaY);
	});
	return div;
}

function createSVG() {
	let isDragging = false;
	let currentFigure = null;
	let currentLineData = null;

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", window.innerWidth);
	svg.setAttribute("height", window.innerHeight);

	window.addEventListener("resize", () => {
		svg.setAttribute("width", window.innerWidth);
		svg.setAttribute("height", window.innerHeight);
	});

	svg.addEventListener("mousedown", (event) => {
		isDragging = true;
		if (!isEraser) {
			currentLineData = {
				x1: event.offsetX,
				y1: event.offsetY,
				x2: event.offsetX,
				y2: event.offsetY,
				color: currentColor,
				width: currentWidth,
			};
			currentFigure = addLine(
				svg,
				currentLineData.x1,
				currentLineData.y1,
				currentLineData.x2,
				currentLineData.y2,
				currentColor,
				currentWidth,
			);
		}
	});

	svg.addEventListener("mouseup", (event) => {
		if (isDragging) {
			if (!isEraser && currentFigure && currentLineData) {
				currentLineData.x2 = event.offsetX;
				currentLineData.y2 = event.offsetY;
				currentFigure.setAttribute("x2", event.offsetX);
				currentFigure.setAttribute("y2", event.offsetY);
				allLines.push(currentLineData);
				window.api.saveAnnotations(location.href, allLines);
			} else if (isEraser) {
				window.api.saveAnnotations(location.href, allLines);
			}
		}
		isDragging = false;
		currentFigure = null;
		currentLineData = null;
	});

	svg.addEventListener("mousemove", (event) => {
		if (!isDragging) return;
		if (!isEraser && currentFigure) {
			currentFigure.setAttribute("x2", event.offsetX);
			currentFigure.setAttribute("y2", event.offsetY);
		} else if (isEraser) {
			eraseNearPoint(svg, event.offsetX, event.offsetY);
		}
	});

	return svg;
}

const svg = createSVG();
const div = createContainer();
div.appendChild(svg);
document.querySelector("body").appendChild(div);

// 保存済みアノテーションを復元
window.api.loadAnnotations(location.href).then((savedLines) => {
	for (const line of savedLines) {
		addLine(svg, line.x1, line.y1, line.x2, line.y2, line.color, line.width ?? 10);
		allLines.push(line);
	}
});

window.api.setColor((color) => { currentColor = color; });
window.api.setLineWidth((width) => { currentWidth = width; });
window.api.setEraser((active) => {
	isEraser = active;
	svg.style.cursor = active ? "cell" : "default";
});
window.api.undo(() => {
	if (allLines.length === 0) return;
	svg.removeChild(svg.lastChild);
	allLines.pop();
	window.api.saveAnnotations(location.href, allLines);
});
window.api.clearAll(() => {
	while (svg.firstChild) svg.removeChild(svg.firstChild);
	allLines.length = 0;
	window.api.saveAnnotations(location.href, []);
});
