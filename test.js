let currentColor = "yellow";
let currentWidth = 10;
let isEraser = false;
const allLines = []; // 座標はドキュメント座標 (pageX/pageY) で保存

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

// コンテナは position:fixed で画面全体を覆うが pointer-events:none にして
// スクロールやクリックを下のコンテンツに透過させる。
// 描画イベントは内部の SVG が pointer-events:all で受け取る。
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

	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.style.position = "absolute";
	svg.style.top = "0";
	svg.style.left = "0";
	svg.style.pointerEvents = "all";

	// SVG をドキュメント全体のサイズに合わせる
	function resize() {
		const w = Math.max(document.documentElement.scrollWidth, window.innerWidth);
		const h = Math.max(document.documentElement.scrollHeight, window.innerHeight);
		svg.setAttribute("width", w);
		svg.setAttribute("height", h);
	}

	// スクロール量を打ち消す transform を適用してアノテーションを追従させる
	function syncScroll() {
		svg.style.transform = `translate(${-window.scrollX}px, ${-window.scrollY}px)`;
	}

	resize();
	syncScroll();

	window.addEventListener("scroll", syncScroll, { passive: true });
	window.addEventListener("resize", () => { resize(); syncScroll(); });
	new ResizeObserver(() => { resize(); syncScroll(); }).observe(document.documentElement);

	// ホイールイベントをカーソル下の実際のスクロール要素に転送する
	svg.addEventListener("wheel", (event) => {
		svg.style.pointerEvents = "none";
		const el = document.elementFromPoint(event.clientX, event.clientY);
		svg.style.pointerEvents = "all";

		// スクロール可能な祖先要素を探して転送
		let node = el;
		while (node && node !== document.documentElement) {
			const { overflowY } = getComputedStyle(node);
			if (
				node.scrollHeight > node.clientHeight &&
				(overflowY === "scroll" || overflowY === "auto")
			) {
				node.scrollBy(0, event.deltaY);
				return;
			}
			node = node.parentElement;
		}
		window.scrollBy(0, event.deltaY);
	}, { passive: true });

	// ドキュメント座標 (pageX/pageY) で記録することでスクロール後も位置が正確に保たれる
	svg.addEventListener("mousedown", (event) => {
		isDragging = true;
		if (!isEraser) {
			currentLineData = {
				x1: event.pageX,
				y1: event.pageY,
				x2: event.pageX,
				y2: event.pageY,
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
				currentLineData.x2 = event.pageX;
				currentLineData.y2 = event.pageY;
				currentFigure.setAttribute("x2", event.pageX);
				currentFigure.setAttribute("y2", event.pageY);
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
			currentFigure.setAttribute("x2", event.pageX);
			currentFigure.setAttribute("y2", event.pageY);
		} else if (isEraser) {
			eraseNearPoint(svg, event.pageX, event.pageY);
		}
	});

	return svg;
}

const svg = createSVG();
const div = createContainer();
div.appendChild(svg);
document.querySelector("body").appendChild(div);

// 保存済みアノテーションを復元 (座標はドキュメント座標で保存されているため変換不要)
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
	// active=true: SVG を透過してiframe含む全コンテンツを直接操作可能にする
	// active=false: SVG がイベントを受け取り描画モードに戻る
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
