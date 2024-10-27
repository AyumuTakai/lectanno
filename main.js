const {
	app,
	BaseWindow,
	WebContentsView,
	ipcMain,
	BrowserWindow,
} = require("electron");
const path = require("node:path");

const createWindow = (view1) => {
	const w = 800;
	const h = 600;
	const win = new BrowserWindow({
		width: w,
		height: h,
		webPreferences: {
			preload: path.join(__dirname, "source_preload.js"),
		},
	});
	win.loadURL(
		"https://www.recurrent.jp/instructor/pdf_view/5585__1726563225__0__text_pdf?type=customize",
	);
	win.webContents.openDevTools();

	// win.contentView.addChildView(view1);
	// // view1.webContents.loadURL("https://hackwork.jp");
	// view1.webContents.loadURL(
	// 	"https://www.recurrent.jp/instructor/pdf_view/5585__1726563225__0__text_pdf?type=customize",
	// );

	// view1.setBounds({ x: 0, y: 0, width: w, height: h });

	// const view2 = new WebContentsView({});
	// win.contentView.addChildView(view2);
	// view2.webContents.loadFile("index.html");
	// view2.setBackgroundColor("#0000");
	// view2.webContents.backgroundThrottling;
	// view2.setBounds({ x: 0, y: 0, width: w, height: h });

	// win.loadFile('index.html')
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
	const view1 = new WebContentsView({
		webPreferences: {
			preload: path.join(__dirname, "source_preload.js"),
		},
	});
	ipcMain.on("set-title", handleSetTitle);
	ipcMain.on("onWheel", (_event, wheelEvent) => {
		view1.webContents.send("wheel", wheelEvent);
		console.log({ wheelEvent });
	});

	createWindow(view1);
});
