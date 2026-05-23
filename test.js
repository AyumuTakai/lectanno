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
	// window スクロールに加え、内部スクロールコンテナ (Dropbox 等) にも追従するために追跡する
	let trackedContainer = null;

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.style.position = "absolute";
	svg.style.top = "0";
	svg.style.left = "0";
	svg.style.pointerEvents = "all";

	// window スクロール + 内部コンテナスクロールを合算したオフセットを返す
	function getOffset() {
		return [
			window.scrollX + (trackedContainer ? trackedContainer.scrollLeft : 0),
			window.scrollY + (trackedContainer ? trackedContainer.scrollTop : 0),
		];
	}

	// 追跡コンテナのサイズ変化でも SVG を再計算する
	const containerResizeObserver = new ResizeObserver(() => { resize(); syncScroll(); });

	// el の祖先からスクロール可能なコンテナを探して追跡対象に設定する
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
		// スクロール可能なコンテナが見つからなければ追跡を解除
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
			// 描画開始時点でカーソル下のスクロールコンテナを確定させる
			svg.style.pointerEvents = "none";
			const elUnder = document.elementFromPoint(event.clientX, event.clientY);
			svg.style.pointerEvents = "all";
			updateTrackedContainer(elUnder);

			const [ox, oy] = getOffset();
			currentLineData = {
				x1: event.clientX + ox,
				y1: event.clientY + oy,
				x2: event.clientX + ox,
				y2: event.clientY + oy,
				color: currentColor,
				width: currentWidth,
			};
			currentFigure = addLine(
				svg,
				currentLineData.x1, currentLineData.y1,
				currentLineData.x2, currentLineData.y2,
				currentColor, currentWidth,
			);
		}
	});

	svg.addEventListener("mouseup", (event) => {
		if (isDragging) {
			if (!isEraser && currentFigure && currentLineData) {
				const [ox, oy] = getOffset();
				currentLineData.x2 = event.clientX + ox;
				currentLineData.y2 = event.clientY + oy;
				currentFigure.setAttribute("x2", event.clientX + ox);
				currentFigure.setAttribute("y2", event.clientY + oy);
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
		const [ox, oy] = getOffset();
		if (!isEraser && currentFigure) {
			currentFigure.setAttribute("x2", event.clientX + ox);
			currentFigure.setAttribute("y2", event.clientY + oy);
		} else if (isEraser) {
			eraseNearPoint(svg, event.clientX + ox, event.clientY + oy);
		}
	});

	return svg;
}

const svg = createSVG();
const div = createContainer();
div.appendChild(svg);
document.querySelector("body").appendChild(div);

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
window.api.setInteractMode((active) => {
	svg.style.pointerEvents = active ? "none" : "all";
	svg.style.cursor = active ? "" : (isEraser ? "cell" : "default");
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
