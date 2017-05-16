
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
	
	var messageEvents = new EventEmitter();
	
	
	messageEvents.on("setName", function onSetName(data) {
		socket.name = data;
		console.log("new player: " + socket.name);
	});
	
	messageEvents.on("findGame", function onFindGame(data) {
		if (lookingForGame == null) {
			lookingForGame = socket;
		} else {
			
			socket.game = lookingForGame.game = new Game(socket, lookingForGame);
			
			console.log("created new game with " + socket.name + " and " + lookingForGame.name);
			
			lookingForGame = null;
			
			
		}
	});
	
	messageEvents.on("leaveGame", function onLeaveGame(data) {
		if (socket.game != null) {
			socket.game.playerLeft(socket);
		}
	});
	
	messageEvents.on("tryMoveItem", function onTryMoveItem(data) {
		if (socket.game != null) {
			socket.game.tryMoveItem(data.readInt8(0), data.readInt8(1), socket);
		}
	});
	
	socket.on("data", function(data) {
		messages.call(messageEvents, data);
	});
	
	socket.on("end", function() {
		if (lookingForGame == socket) {
			lookingForGame = null;
		}
		
		if (socket.game != null) {
			socket.game.playerLeft(socket);
			socket.game = null;
		}
		
		console.log("client disconnected: " + socket.name);
	});
	
	
	messageEvents.emit("findGame", null);
	
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146