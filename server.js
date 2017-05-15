
const net = require("net");
const EventEmitter = require("events");
const messages = require("./messages");
const Game = require("./game");

// messages server received from clients
messages.labelRegistry = {
	1:'findGame',
	2:'setName',
	3:'leaveGame',
	4:'tryMoveItem'
};


var lookingForGame = null;


var server = net.createServer(function (socket) {
	console.log("client connected");
	
	socket.name = "no name";
	
	function onSetName(data) {
		socket.name = data;
		console.log("new player: " + socket.name);
	}
	
	function onFindGame(data) {
		if (lookingForGame == null) {
			lookingForGame = socket;
		} else {
			
			socket.game = lookingForGame.game = new Game(socket, lookingForGame);
			
			console.log("created new game with " + socket.name + " and " + lookingForGame.name);
			
			lookingForGame = null;
			
			
		}
	}
	
	
	function onLeaveGame(data) {
		if (socket.game != null) {
			socket.game.playerLeft(socket);
		}
	}
	
	function onTryMoveItem(data) {
		if (socket.game != null) {
			socket.game.tryMoveItem(data.readInt8(0), data.readInt8(1), socket);
		}
	}
	
	messages.event.on("setName", onSetName);
	messages.event.on("findGame", onFindGame);
	messages.event.on("leaveGame", onLeaveGame);
	messages.event.on("tryMoveItem", onTryMoveItem);
	
	socket.on("data", function(data) {
		messages.call(data);
	});
	
	socket.on("end", function() {
		if (lookingForGame == socket) {
			lookingForGame = null;
		}
		
		if (socket.game != null) {
			socket.game.playerLeft(socket);
			socket.game = null;
		}
		
		messages.event.removeListener("setName", onSetName);
		messages.event.removeListener("findGame", onFindGame);
		messages.event.removeListener("leaveGame", onLeaveGame);
		messages.event.removeListener("tryMoveItem", onTryMoveItem);
		
		console.log("client disconnected: " + socket.name);
	});
	
	
	onFindGame(null);
	
	
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146