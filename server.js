
const net = require("net");
const EventEmitter = require("events");
const messages = require("./messages");
const GemBattleGame = require("./gemBattleGame");

// messages server received from clients
messages.labelRegistry[2] = 'setName';
messages.labelRegistry[3] = 'leaveGame';

var lookingForGame = null;


var server = net.createServer(function (socket) {
	console.log("client connected");
	
	socket.name = "no name";
	
	socket.messages = new EventEmitter();
	
	socket.on("data", function(data) {
		messages.call(socket.messages, data);
	});
	
	socket.messages.on("setName", function onSetName(data) {
		socket.name = data.toString();
		
		if (lookingForGame == null) {
			
			lookingForGame = socket;
			
		} else {
			
			socket.game = lookingForGame.game = new GemBattleGame(socket, lookingForGame, 6, 6);
			
			console.log("created new game with " + socket.name + " and " + lookingForGame.name);
			
			lookingForGame = null;
			
			
		}
	});
	
	socket.on("end", function() {
		if (lookingForGame == socket) {
			lookingForGame = null;
		}
		
		console.log("client disconnected: " + socket.name);
	});
	
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146