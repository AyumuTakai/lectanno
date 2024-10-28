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

	view1.setBounds({ x: 32, y: 0, width: w - 32, height: h });
	win.contentView.addChildView(view1);
	// view1.webContents.loadURL("https://hackwork.jp");
	view1.webContents.loadURL(
		"https://www.recurrent.jp/instructor/pdf_view/5585__1726563225__0__text_pdf?type=customize",
	);
	// view1.webContents.openDevTools();

	const view2 = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "toolbar_preload.js"),
		},
	});
	win.contentView.addChildView(view2);
	view2.webContents.loadFile("toolbar.html");
	// view2.setBackgroundColor("#0000");
	// view2.webContents.backgroundThrottling;
	view2.setBounds({ x: 0, y: 0, width: 32, height: win.getContentSize()[1] });

	// win.loadFile('index.html')

	ipcMain.on("toggleDevTool", (_event) => {
		console.log("dev");
		view1.webContents.toggleDevTools();
	});
	ipcMain.on("setColor", (_event, color) => {
		console.log("setColor", color);
		view1.webContents.send("setColor", color);
	});
	ipcMain.on("clearAll", (_event) => {
		console.log("clearAll");
		view1.webContents.send("clearAll");
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
});
