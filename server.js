

const Net = require("net");
const EventEmitter = require("events");

const messages = new EventEmitter();

// messages server received from clients
const clientMessageLabels = {
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

var lookingForGame = null;

function newMessage(label, dataLen) {
	var buf = Buffer.allocUnsafe(2 + dataLen);
	buf.writeInt8(label, 0);
	buf.writeInt8(dataLen, 1);
	return buf;
}

function position(x, y) {
	return {'x': x, 'y': y};
}

// game properties
const INIT_LOOT = 0;
const INIT_HEALTH = 20;
const INIT_DEFENSE = 10;




class Game {
	constructor(player1, player2) {
		this.player1 = player1;
		this.player2 = player2;
		
		this.board = new Array(6);
		
		this.player1Inv = new Array(6);
		this.player2Inv = new Array(6);
		
		for (var i = 0; i < 6; i++) {
			this.player1Inv[i] = Math.floor(Math.random() * 6);
			this.player2Inv[i] = Math.floor(Math.random() * 6);
			
			this.board[i] = new Array(6);
		}
		
		for (var x = 0; x < 6; x++) {
			for (var y = 0; y < 6; y++) {
				this.board[x][y] = Math.floor(Math.random() * 6);
			}
		}
		
		this.setHealth(this.player1, INIT_HEALTH);
		this.setHealth(this.player2, INIT_HEALTH);
		this.setDefense(this.player1, INIT_DEFENSE);
		this.setDefense(this.player2, INIT_DEFENSE);
		this.setLoot(this.player1, INIT_LOOT);
		this.setLoot(this.player2, INIT_LOOT);
		
		this.giveOpponentsName();
		this.initializeBoard();
		
		this.setTurn(Math.random() > 0.5 ? this.player1 : this.player2);
		
	}
	
	initializeBoard() {
		var buf = newMessage(INITIALIZE_BOARD, 36);
		
		for (var y = 0; y < 6; y++) {
			for (var x = 0; x < 6; x++) {
				buf.writeInt8(this.board[x][y], ((y * 6) + x) + 2);
			}
		}
		
		this.player1.write(buf);
		this.player2.write(buf);
	}
	
	moveBoardItem(x1, y1, x2, y2) {
		var buf = newMessage(MOVE_BOARD_ITEM, 4);
		
		this.board[x2][y2] = this.board[x1][y1];
		this.board[x1][y1] = null;
		
		buf.writeInt8(x1, 2);
		buf.writeInt8(y1, 3);
		buf.writeInt8(x2, 4);
		buf.writeInt8(y2, 5);
		
		this.player1.write(buf);
		this.player2.write(buf);
	}
	
	deleteInvItem(slot, player) {
		var buf1 = newMessage(DELETE_INV_ITEM, 2);
		var buf2 = newMessage(DELETE_INV_ITEM, 2);
		
		buf1.writeInt8(slot, 2);
		buf2.writeInt8(slot, 2);
		
		if (player == this.player1) {
			this.player1Inv[slot] = null;
			
			buf1.writeInt8(0, 3);
			buf2.writeInt8(1, 3);
			
		} else {
			this.player2Inv[slot] = null;
			
			buf2.writeInt8(0, 3);
			buf1.writeInt8(1, 3);
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
		
		
	}
	
	createBoardItem(x, y, itemID, player) {
		var buf1 = newMessage(CREATE_BOARD_ITEM, 4);
		var buf2 = newMessage(CREATE_BOARD_ITEM, 4);
		
		this.board[x][y] = itemID;
		
		buf1.writeInt8(x, 2);
		buf1.writeInt8(y, 3);
		buf1.writeInt8(itemID, 4);
		
		buf2.writeInt8(x, 2);
		buf2.writeInt8(y, 3);
		buf2.writeInt8(itemID, 4);
		
		if (this.player1 == player) {
			buf1.writeInt8(0, 5);
			buf2.writeInt8(1, 5);
		} else {
			buf2.write(0, 5);
			buf1.write(1, 5);
			
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
		
	}
	
	moveInvItemToBoard(slot, x, y, player) {
		var buf1 = newMessage(MOVE_INV_ITEM_TO_BOARD, 4);
		var buf2 = newMessage(MOVE_INV_ITEM_TO_BOARD, 4);
		
		this.board[x][y] = itemID;
		
		buf1.writeInt8(slot, 2);
		buf1.writeInt8(x, 3);
		buf1.writeInt8(y, 4);
		
		buf2.writeInt8(slot, 2);
		buf2.writeInt8(x, 3);
		buf2.writeInt8(y, 4);
		
		if (this.player1 == player) {
			buf1.writeInt8(0, 5);
			buf2.writeInt8(1, 5);
		} else {
			buf2.writeInt8(0, 5);
			buf1.writeInt8(1, 5);
			
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
		
	}
	
	deleteBoardItem(x, y) {
		var buf = newMessage(DELETE_BOARD_ITEM, 2);
		
		this.board[x][y] = null;
		
		buf.writeInt8(x, 2);
		buf.writeInt8(y, 3);

		this.player1.write(buf);
		this.player2.write(buf);
	}
	
	initializeInv(x, y) {
		var buf1 = newMessage(INITIALIZE_INV, 12);
		var buf2 = newMessage(INITIALIZE_INV, 12);
		
		for (var i = 0; i < 6; i++) {
			buf1.writeInt8(this.player1Inv[i], 2 + i);
			buf1.writeInt8(this.player2Inv[i], 8 + i);
			
			buf2.writeInt8(this.player2Inv[i], 2 + i);
			buf2.writeInt8(this.player1Inv[i], 8 + i);
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
	}
	
	createInvItem(slot, itemID, player) {
		var buf1 = newMessage(CREATE_INV_ITEM, 3);
		var buf2 = newMessage(CREATE_INV_ITEM, 3);
		
		buf1.writeInt8(slot, 2);
		buf2.writeInt8(slot, 2);
		
		if (player == this.player1) {
			this.player1Inv[slot] = null;
			
			buf1.writeInt8(0, 3);
			buf2.writeInt8(1, 3);
			
		} else {
			this.player2Inv[slot] = null;
			
			buf2.writeInt8(0, 3);
			buf1.writeInt8(1, 3);
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
		
	}
	
	moveItemFailed(x, y, player) {
		var buf = newMessage(MOVE_ITEM_FAILED, 2);
		
		buf.writeInt8(x, 2);
		buf.writeInt8(y, 3);
		
		player.write(buf);
	}
	
	giveOpponentsName() {
		var buf1 = newMessage(OPPONENTS_NAME, this.player1.name.length);
		var buf2 = newMessage(OPPONENTS_NAME, this.player2.name.length);
		
		buf1.write(this.player2.name, 2, this.player2.name.length, 'utf8');
		buf2.write(this.player1.name, 2, this,player1.name.length, 'utf8');
		
		this.player1.write(buf1);
		this.player2.write(buf2);
		
	}
	
	gameWon(player) {
		var buf1 = newMessage(GAME_ENDED, 1);
		var buf2 = newMessage(GAME_ENDED, 1);
		
		if (player == this.player1) {
			buf1.writeInt8(1, 2);
			buf2.writeInt8(2, 2);
		} else {
			buf1.writeInt8(2, 2);
			buf2.writeInt8(1, 2);
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
		
	}
	
	playerLeft(player) {
		var buf = newMessage(GAME_ENDED, 1);
		
		buf.writeInt8(0, 2);
		
		if (player == this.player1) {
			this.player2.write(buf);
		} else {
			this.player1.write(buf);
		}
	}
	
	setLoot(player, value) {
		player.loot = value;
		
		var buf1 = newMessage(SET_LOOT, 3);
		var buf2 = newMessage(SET_LOOT, 3);
		
		buf1.writeUInt16LE(player.loot, 2);
		buf2.writeUInt16LE(player.loot, 2);
		
		if (player == this.player1) {
			buf1.writeInt8(0, 4);
			buf2.writeInt8(1, 4);
		} else {
			buf2.writeInt8(0, 4);
			buf1.writeInt8(1, 4);
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
	}
	
	setHealth(player, value) {
		player.health = value;
		
		var buf1 = newMessage(SET_HEALTH, 3);
		var buf2 = newMessage(SET_HEALTH, 3);
		
		buf1.writeUInt16LE(player.health, 2);
		buf2.writeUInt16LE(player.health, 2);
		
		if (player == this.player1) {
			buf1.writeInt8(0, 4);
			buf2.writeInt8(1, 4);
		} else {
			buf2.writeInt8(0, 4);
			buf1.writeInt8(1, 4);
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
	}
	
	setDefense(player, value) {
		player.defense = value;
		
		var buf1 = newMessage(SET_DEFENSE, 3);
		var buf2 = newMessage(SET_DEFENSE, 3);
		
		buf1.writeUInt16LE(player.defense, 2);
		buf2.writeUInt16LE(player.defense, 2);
		
		if (player == this.player1) {
			buf1.writeInt8(0, 4);
			buf2.writeInt8(1, 4);
		} else {
			buf2.writeInt8(0, 4);
			buf1.writeInt8(1, 4);
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
	}
	
	setTurn(player) {
		this.turn = player;
		
		var buf1 = newMessage(SET_TURN, 1);
		var buf2 = newMessage(SET_TURN, 1);
		
		if (player == this.player1) {
			buf1.writeInt8(0, 2);
			buf2.writeInt8(1, 2)
		} else {
			buf2.writeInt8(0, 2);
			buf1.writeInt8(1, 2)
		}
		
		this.player1.write(buf1);
		this.player2.write(buf2);
	}
	
	tryMoveItem(x, y, player) {
		var matches = this.checkForMatches(x, y, new Array());
		
		if (matches.length >= 3) {
			
			for (var m in matches) {
				this.deleteBoardItem(m.x, m.y);
			}
			
			this.deleteInvItem(x, player);
			this.createInvItem(x, Math.floor(Math.random() * 6), player);
			
			if (player == this.player1) {
				this.fillDown();
			} else {
				this.fillUp();
			}
			
			this.setTurn(this.turn == this.player1 ? this.player2 : this.player1);
			
		} else {
			
			this.moveItemFailed(x, y, player);
			
		}
		
	}
	
	checkForMatches(x, y, item, matches) {
		
		var herePos = position(x, y), test, testPos;
		
		if (y + 1 < 6) {
			testPos = position(x, y + 1);
			
			test = this.board[testPos.x][testPos.y];
			
			if (test == item && !matches.contains(testPos)) {
				arr.push(testPos);
				this.checkForMatches(testPos.x, testPos.y, matches);
			}
		}
		
		if (x + 1 < 6) {
			testPos = position(x + 1, y);
			
			test = this.board[testPos.x][testPos.y];
			
			if (test == item && !matches.contains(testPos)) {
				arr.push(testPos);
				this.checkForMatches(testPos.x, testPos.y, matches);
			}
		}
		
		if (y - 1 >= 0) {
			testPos = position(x, y - 1);
			
			test = this.board[testPos.x][testPos.y];
			
			if (test == item && !matches.contains(testPos)) {
				arr.push(testPos);
				this.checkForMatches(testPos.x, testPos.y, matches);
			}
		}
		
		if (x - 1 >= 0) {
			testPos = position(x - 1, y);
			
			test = this.board[testPos.x][testPos.y];
			
			if (test == item && !matches.contains(testPos)) {
				arr.push(testPos);
				this.checkForMatches(testPos.x, testPos.y, matches);
			}
		}
		

		if (!matches.contains(herePos)) {
			matches.push(herePos);
		}
		
		return matches;
	}
	
	anyMatches(inv) {
		for (var x = 0; x < 6; x++) {
			
			for (var y = 0; y < 6; y++) {
				
				if (checkForMatches(x, y, inv[x], new Array())) {
					return true;
				}
				
			}
			
		}
		
		return false;
	}
	
	fillDown() {
		
		var ground;
		
		for (var x = 0; x < 6; x++) {
			
			ground = 0;
			
			for (var y = 0; y < 6; y++) {
				
				if (this.board[x][y] != null) {
					
					ground++;
					
					if (ground != y) {
						this.moveBoardItem(x, y, x, ground);
					}
					
				}
				
			}
			
			for (var i = ground; i < 6; i++) {
				this.createBoardItem(x, i, Math.floor(Math.random() * 6), this.player1);
			}
			
		}
		
		
		
		
	}
	
	fillUp() {
		
		var ground;
		
		for (var x = 0; x < 6; x++) {
			
			ground = 5;
			
			for (var y = 5; y >= 0; y--) {
				
				if (this.board[x][y] != null) {
					
					ground--;
					
					if (ground != y) {
						this.moveBoardItem(x, y, x, ground);
					}
				}
				
			}
			
			for (var i = ground; i >= 0; i--) {
				this.createBoardItem(x, i, Math.floor(Math.random() * 6), this.player2);
			}
		}
		
	}
	
	
}

var server = Net.createServer(function (socket) {
	console.log("client connected");
	
	
	socket.on("data", function(msg) {
		
		var byteCount = msg[1];
		var data = msg.slice(2);
		var label = clientMessageLabels[msg[0]];
		
		if (label != null) {
			messages.emit(label, data);
		} else {
			console.log("Received unknown label: " + msg[0]);
		}
		
	});
	
	messages.on("setName", function(data) {
		socket.name = data;
		console.log("new player: " + socket.name);
	});
	
	messages.on("findGame", function(data) {
		if (lookingForGame == null) {
			lookingForGame = socket;
		} else {
			
			socket.game = lookingforGame.game = new Game(socket, lookingForGame);
			
			lookingForGame = null;
			
		}
	});
	
	messages.on("leaveGame", function(data) {
		if (socket.game != null) {
			socket.game.playerLeft(socket);
		}
	});
	
	messages.on("tryMoveItem", function(data) {
		if (socket.game != null) {
			socket.game.tryMoveItem(data.readInt8(0), data.readInt8(1), socket);
		}
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
	
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146