let currentColor = "yellow";
let currentWidth = 10;
let isEraser = false;
let drawMode = "line"; // "line" | "free"
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

// points: [[x,y], ...]
function addPath(svg, points, color, width) {
	const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.setAttribute("d", pointsToD(points));
	path.setAttribute("stroke", color);
	path.setAttribute("stroke-width", width);
	path.setAttribute("stroke-opacity", 0.5);
	path.setAttribute("stroke-linecap", "round");
	path.setAttribute("stroke-linejoin", "round");
	path.setAttribute("fill", "none");
	svg.appendChild(path);
	return path;
}

function pointsToD(points) {
	return points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
}

function eraseNearPoint(svg, x, y) {
	const radius = 20;
	for (let i = allLines.length - 1; i >= 0; i--) {
		const item = allLines[i];
		let hit = false;
		if (item.type === "path") {
			const pts = item.points;
			for (let j = 0; j < pts.length - 1; j++) {
				if (distanceToSegment(x, y, pts[j][0], pts[j][1], pts[j + 1][0], pts[j + 1][1]) < radius) {
					hit = true;
					break;
				}
			}
		} else {
			hit = distanceToSegment(x, y, item.x1, item.y1, item.x2, item.y2) < radius;
		}
		if (hit) {
			svg.removeChild(svg.childNodes[i]);
			allLines.splice(i, 1);
		}
	}
}

function createContainer() {
	const div = document.createElement("div");
	div.style.position = "fixed";
	div.style.top = "0";
	div.style.left = "0";
	div.style.width = "100vw";
	div.style.height = "100vh";
	div.style.zIndex = "999";
	div.style.overflow = "hidden";
	div.style.pointerEvents = "none";
	return div;
}

function createSVG() {
	let isDragging = false;
	let currentFigure = null;
	let currentLineData = null;
	let currentPoints = null; // フリー描画用
	let trackedContainer = null;

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.style.position = "absolute";
	svg.style.top = "0";
	svg.style.left = "0";
	svg.style.pointerEvents = "all";

	function getOffset() {
		return [
			window.scrollX + (trackedContainer ? trackedContainer.scrollLeft : 0),
			window.scrollY + (trackedContainer ? trackedContainer.scrollTop : 0),
		];
	}

	const containerResizeObserver = new ResizeObserver(() => { resize(); syncScroll(); });

	function updateTrackedContainer(el) {
		if (!el) return;
		let node = el;
		while (node && node !== document.documentElement) {
			const { overflowY, overflowX } = getComputedStyle(node);
			const scrollableY = node.scrollHeight > node.clientHeight && (overflowY === "scroll" || overflowY === "auto");
			const scrollableX = node.scrollWidth > node.clientWidth && (overflowX === "scroll" || overflowX === "auto");
			if (scrollableY || scrollableX) {
				if (trackedContainer !== node) {
					if (trackedContainer) {
						trackedContainer.removeEventListener("scroll", syncScroll);
						containerResizeObserver.unobserve(trackedContainer);
					}
					trackedContainer = node;
					trackedContainer.addEventListener("scroll", syncScroll, { passive: true });
					containerResizeObserver.observe(trackedContainer);
					resize();
				}
				return;
			}
			node = node.parentElement;
		}
		if (trackedContainer) {
			trackedContainer.removeEventListener("scroll", syncScroll);
			containerResizeObserver.unobserve(trackedContainer);
			trackedContainer = null;
		}
	}

	function resize() {
		const cw = trackedContainer ? trackedContainer.scrollWidth : 0;
		const ch = trackedContainer ? trackedContainer.scrollHeight : 0;
		const w = Math.max(document.documentElement.scrollWidth, window.innerWidth, cw);
		const h = Math.max(document.documentElement.scrollHeight, window.innerHeight, ch);
		svg.setAttribute("width", w);
		svg.setAttribute("height", h);
	}

	function syncScroll() {
		const [ox, oy] = getOffset();
		svg.style.transform = `translate(${-ox}px, ${-oy}px)`;
	}

	resize();
	syncScroll();

	window.addEventListener("scroll", syncScroll, { passive: true });
	window.addEventListener("resize", () => { resize(); syncScroll(); });
	new ResizeObserver(() => { resize(); syncScroll(); }).observe(document.documentElement);

	svg.addEventListener("wheel", (event) => {
		svg.style.pointerEvents = "none";
		const el = document.elementFromPoint(event.clientX, event.clientY);
		svg.style.pointerEvents = "all";

		let node = el;
		while (node && node !== document.documentElement) {
			const { overflowY } = getComputedStyle(node);
			if (
				node.scrollHeight > node.clientHeight &&
				(overflowY === "scroll" || overflowY === "auto")
			) {
				updateTrackedContainer(node);
				node.scrollBy(0, event.deltaY);
				return;
			}
			node = node.parentElement;
		}
		window.scrollBy(0, event.deltaY);
	}, { passive: true });

	svg.addEventListener("mousedown", (event) => {
		isDragging = true;
		if (!isEraser) {
			svg.style.pointerEvents = "none";
			const elUnder = document.elementFromPoint(event.clientX, event.clientY);
			svg.style.pointerEvents = "all";
			updateTrackedContainer(elUnder);

			const [ox, oy] = getOffset();
			const x = event.clientX + ox;
			const y = event.clientY + oy;

			if (drawMode === "line") {
				currentLineData = { x1: x, y1: y, x2: x, y2: y, color: currentColor, width: currentWidth };
				currentFigure = addLine(svg, x, y, x, y, currentColor, currentWidth);
			} else {
				currentPoints = [[x, y]];
				currentFigure = addPath(svg, currentPoints, currentColor, currentWidth);
			}
		}
	});

	svg.addEventListener("mouseup", (event) => {
		if (isDragging) {
			if (!isEraser && currentFigure) {
				const [ox, oy] = getOffset();
				const x = event.clientX + ox;
				const y = event.clientY + oy;

				if (drawMode === "line" && currentLineData) {
					currentLineData.x2 = x;
					currentLineData.y2 = y;
					currentFigure.setAttribute("x2", x);
					currentFigure.setAttribute("y2", y);
					allLines.push(currentLineData);
				} else if (drawMode === "free" && currentPoints) {
					currentPoints.push([x, y]);
					currentFigure.setAttribute("d", pointsToD(currentPoints));
					allLines.push({ type: "path", points: currentPoints, color: currentColor, width: currentWidth });
				}
				window.api.saveAnnotations(location.href, allLines);
			} else if (isEraser) {
				window.api.saveAnnotations(location.href, allLines);
			}
		}
		isDragging = false;
		currentFigure = null;
		currentLineData = null;
		currentPoints = null;
	});

	svg.addEventListener("mousemove", (event) => {
		if (!isDragging) return;
		const [ox, oy] = getOffset();
		const x = event.clientX + ox;
		const y = event.clientY + oy;

		if (!isEraser && currentFigure) {
			if (drawMode === "line") {
				currentFigure.setAttribute("x2", x);
				currentFigure.setAttribute("y2", y);
			} else if (currentPoints) {
				currentPoints.push([x, y]);
				currentFigure.setAttribute("d", pointsToD(currentPoints));
			}
		} else if (isEraser) {
			eraseNearPoint(svg, x, y);
		}
	});

	return svg;
}

