
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

// messages server sends to clients
const INITIALIZE_BOARD = 			16; // 36 bytes: 1 byte for each slot
const MOVE_BOARD_ITEM = 	 		17; // 4 bytes: xold, yold, xnew, ynew
const DELETE_INV_ITEM =  			18; // 2 bytes: slot index, 0=thisPlayer or 1=otherPlayer
const CREATE_BOARD_ITEM =  			19; // 4 bytes: x, y, item id, 0=thisPlayer or 1=otherPlayer
const MOVE_INV_ITEM_TO_BOARD =  	20; // 3 bytes: x, y, 0=thisPlayer or 1=otherPlayer
const DELETE_BOARD_ITEM	=			21; // 2 bytes: x, y
const INITIALIZE_INV =				22; // 12 bytes: 1 byte for each slot, first 6 are thisPlayer, last 6 are otherPlayer
const CREATE_INV_ITEM = 			23; // 3 bytes: slot index, item id, 0=thisPlayer or 1=otherPlayer
const MOVE_ITEM_FAILED = 			24; // 2 bytes: x, y
const OPPONENTS_NAME =				25; // string
const GAME_ENDED = 					26; // 1 byte: 0 = opponent left, 1 = this player won, 2 = other player won
const SET_LOOT = 					27; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
const SET_HEALTH = 					28; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
const SET_DEFENSE = 				29; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
const SET_TURN = 					30;	// 1 byte: 0=thisPlayer or 1=otherPlayer
const OUT_OF_MATCHES = 				31; // 1 byte: 0=thisPlayer or 1=otherPlayer


// game properties
const INIT_LOOT = 0;
const INIT_HEALTH = 20;
const INIT_DEFENSE = 10;


var lookingForGame = null;


var server = net.createServer(function (socket) {
	console.log("client connected");
	
	function onSetName(data) {
		socket.name = data;
		console.log("new player: " + socket.name);
	}
	
	function onFindGame(data) {
		if (lookingForGame == null) {
			lookingForGame = socket;
		} else {
			
			socket.game = lookingforGame.game = new Game(socket, lookingForGame);
			
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
	
	messages.on("setName", onSetName);
	messages.on("findGame", onFindGame);
	messages.on("leaveGame", onLeaveGame);
	messages.on("tryMoveItem", onTryMoveItem);
	
	socket.on("data", function(data) {
		messages.call(msg);
	});
	
	socket.on("end", function() {
		if (lookingForGame == socket) {
			lookingForGame = null;
		}
		
		if (socket.game != null) {
			socket.game.playerLeft(socket);
		}
		
		messages.removeListener("setName", onSetName);
		messages.removeListener("findGame", onFindGame);
		messages.removeListener("leaveGame", onLeaveGame);
		messages.removeListener("tryMoveItem", onTryMoveItem);
		
		console.log("client disconnected: " + socket.name);
	});
	
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146