const {
	app,
	BaseWindow,
	WebContentsView,
	ipcMain,
	BrowserWindow,
} = require("electron");
const path = require("node:path");

const createWindow = () => {
	const w = 800;
	const h = 600;
	const toolbar_w = 32;

	let isOverlay = true;
	let url = "https://hackwork.jp";
	//	let url = "https://www.recurrent.jp/instructor/pdf_view/5585__1726563225__0__text_pdf?type=customize";

	const win = new BaseWindow({
		width: w,
		height: h,
		// webPreferences: {
		// 	preload: path.join(__dirname, "source_preload.js"),
		// },
	});
	// win.loadURL(
	// 	"https://www.recurrent.jp/instructor/pdf_view/5585__1726563225__0__text_pdf?type=customize",
	// );
	// win.webContents.openDevTools();
	const view1 = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "source_preload.js"),
		},
	});

	view1.setBounds({ x: 32, y: 0, width: w - toolbar_w, height: h });
	win.contentView.addChildView(view1);
	if (url !== "") {
		view1.webContents.loadURL(url);
	}

	const view2 = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "toolbar_preload.js"),
		},
	});
	win.contentView.addChildView(view2);
	view2.webContents.loadFile("toolbar.html");
	view2.setBounds({
		x: 0,
		y: 0,
		width: toolbar_w,
		height: win.getContentSize()[1],
	});

	const addressBar = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "addressbar_preload.js"),
		},
	});
	addressBar.webContents.loadFile("addressbar.html");
	addressBar.setBounds({
		x: toolbar_w,
		y: 0,
		width: w - toolbar_w,
		height: 32,
	});

	// win.loadFile('index.html')

	view1.webContents.on("did-navigate", (_event, newUrl) => {
		url = newUrl;
		addressBar.webContents.send("setURL", newUrl);
	});
	view1.webContents.on("did-navigate-in-page", (_event, newUrl) => {
		url = newUrl;
		addressBar.webContents.send("setURL", newUrl);
	});

	ipcMain.on("toggleDevTool", (_event) => {
		view1.webContents.toggleDevTools();
	});
	ipcMain.on("setColor", (_event, color) => {
		view1.webContents.send("setColor", color);
	});
	ipcMain.on("clearAll", (_event) => {
		view1.webContents.send("clearAll");
	});
	ipcMain.on("setURL", (_event, newUrl) => {
		url = newUrl;
		view1.webContents.loadURL(newUrl);
	});
	ipcMain.on("browserBack", (_event) => {
		view1.webContents.goBack();
	});
	ipcMain.on("browserForward", (_event) => {
		view1.webContents.goForward();
	});
	ipcMain.on("browserReload", (_event) => {
		view1.webContents.reload();
	});
	ipcMain.on("toggleOverlay", (_event) => {
		isOverlay = !isOverlay;
		if (isOverlay) {
			view1.setBounds({
				x: 32,
				y: 0,
				width: w - toolbar_w,
				height: h,
			});
			win.contentView.removeChildView(addressBar);
		} else {
			view1.setBounds({
				x: 32,
				y: 32,
				width: w - toolbar_w,
				height: h - 32,
			});
			addressBar.webContents.send("setURL", url);
			win.contentView.addChildView(addressBar);
		}
	});
};

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

function handleSetTitle(event, title) {
	const webContents = event.sender;
	const win = BrowserWindow.fromWebContents(webContents);
	win.setTitle(title);
}

app.whenReady().then(() => {
	createWindow();
	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});
