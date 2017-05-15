messages = require("./messages.js");

(function() {

	function position(x, y) {
		return {'x': x, 'y': y};
	}
	
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
			var buf = messages.newMessage(INITIALIZE_BOARD, 36);
		
			for (var y = 0; y < 6; y++) {
				for (var x = 0; x < 6; x++) {
					buf.writeInt8(this.board[x][y], ((y * 6) + x) + 2);
				}
			}
		
			this.player1.write(buf);
			this.player2.write(buf);
		}
	
		moveBoardItem(x1, y1, x2, y2) {
			var buf = messages.newMessage(MOVE_BOARD_ITEM, 4);
		
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
			var buf1 = messages.newMessage(DELETE_INV_ITEM, 2);
			var buf2 = messages.newMessage(DELETE_INV_ITEM, 2);
		
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
			var buf1 = messages.newMessage(CREATE_BOARD_ITEM, 4);
			var buf2 = messages.newMessage(CREATE_BOARD_ITEM, 4);
		
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
			var buf1 = messages.newMessage(MOVE_INV_ITEM_TO_BOARD, 4);
			var buf2 = messages.newMessage(MOVE_INV_ITEM_TO_BOARD, 4);
		
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
			var buf = messages.newMessage(DELETE_BOARD_ITEM, 2);
		
			this.board[x][y] = null;
		
			buf.writeInt8(x, 2);
			buf.writeInt8(y, 3);

			this.player1.write(buf);
			this.player2.write(buf);
		}
	
		initializeInv(x, y) {
			var buf1 = messages.newMessage(INITIALIZE_INV, 12);
			var buf2 = messages.newMessage(INITIALIZE_INV, 12);
		
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
			var buf1 = messages.newMessage(CREATE_INV_ITEM, 3);
			var buf2 = messages.newMessage(CREATE_INV_ITEM, 3);
		
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
			var buf = messages.newMessage(MOVE_ITEM_FAILED, 2);
		
			buf.writeInt8(x, 2);
			buf.writeInt8(y, 3);
		
			player.write(buf);
		}
	
		giveOpponentsName() {
			var buf1 = messages.newMessage(OPPONENTS_NAME, this.player1.name.length);
			var buf2 = messages.newMessage(OPPONENTS_NAME, this.player2.name.length);
		
			buf1.write(this.player2.name, 2, this.player2.name.length, 'utf8');
			buf2.write(this.player1.name, 2, this,player1.name.length, 'utf8');
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		
		}
	
		gameWon(player) {
			var buf1 = messages.newMessage(GAME_ENDED, 1);
			var buf2 = messages.newMessage(GAME_ENDED, 1);
		
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
			var buf = messages.newMessage(GAME_ENDED, 1);
		
			buf.writeInt8(0, 2);
		
			if (player == this.player1) {
				this.player2.write(buf);
			} else {
				this.player1.write(buf);
			}
		}
	
		setLoot(player, value) {
			player.loot = value;
		
			var buf1 = messages.newMessage(SET_LOOT, 3);
			var buf2 = messages.newMessage(SET_LOOT, 3);
		
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
		
			var buf1 = messages.newMessage(SET_HEALTH, 3);
			var buf2 = messages.newMessage(SET_HEALTH, 3);
		
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
		
			var buf1 = messages.newMessage(SET_DEFENSE, 3);
			var buf2 = messages.newMessage(SET_DEFENSE, 3);
		
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
		
			var buf1 = messages.newMessage(SET_TURN, 1);
			var buf2 = messages.newMessage(SET_TURN, 1);
		
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
	
		tryMoveItem(x, y, player) {
			var matches = new Array();
		
			this.checkForMatches(x, y, matches);
		
			if (matches.length >= 3) {
			
				for (var m in matches) {
					this.deleteBoardItem(m.x, m.y);
				}
			
				this.deleteInvItem(x, player);
				this.createInvItem(x, Math.floor(Math.random() * 6), player);
			
				if (player == this.player1) {
					this.fillDown();
				
					if (this.anyMatches(this.player2Inv)) {
						this.setTurn(this.player2);
					} else {
						this.outOfMatches(this.player2);
					}
				
				} else {
					this.fillUp();
				
					if (this.anyMatches(this.player1Inv)) {
						this.setTurn(this.player1);
					} else {
						this.outOfMatches(this.player1);
					}
				
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
		}
	
		anyMatches(inv) {
			var matches = new Array();
		
			for (var x = 0; x < 6; x++) {
			
				for (var y = 0; y < 6; y++) {
				
					matches.clear();
					checkForMatches(x, y, inv[x], matches);
				
					if (matches.length >= 3) {
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
	
	module.exports = Game;
	
}());