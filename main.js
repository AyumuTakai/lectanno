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

	view1.webContents.on("did-navigate", (_event, newUrl) => {
		getData().lastUrl = newUrl;
		saveData();
		addressBar.webContents.send("setURL", newUrl);
	});
	view1.webContents.on("did-navigate-in-page", (_event, newUrl) => {
		getData().lastUrl = newUrl;
		saveData();
		addressBar.webContents.send("setURL", newUrl);
	});
};

// IPC handlers registered once at module level to avoid duplication on macOS re-activate
ipcMain.on("toggleDevTool", () => view1?.webContents.toggleDevTools());
ipcMain.on("setColor", (_, color) => view1?.webContents.send("setColor", color));
ipcMain.on("clearAll", () => view1?.webContents.send("clearAll"));
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