const svg = createSVG();
const div = createContainer();
div.appendChild(svg);
document.querySelector("body").appendChild(div);

// ---- レーザーポインター ----
const laser = document.createElement("div");
laser.style.cssText = [
	"position:fixed",
	"width:22px",
	"height:22px",
	"border-radius:50%",
	"background:radial-gradient(circle, rgba(255,60,60,1) 0%, rgba(255,30,30,0.7) 40%, transparent 70%)",
	"box-shadow:0 0 10px 4px rgba(255,0,0,0.5)",
	"pointer-events:none",
	"display:none",
	"transform:translate(-50%,-50%)",
	"z-index:1000",
].join(";");
document.body.appendChild(laser);

let isLaserActive = false;
window.addEventListener("mousemove", (e) => {
	if (isLaserActive) {
		laser.style.left = e.clientX + "px";
		laser.style.top  = e.clientY + "px";
	}
});

window.api.loadAnnotations(location.href).then((savedLines) => {
	for (const item of savedLines) {
		if (item.type === "path") {
			addPath(svg, item.points, item.color, item.width ?? 10);
		} else {
			addLine(svg, item.x1, item.y1, item.x2, item.y2, item.color, item.width ?? 10);
		}
		allLines.push(item);
	}
});

window.api.setColor((color) => { currentColor = color; });
window.api.setLineWidth((width) => { currentWidth = width; });
window.api.setEraser((active) => {
	isEraser = active;
	svg.style.cursor = active ? "cell" : "default";
});
window.api.setDrawMode((mode) => { drawMode = mode; });
let isInteractMode = false;
window.api.setInteractMode((active) => {
	isInteractMode = active;
	svg.style.pointerEvents = active ? "none" : "all";
	svg.style.cursor = active ? "" : (isEraser ? "cell" : "default");
});

// Ctrl キー押下中は描画を一時解除してコンテンツを直接操作できるようにする
window.addEventListener("keydown", (e) => {
	if (e.key === "Control" && !isInteractMode) {
		svg.style.pointerEvents = "none";
		svg.style.cursor = "";
	}
});
window.addEventListener("keyup", (e) => {
	if (e.key === "Control" && !isInteractMode) {
		svg.style.pointerEvents = "all";
		svg.style.cursor = isEraser ? "cell" : "default";
	}
});

// Alt / Option キー押下中はレーザーポインターを表示し描画を一時解除する
window.addEventListener("keydown", (e) => {
	if (e.key === "Alt" && !isInteractMode && !isLaserActive) {
		e.preventDefault();
		isLaserActive = true;
		laser.style.display = "block";
		svg.style.pointerEvents = "none";
		svg.style.cursor = "";
	}
});
window.addEventListener("keyup", (e) => {
	if (e.key === "Alt") {
		isLaserActive = false;
		laser.style.display = "none";
		if (!isInteractMode) {
			svg.style.pointerEvents = "all";
			svg.style.cursor = isEraser ? "cell" : "default";
		}
	}
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
