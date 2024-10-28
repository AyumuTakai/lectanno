const viewer = "#viewer";
const viewerContainer = "#viewerContainer";

let currentColor = "yellow";

function addLine(svg, x1, y1, x2, y2) {
	const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
	const stroke = currentColor;
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
		const container = document.querySelector("#viewerContainer");
		container.scrollBy(0, event.deltaY);
		div.scrollBy(0, event.deltaY);
	});
	return div;
}

function createSVG() {
	let isDragging = false;
	let currentFigure = null;
	const figures = [];

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.addEventListener("mousedown", (event) => {
		isDragging = true;
		if (isDragging) {
			currentFigure = addLine(
				svg,
				event.offsetX,
				event.offsetY,
				event.offsetX,
				event.offsetY,
			);
			figures.push(currentFigure);
		} else {
			currentFigure = null;
		}
	});
	svg.addEventListener("mouseup", (event) => {
		if (isDragging && currentFigure) {
			currentFigure.setAttribute("x2", event.offsetX);
			currentFigure.setAttribute("y2", event.offsetY);
		}
		isDragging = false;
	});
	svg.addEventListener("mousemove", (event) => {
		if (isDragging && currentFigure) {
			currentFigure.setAttribute("x2", event.offsetX);
			currentFigure.setAttribute("y2", event.offsetY);
		}
	});
	const container = document.querySelector("#viewer");
	const resizeObserver = new ResizeObserver((entries) => {
		const w = entries[0].contentRect.width;
		const h = entries[0].contentRect.height;
		console.log({ w, h });
		svg.setAttribute("width", w);
		svg.setAttribute("height", h);
	});
	resizeObserver.observe(container);
	// addLine(svg, 0, 0, 100, 100);
	return svg;
}

const svg = createSVG();
const div = createContainer();
div.appendChild(svg);
document.querySelector("body").appendChild(div);

window.api.clearAll(() => {
	for (let i = svg.childNodes.length - 1; i >= 0; i--) {
		svg.removeChild(svg.childNodes[i]);
	}
});

window.api.setColor((color) => {
	currentColor = color;
});
