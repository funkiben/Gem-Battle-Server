
const net = require("net");
const EventEmitter = require("events");
const messages = require("./messages");

const START = 2;
const LEAVE = 3;
const TRY_MOVE = 4;
const END_TURN = 5;
const NAME = 6;

messages.labelRegistry[START] = "startGame";
messages.labelRegistry[LEAVE] = "leave";
messages.labelRegistry[TRY_MOVE] = "tryMove";
messages.labelRegistry[END_TURN] = "endTurn";
messages.labelRegistry[NAME] = "setName";

var lookingForGame = null;

var server = net.createServer(function (socket) {
	console.log("client connected");
	
	socket.name = "no name";
	
	socket.messages = new EventEmitter();
	
	socket.on("data", function(data) {
		messages.call(socket.messages, data);

		if (socket.opponent != null) {
			socket.opponent.write(data);
		}
	});

	socket.messages.on("startGame", function(data) {
		
		if (lookingForGame == null) {
			
			lookingForGame = socket;

			console.log(lookingForGame.name + " looking for game");
			
		} else {
			
			socket.opponent = lookingForGame;
			lookingForGame.opponent = socket;

			var msg = messages.newMessage(START, data.length);
			data.copy(msg, 2);
			msg.writeInt8(0, 4);
			socket.write(msg);
			
			console.log("created new game with " + socket.name + " and " + lookingForGame.name);
			
			lookingForGame = null;
			
			
		}

	});
	
	socket.messages.on("setName", function onSetName(data) {
		socket.name = data.toString();
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