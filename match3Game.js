const MatchArray = require("./matchArray");
const Game = require("./game");
const messages = require("./messages");

messages.labelRegistry[4] = 'tryMoveItem';

(function() {


	// messages server sends to clients
	const INITIALIZE_BOARD = 			16; // 36 bytes: 1 byte for each slot
	const MOVE_BOARD_ITEM = 	 		17; // 4 bytes: xold, yold, xnew, ynew
	const DELETE_INV_ITEM =  			18; // 2 bytes: slot index, 0=thisPlayer or 1=otherPlayer
	const CREATE_BOARD_ITEM =  			19; // 4 bytes: x, y, item id, 0=thisPlayer or 1=otherPlayer
	const MOVE_INV_ITEM_TO_BOARD =  	20; // 3 bytes: x, y, 0=thisPlayer or 1=otherPlayer
	const DELETE_BOARD_ITEM	=			21; // 3 bytes: x, y, how (0=match)
	const INITIALIZE_INV =				22; // 12 bytes: 1 byte for each slot, first 6 are thisPlayer, last 6 are otherPlayer
	const CREATE_INV_ITEM = 			23; // 3 bytes: slot index, item id, 0=thisPlayer or 1=otherPlayer
	const MOVE_ITEM_FAILED = 			24; // 3 bytes: x, y, match type
	const OUT_OF_MATCHES = 				31; // 1 byte: 0=thisPlayer or 1=otherPlayer
	
	const NORMAL_MATCH =				0;
	
	class Match3Game extends Game {
		constructor(player1, player2, width, height) {
			super(player1, player2);
			
			this.width = width;
			this.height = height;
			
			this.board = new Array(this.width);
		
			this.player1Inv = new Array(this.width);
			this.player2Inv = new Array(this.width);
		
			for (var i = 0; i < 6; i++) {
				this.player1Inv[i] = this.invItem(this.player1);
				this.player2Inv[i] = this.invItem(this.player2);
				
				this.board[i] = new Array(this.height);
			}
		
			for (var x = 0; x < this.width; x++) {
				for (var y = 0; y < this.height; y++) {
					this.board[x][y] = this.boardItem(x, y);
				}
			}
			
			this.matchTypes = {};
			this.matchTypes[NORMAL_MATCH] = this.normalMatch;
			
			var tryMoveItemListener1, tryMoveItemListener2;
			var game = this;
			
			player1.messages.on("tryMoveItem", tryMoveItemListener1 = function(data) {
				game.tryMoveItem(data.readInt8(0), data.readInt8(1), data.readInt8(2), player1);
			});
			
			player2.messages.on("tryMoveItem", tryMoveItemListener2 = function(data) {
				game.tryMoveItem(data.readInt8(0), data.readInt8(1), data.readInt8(2), player2);
			});
			
			this.events.on("gameEnd", function() {
				player1.messages.removeListener("tryMoveItem", tryMoveItemListener1);
				player2.messages.removeListener("tryMoveItem", tryMoveItemListener2);
			});
			
			this.initializeBoard();
			this.initializeInv();
		
		}
		
		invItem(slot, player) {
			return Math.floor(Math.random() * 6);
		}
		
		boardItem(x, y) {
			return Math.floor(Math.random() * 6);
		}
	
		initializeBoard() {
			var nx, ny;
			
			var buf1 = messages.newMessage(INITIALIZE_BOARD, this.width * this.height);
			var buf2 = messages.newMessage(INITIALIZE_BOARD, this.width * this.height);
		
			for (var y = 0; y < this.height; y++) {
				for (var x = 0; x < this.width; x++) {
					buf1.writeInt8(this.board[x][y], ((y * this.height) + x) + 2);
					
					buf2.writeInt8(this.board[this.width - 1 - x][this.height - 1 - y], ((y * this.height) + x) + 2);
				}
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
			
		}
	
		moveBoardItem(x1, y1, x2, y2) {
			var buf1 = messages.newMessage(MOVE_BOARD_ITEM, 4);
			var buf2 = messages.newMessage(MOVE_BOARD_ITEM, 4);
			
			this.board[x2][y2] = this.board[x1][y1];
			this.board[x1][y1] = null;
		
			buf1.writeInt8(x1, 2);
			buf1.writeInt8(y1, 3);
			buf1.writeInt8(x2, 4);
			buf1.writeInt8(y2, 5);
			
			buf2.writeInt8(this.width - 1 - x1, 2);
			buf2.writeInt8(this.height - 1 - y1, 3);
			buf2.writeInt8(this.width - 1 - x2, 4);
			buf2.writeInt8(this.height - 1 - y2, 5);
			
			this.player1.write(buf1);
			this.player2.write(buf2);
		}
	
		deleteInvItem(slot, player) {
			var buf1 = messages.newMessage(DELETE_INV_ITEM, 2);
			var buf2 = messages.newMessage(DELETE_INV_ITEM, 2);
		
			buf1.writeInt8(slot, 2);
			buf2.writeInt8(this.width - 1 - slot, 2);
		
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
			var buf1 = messages.newMessage(CREATE_BOARD_ITEM, 4);
			var buf2 = messages.newMessage(CREATE_BOARD_ITEM, 4);
		
			this.board[x][y] = itemID;
		
			buf1.writeInt8(x, 2);
			buf1.writeInt8(y, 3);
			buf1.writeInt8(itemID, 4);
		
			buf2.writeInt8(this.width - 1 - x, 2);
			buf2.writeInt8(this.height - 1 - y, 3);
			buf2.writeInt8(itemID, 4);
		
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
	
		moveInvItemToBoard(x, y, player) {
			var buf1 = messages.newMessage(MOVE_INV_ITEM_TO_BOARD, 3);
			var buf2 = messages.newMessage(MOVE_INV_ITEM_TO_BOARD, 3);
			
			buf1.writeInt8(x, 2);
			buf1.writeInt8(y, 3);
		
			buf2.writeInt8(this.width - 1 - x, 2);
			buf2.writeInt8(this.height - 1 - y, 3);
		
			if (this.player1 == player) {
				buf1.writeInt8(0, 4);
				buf2.writeInt8(1, 4);
			} else {
				buf2.writeInt8(0, 4);
				buf1.writeInt8(1, 4);
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		
		}
	
		deleteBoardItem(x, y, how) {
			var buf1 = messages.newMessage(DELETE_BOARD_ITEM, 3);
			var buf2 = messages.newMessage(DELETE_BOARD_ITEM, 3);
		
			this.board[x][y] = null;
		
			buf1.writeInt8(x, 2);
			buf1.writeInt8(y, 3);
			buf1.writeInt8(how, 4);
			
			buf2.writeInt8(this.width - 1 - x, 2);
			buf2.writeInt8(this.height - 1 - y, 3);
			buf2.writeInt8(how, 4);
			
			this.player1.write(buf1);
			this.player2.write(buf2);
		}
	
		initializeInv(x, y) {
			var buf1 = messages.newMessage(INITIALIZE_INV, 12);
			var buf2 = messages.newMessage(INITIALIZE_INV, 12);
		
			for (var i = 0; i < this.width; i++) {
				buf1.writeInt8(this.player1Inv[i], 2 + i);
				buf1.writeInt8(this.player2Inv[i], 2 + this.width + i);
			
				buf2.writeInt8(this.player2Inv[i], 2 + (this.width - 1 - i));
				buf2.writeInt8(this.player1Inv[i], 2 + this.width + (this.width - 1 - i));
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		}
	
		createInvItem(slot, itemID, player) {
			var buf1 = messages.newMessage(CREATE_INV_ITEM, 3);
			var buf2 = messages.newMessage(CREATE_INV_ITEM, 3);
		
			buf1.writeInt8(slot, 2);
			buf2.writeInt8(this.width - 1 - slot, 2);
			
			buf1.writeInt8(itemID, 3);
			buf2.writeInt8(itemID, 3);
			
			if (player == this.player1) {
				this.player1Inv[slot] = itemID;
			
				buf1.writeInt8(0, 4);
				buf2.writeInt8(1, 4);
			
			} else {
				this.player2Inv[slot] = itemID;
			
				buf2.writeInt8(0, 4);
				buf1.writeInt8(1, 4);
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		
		}
	
		moveItemFailed(x, y, player, how) {
			var buf = messages.newMessage(MOVE_ITEM_FAILED, 3);
			
			if (player == this.player1) {
				buf.writeInt8(x, 2);
				buf.writeInt8(y, 3);
			} else {
				buf.writeInt8(this.width - 1 - x, 2);
				buf.writeInt8(this.height - 1 - y, 3);
			}
			
			buf.writeInt8(how, 4)
		
			player.write(buf);
		}
		
		outOfMatches(player) {
			var buf1 = messages.newMessage(OUT_OF_MATCHES, 1);
			var buf2 = messages.newMessage(OUT_OF_MATCHES, 1);
		
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
	
		tryMoveItem(x, y, how, player) {
			if (this.turn != player) {
				return;
			}
			
			if (player == this.player2) {
				x = this.width - 1 - x;
				y = this.height - 1 - y;
			}
			
			var matches = new MatchArray();
			
			if (this.matchTypes[how](this, x, y, matches, player)) {
				
				this.events.emit("match", player, matches, how);
			
				for (var m in matches) {
					this.deleteBoardItem(matches[m].x, matches[m].y, how);
				}
			
				if (player == this.player1) {
					this.fillDown();
				} else {
					this.fillUp();
				}
				
				if (player == this.player1) {
					
					if (this.anyMatches(this.player2Inv)) {
						this.setTurn(this.player2);
					} else {
						this.outOfMatches(this.player2);
					}
				
				} else {
					
					if (this.anyMatches(this.player1Inv)) {
						this.setTurn(this.player1);
					} else {
						this.outOfMatches(this.player1);
					}
				
				}
				
			} else {
			
				this.moveItemFailed(x, y, player, how);
			
			}
		
		}
		
		normalMatch(game, x, y, matches, player) {
			var item = (player == game.player1 ? game.player1Inv[x] : game.player2Inv[x]);
			
			game.checkForMatches(x, y, item, matches);
			
			if (matches.length < 3) {
				return false;
			}
			
			game.moveInvItemToBoard(x, y, player);
			
			game.deleteInvItem(x, player);
			game.createInvItem(x, game.invItem(player), player);
			
			return true;
			
		}
	
		checkForMatches(x, y, item, matches) {
			
			if (!matches.contains(x, y)) {
				matches.push(item, x, y);
			}
			
			if (y + 1 < this.height) {
				this.checkIfMatch(x, y + 1, item, matches);
			}
		
			if (x + 1 < this.width) {
				this.checkIfMatch(x + 1, y, item, matches);
			}
		
			if (y - 1 >= 0) {
				this.checkIfMatch(x, y - 1, item, matches);
			}
		
			if (x - 1 >= 0) {
				this.checkIfMatch(x - 1, y, item, matches);
			}
		
		}
		
		checkIfMatch(tx, ty, item, matches) {
			var test = this.board[tx][ty];
			
			if (test === item && !matches.contains(tx, ty)) {
				matches.push(test, tx, ty);
				this.checkForMatches(tx, ty, item, matches);
			}
			
		}
		
		anyMatches(inv) {
			var matches;
		
			for (var x = 0; x < this.width; x++) {
			
				for (var y = 0; y < this.height; y++) {
				
					matches = new MatchArray();
					this.checkForMatches(x, y, inv[x], matches);
				
					if (matches.length >= 3) {
						return true;
					}
				
				}
			
			}
		
			return false;
		}
	
		fillDown() {
		
			var ground;
		
			for (var x = 0; x < this.width; x++) {
			
				ground = 0;
			
				for (var y = 0; y < this.height; y++) {
				
					if (this.board[x][y] != null) {
					
						if (ground != y) {
							this.moveBoardItem(x, y, x, ground);
						}
						
						ground++;
					
					}
				
				}
			
				for (var i = ground; i < this.height; i++) {
					this.createBoardItem(x, i, this.boardItem(this.player1), this.player1);
				}
			
			}
			
		}
	
		fillUp() {
		
			var ground;
		
			for (var x = 0; x < this.width; x++) {
			
				ground = this.height - 1;
			
				for (var y = this.height - 1; y >= 0; y--) {
				
					if (this.board[x][y] != null) {
					
						if (ground != y) {
							this.moveBoardItem(x, y, x, ground);
						}
						
						ground--;
						
					}
				
				}
			
				for (var i = ground; i >= 0; i--) {
					this.createBoardItem(x, i, this.boardItem(this.player2), this.player2);
				}
			}
		
		}
	
	
	}
	
	module.exports = Match3Game;
	
}());