
const net = require("net");
const EventEmitter = require("events");
const messages = require("./messages");
const Match3Game = require("./match3Game");

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
	
	socket.messages = new EventEmitter();
	
	
	socket.messages.on("setName", function onSetName(data) {
		socket.name = data;
		console.log("new player: " + socket.name);
	});
	
	socket.messages.on("findGame", function onFindGame(data) {
		if (lookingForGame == null) {
			lookingForGame = socket;
		} else {
			
			socket.game = lookingForGame.game = new Match3Game(socket, lookingForGame, 6, 6);
			
			console.log("created new game with " + socket.name + " and " + lookingForGame.name);
			
			lookingForGame = null;
			
			
		}
	});
	
	socket.messages.on("leaveGame", function onLeaveGame(data) {
		if (socket.game != null) {
			socket.game.playerLeft(socket);
		}
	});
	
	socket.messages.on("tryMoveItem", function onTryMoveItem(data) {
		if (socket.game != null) {
			socket.game.tryMoveItem(data.readInt8(0), data.readInt8(1), socket);
		}
	});
	
	socket.on("data", function(data) {
		messages.call(socket.messages, data);
	});
	
	socket.on("end", function() {
		if (lookingForGame == socket) {
			lookingForGame = null;
		}
		
		if (socket.game != null) {
			socket.game.playerLeft(socket);
		}
		
		console.log("client disconnected: " + socket.name);
	});
	
	
	socket.messages.emit("findGame", null);
	
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146