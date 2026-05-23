const { app, BaseWindow, WebContentsView, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

const TOOLBAR_W = 32;
const ADDRESSBAR_H = 32;

let win = null;
let view1 = null;
let view2 = null;
let addressBar = null;
let isOverlay = true;
let appData = null;

function getDataPath() {
	return path.join(app.getPath("userData"), "anotbrowser.json");
}

function getData() {
	if (!appData) {
		try {
			appData = JSON.parse(fs.readFileSync(getDataPath(), "utf8"));
		} catch {
			appData = {};
		}
	}
	return appData;
}

function saveData() {
	fs.writeFileSync(getDataPath(), JSON.stringify(appData, null, 2), "utf8");
}

// executeJavaScript で注入することで CSP を迂回する
const testJsContent = fs.readFileSync(path.join(__dirname, "test.js"), "utf8");
const injectionScript =
	"(function(){\n" +
	"if(window.__annotationInjected)return;\n" +
	"window.__annotationInjected=true;\n" +
	testJsContent +
	"\n})();";

function updateBounds() {
	if (!win || !view1) return;
	const [w, h] = win.getContentSize();
	const contentY = isOverlay ? 0 : ADDRESSBAR_H;
	const contentH = isOverlay ? h : h - ADDRESSBAR_H;
	view1.setBounds({ x: TOOLBAR_W, y: contentY, width: w - TOOLBAR_W, height: contentH });
	view2.setBounds({ x: 0, y: 0, width: TOOLBAR_W, height: h });
	if (!isOverlay) {
		addressBar.setBounds({ x: TOOLBAR_W, y: 0, width: w - TOOLBAR_W, height: ADDRESSBAR_H });
	}
}

const createWindow = () => {
	const initialUrl = getData().lastUrl || "https://hackwork.jp";

	win = new BaseWindow({ width: 800, height: 600 });
	win.on("closed", () => { win = null; });
	win.on("resize", updateBounds);

	view1 = new WebContentsView({
		webPreferences: { preload: path.join(__dirname, "source_preload.js") },
	});
	win.contentView.addChildView(view1);
	view1.webContents.loadURL(initialUrl);

	view2 = new WebContentsView({
		webPreferences: { preload: path.join(__dirname, "toolbar_preload.js") },
	});
	win.contentView.addChildView(view2);
	view2.webContents.loadFile("toolbar.html");

	addressBar = new WebContentsView({
		webPreferences: { preload: path.join(__dirname, "addressbar_preload.js") },
	});
	addressBar.webContents.loadFile("addressbar.html");

	updateBounds();

	function injectAnnotation() {
		view1.webContents.executeJavaScript(injectionScript).catch(() => {});
	}
	// did-finish-load: 通常のページ遷移・リロード
	view1.webContents.on("did-finish-load", injectAnnotation);
	// did-navigate-in-page: SPA 内ナビゲーション (Google Drive など)
	view1.webContents.on("did-navigate-in-page", () => {
		view1.webContents.executeJavaScript("window.__annotationInjected=false;")
			.then(() => setTimeout(injectAnnotation, 300))
			.catch(() => {});
	});

	view1.webContents.on("page-title-updated", (_event, title) => {
		win?.setTitle(title);
	});

	function onNavigate(newUrl) {
		getData().lastUrl = newUrl;
		saveData();
		addressBar.webContents.send("setURL", newUrl);
		const isBookmarked = (getData().bookmarks || []).includes(newUrl);
		view2.webContents.send("bookmarkStatus", isBookmarked);
	}

	view1.webContents.on("did-navigate", (_event, newUrl) => onNavigate(newUrl));
	view1.webContents.on("did-navigate-in-page", (_event, newUrl) => onNavigate(newUrl));
};

// IPC handlers registered once at module level to avoid duplication on macOS re-activate
ipcMain.on("toggleDevTool", () => view1?.webContents.toggleDevTools());
ipcMain.on("setColor", (_, color) => view1?.webContents.send("setColor", color));
ipcMain.on("setLineWidth", (_, width) => view1?.webContents.send("setLineWidth", width));
ipcMain.on("setEraser", (_, active) => view1?.webContents.send("setEraser", active));
ipcMain.on("setDrawMode", (_, mode) => view1?.webContents.send("setDrawMode", mode));
ipcMain.on("setInteractMode", (_, active) => view1?.webContents.send("setInteractMode", active));
ipcMain.on("undo", () => view1?.webContents.send("undo"));
ipcMain.on("clearAll", () => view1?.webContents.send("clearAll"));
ipcMain.on("toggleBookmark", () => {
	const data = getData();
	const url = data.lastUrl;
	if (!url) return;
	if (!data.bookmarks) data.bookmarks = [];
	const idx = data.bookmarks.indexOf(url);
	if (idx >= 0) {
		data.bookmarks.splice(idx, 1);
	} else {
		data.bookmarks.push(url);
	}
	saveData();
	view2?.webContents.send("bookmarkStatus", idx < 0);
});
ipcMain.on("setURL", (_, newUrl) => {
	getData().lastUrl = newUrl;
	saveData();
	view1?.webContents.loadURL(newUrl);
});
ipcMain.on("browserBack", () => view1?.webContents.goBack());
ipcMain.on("browserForward", () => view1?.webContents.goForward());
ipcMain.on("browserReload", () => view1?.webContents.reload());
ipcMain.on("toggleOverlay", () => {
	if (!win) return;
	isOverlay = !isOverlay;
	updateBounds();
	if (isOverlay) {
		win.contentView.removeChildView(addressBar);
	} else {
		win.contentView.addChildView(addressBar);
		addressBar.webContents.send("setURL", getData().lastUrl || "");
	}
});
ipcMain.on("saveAnnotations", (_, pageUrl, lines) => {
	const data = getData();
	if (!data.annotations) data.annotations = {};
	data.annotations[pageUrl] = lines;
	saveData();
});
ipcMain.handle("loadAnnotations", (_, pageUrl) => {
	const data = getData();
	return (data.annotations || {})[pageUrl] || [];
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (!win) createWindow();
	});
});
