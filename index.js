var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);
const tvNamespace = io.of("/tv");
var robot = require("robotjs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);

async function mute() {
	const { stdout, stderr } = await exec("amixer set Master toggle");
	console.log("stdout:", stdout);
	console.log("stderr:", stderr);
}
const remoteNamespace = io.of("/remote");

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/../build/index.html");
});
let tvSocket;
tvNamespace.on("connection", (socket) => {
	tvSocket = socket;
	console.log("TV Connected!");

	// socket.on("messageFromTV", (message) => {
	// 	remoteNamespace.emit("messageFromTV", message);
	// });
	// Broadcast to all remotes to get the state right
	socket.on("tvState", (tabs) => {
		remoteNamespace.emit("tvState", tabs);
	});
	socket.on("bookmarks", (tabs) => {
		remoteNamespace.emit("bookmarks", tabs);
	});

	socket.on("updatedTab", (tab) => {
		remoteNamespace.emit("updatedTab", tab);
	});
	socket.on("activatedTab", (tab) => {
		remoteNamespace.emit("activatedTab", tab);
	});
	socket.on("createdTab", (tab) => {
		remoteNamespace.emit("createdTab", tab);
	});
	socket.on("removedTab", (tab) => {
		remoteNamespace.emit("removedTab", tab);
	});
	socket.on("createdBookmark", (bookmark) => {
		remoteNamespace.emit("createdBookmark", bookmark);
	});
	socket.on("removedBookmark", (bookmark) => {
		remoteNamespace.emit("removedBookmark", bookmark);
	});
});

remoteNamespace.on("connection", async (socket) => {
	console.log("Remote Connected!");
	// Request TV state to get it on new remote
	if (tvSocket) {
		tvSocket.emit("readTvState", (tabs) => {
			socket.emit("tvState", tabs);
		});
		tvSocket.emit("readBookmarks", (bookmarks) => {
			socket.emit("bookmarks", bookmarks);
		});
	}

	socket.on("messageFromRemote", (message, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("messageFromRemote", message, (createdTab) => {
			callback(createdTab);
		});
	});

	socket.on("createTab", (requestedTab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("createTab", requestedTab, (createdTab) => {
			callback(createdTab);
		});
	});
	socket.on("updateTab", (tab, update, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("updateTab", tab, update, (updatedTab) => {
			callback(updatedTab);
		});
	});
	socket.on("removeTab", (tab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("removeTab", tab, () => {
			callback(tab);
		});
	});
	socket.on("readHistory", (search, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("readHistory", search, (searchResults) => {
			callback(searchResults);
		});
	});

	socket.on("searchInTab", (tab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("searchInTab", tab, (searchResults) => {
			callback(searchResults);
		});
	});
	socket.on("navigateTab", (tab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("navigateTab", tab, () => {
			callback();
		});
	});
	socket.on("reloadTab", (tab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("reloadTab", tab, () => {
			callback();
		});
	});
	socket.on("zoom", (tab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("zoom", tab, () => {
			callback();
		});
	});
	socket.on("createBookmark", (bookmark, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("createBookmark", bookmark, callback);
	});
	socket.on("removeBookmark", (bookmark, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("removeBookmark", bookmark, callback);
	});
	socket.on("playVideo", (tab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("playVideo", tab, callback);
	});
	socket.on("fullscreenVideo", (tab, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("fullscreenVideo", tab, callback);
		robot.keyTap("a");
	});
	socket.on("moveMouse", (id, coordiantes, callback) => {
		if (!tvSocket) return;
		const { x, y } = robot.getMousePos();
		robot.setMouseDelay(1);
		coordiantes.forEach((coordiante) => {
			robot.moveMouse(x + 2 * coordiante.x, y + 2 * coordiante.y);
		});
	});
	// browser based not good exp
	socket.on("scroll", (id, coordiantes, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("scroll", id, coordiantes, callback);
	});
	socket.on("mute", async (callback) => {
		// if (!tvSocket) return;
		// tvSocket.emit("scroll", id, coordiantes, callback);\
		await mute();
		callback();
	});

	socket.on("click", (callback) => {
		if (!tvSocket) return;
		robot.mouseClick();
	});
	socket.on("searchSite", (info, callback) => {
		if (!tvSocket) return;
		tvSocket.emit("searchSite", info, () => {
			robot.keyTap("enter");
			callback();
		});
	});
});

console.log("BYE");
http.listen(3001, () => {
	console.log("listening on *:3001");
});
