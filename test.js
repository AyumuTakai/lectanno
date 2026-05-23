let currentColor = "yellow";
const allLines = [];

function addLine(svg, x1, y1, x2, y2, color) {
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	line.setAttribute("x1", x1);
	line.setAttribute("y1", y1);
	line.setAttribute("x2", x2);
	line.setAttribute("y2", y2);
	line.setAttribute("stroke", color);
	line.setAttribute("stroke-width", 10);
	line.setAttribute("stroke-opacity", 0.5);
	svg.appendChild(line);
	return line;
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
		currentLineData = {
			x1: event.offsetX,
			y1: event.offsetY,
			x2: event.offsetX,
			y2: event.offsetY,
			color: currentColor,
		};
		currentFigure = addLine(
			svg,
			currentLineData.x1,
			currentLineData.y1,
			currentLineData.x2,
			currentLineData.y2,
			currentColor,
		);
	});

	svg.addEventListener("mouseup", (event) => {
		if (isDragging && currentFigure && currentLineData) {
			currentLineData.x2 = event.offsetX;
			currentLineData.y2 = event.offsetY;
			currentFigure.setAttribute("x2", event.offsetX);
			currentFigure.setAttribute("y2", event.offsetY);
			allLines.push(currentLineData);
			window.api.saveAnnotations(location.href, allLines);
		}
		isDragging = false;
		currentFigure = null;
		currentLineData = null;
	});

	svg.addEventListener("mousemove", (event) => {
		if (isDragging && currentFigure) {
			currentFigure.setAttribute("x2", event.offsetX);
			currentFigure.setAttribute("y2", event.offsetY);
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
		addLine(svg, line.x1, line.y1, line.x2, line.y2, line.color);
		allLines.push(line);
	}
});

window.api.clearAll(() => {
	while (svg.firstChild) svg.removeChild(svg.firstChild);
	allLines.length = 0;
	window.api.saveAnnotations(location.href, []);
});

window.api.setColor((color) => {
	currentColor = color;
});
