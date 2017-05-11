require('dns').lookup(require('os').hostname(), function (err, add, fam) {
  console.log('addr: '+add);
})





const Net = require("net");
const EventEmitter = require("events");

const messages = new EventEmitter();

const clientMessageLabels = {
	1:'joinGame',
	2:'setName',
	3:'leaveGame',
	4:'clickSlot'
};

const INITIALIZE_BOARD = 		16; // 36 bytes: 1 byte for each slot
const MOVE_BOARD_ITEM = 	 	17; // 4 bytes: xold, yold, xnew, ynew
const DELETE_INV_ITEM =  		18; // 2 bytes: slot index, 0=thisPlayer or 1=otherPlayer
const CREATE_BOARD_ITEM =  		19; // 4 bytes: x, y, item id, 0=thisPlayer or 1=otherPlayer
const MOVE_INV_ITEM_TO_BOARD =  20; // 4 bytes: inventory index, board x, board y, 0=thisPlayer or 1=otherPlayer
const DELETE_BOARD_ITEM	=		21; // 2 bytes: x, y
const INITIALIZE_INV =			22; // 12 bytes: 1 byte for each slot, first 6 are thisPlayer, last 6 are otherPlayer
const CREATE_INV_ITEM = 		23; // 3 bytes: slot index, item id, 0=thisPlayer or 1=otherPlayer
const MOVE_ITEM_FAILED = 		24; // 4 bytes: inventory index, board x, board y, 0=thisPlayer or 1=otherPlayer
const OPPONENTS_NAME =			25; // string

var lookingForGame = null;

function newMessage(label, dataLen) {
	var buf = Buffer.allocUnsafe(2 + dataLen);
	buf.writeInt8(label, 0);
	buf.writeInt8(dataLen, 1);
	return buf;
}




class Game {
	constructor(player1, player2) {
		this.player1 = player1;
		this.player2 = player2;
		
		this.board = new Array(6);
		this.board.fill(new Array(6));
		
		this.player1Inv = new Array(6);
		this.player2Inv = new Array(6);
		
		for (var i = 0; i < 6; i++) {
			player1Inv[i] = Math.floor(Math.random() * 6);
			player2Inv[i] = Math.floor(Math.random() * 6);
		}
		
		for (var x = 0; x < 6; x++) {
			for (var y = 6; y < 6; y++) {
				board[x][y] = Math.floor(Math.random() * 6);
			}
		}
		
	}
	
	initializeBoard() {
		var buf = newMessage(INITIALIZE_BOARD, 36);
		
		for (var x = 0; x < 6; x++) {
			for (var y = 6; y < 6; y++) {
				buf.writeInt8(board[x][y], ((y * 6) + x) + 2);
			}
		}
		
		player1.write(buf);
		//player2.write(buf);
	}
	
	moveBoardItem(x1, y1, x2, y2) {
		var buf = newMessage(MOVE_BOARD_ITEM, 4);
		
		board[x2][y2] = board[x1][y1];
		board[x1][y1] = null;
		
		buf.write(x1, 3);
		buf.write(y1, 4);
		buf.write(x2, 5);
		buf.write(y2, 6);
		
		player1.write(buf);
		player2.write(buf);
	}
	
	deleteInvItem(slot, player) {
		var buf1 = newMessage(DELETE_INV_ITEM, 2);
		var buf2 = newMessage(DELETE_INV_ITEM, 2);
		
		buf1.write(slot, 2);
		buf2.write(slot, 2);
		
		if (player == player1) {
			player1Inv[slot] = null;
			
			buf1.write(0, 3);
			buf2.write(1, 3);
			
		} else {
			player2Inv[slot] = null;
			
			buf2.write(0, 3);
			buf1.write(1, 3);
		}
		
		player1.write(buf1);
		player2.write(buf2);
		
		
	}
	
	createBoardItem(x, y, itemID, player) {
		var buf1 = newMessage(CREATE_BOARD_ITEM, 4);
		var buf2 = newMessage(CREATE_BOARD_ITEM, 4);
		
		board[x][y] = itemID;
		
		buf1.write(x, 2);
		buf1.write(y, 3);
		buf1.write(itemID, 4);
		
		buf2.write(x, 2);
		buf2.write(y, 3);
		buf2.write(itemID, 4);
		
		if (player1 == player) {
			buf1.write(0, 5);
			buf2.write(1, 5);
		} else {
			buf2.write(0, 5);
			buf1.write(1, 5);
			
		}
		
		player1.write(buf1);
		player2.write(buf2);
		
	}
	
	moveInvItemToBoard(slot, x, y, player) {
		var buf1 = newMessage(MOVE_INV_ITEM_TO_BOARD, 4);
		var buf2 = newMessage(MOVE_INV_ITEM_TO_BOARD, 4);
		
		board[x][y] = itemID;
		
		buf1.write(slot, 2);
		buf1.write(x, 3);
		buf1.write(y, 4);
		
		buf2.write(slot, 2);
		buf2.write(x, 3);
		buf2.write(y, 4);
		
		if (player1 == player) {
			buf1.write(0, 5);
			buf2.write(1, 5);
		} else {
			buf2.write(0, 5);
			buf1.write(1, 5);
			
		}
		
		player1.write(buf1);
		player2.write(buf2);
		
	}
	
	deleteBoardItem(x, y) {
		var buf = newMessage(DELETE_BOARD_ITEM, 2);
		
		board[x][y] = null;
		
		buf.write(x, 3);
		buf.write(y, 4);

		player1.write(buf);
		player2.write(buf);
	}
	
	initializeInv(x, y) {
		var buf1 = newMessage(INITIALIZE_INV, 12);
		var buf2 = newMessage(INITIALIZE_INV, 12);
		
		for (var i = 0; i < 6; i++) {
			buf1.write(player1Inv[i], i);
			buf1.write(player2Inv[i], 6 + i);
			
			buf2.write(player2Inv[i], i);
			buf2.write(player1Inv[i], 6 + i);
		}
		
		player1.write(buf1);
		player2.write(buf2);
	}
	
	createInvItem(slot, itemID, player) {
		var buf1 = newMessage(CREATE_INV_ITEM, 3);
		var buf2 = newMessage(CREATE_INV_ITEM, 3);
		
		buf1.write(slot, 2);
		buf2.write(slot, 2);
		
		if (player == player1) {
			player1Inv[slot] = null;
			
			buf1.write(0, 3);
			buf2.write(1, 3);
			
		} else {
			player2Inv[slot] = null;
			
			buf2.write(0, 3);
			buf1.write(1, 3);
		}
		
		player1.write(buf1);
		player2.write(buf2);
		
	}
	
	otherPlayer(player) {
		return player1 == player ? player2 : player1;
	}
	
	
	
	
}

var server = Net.createServer(function (socket) {
	console.log("client connected");
	
	socket.on("end", function() {
		if (lookingForGame == socket) {
			lookingForGame = null;
		}
		
		console.log("client disconnected: " + socket.name);
	});
	
	//socket.write("Hello");
	
	/*
	var msg = "Hello World!";
	
	var buf = Buffer.allocUnsafe(14);
	
	buf.writeInt8(1, 0);
	buf.writeInt8(12, 1);
	buf.write(msg, 2, 12, 'utf8');
	
	socket.write(buf);
	*/
	
	new Game(player, null).initializeBoard();
	
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
	
	messages.on("joinGame", function(data) {
		if (lookingForGame == null) {
			lookingForGame = socket;
		} else {
			
			
			
		}
	});
	
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146