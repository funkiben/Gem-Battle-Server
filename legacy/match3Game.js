const ItemArray = require("./itemArray");
const Game = require("./game");
const messages = require("./messages");

messages.labelRegistry[4] = 'tryMoveItem';

(function() {


	// messages server sends to clients
	const INITIALIZE_BOARD = 			16; // 36 bytes: 1 byte for each slot
	const MOVE_BOARD_ITEMS = 	 		17; // 16 bit sequences, 4 bits for fromX, 4 bits for fromY, 4 bits for toX, 4 bits for toY
	const DELETE_INV_ITEMS =  			18; // 1st byte 0=thisPlayer or 1=otherPlayer, one byte for each slot after
	const CREATE_BOARD_ITEMS =  		19; // 1st byte 0=thisPlayer, 1=otherPlayer, 16 bit sequences, 4 bits for x, 4 bits for y, 8 bits for itemID
	const MOVE_INV_ITEM_TO_BOARD =  	20; // 3 bytes: x, y, 0=thisPlayer or 1=otherPlayer
	const DELETE_BOARD_ITEMS	=		21; // 1st byte how (0 = normal match), each byte after: 4 bits for x, 4 bits for y
	const INITIALIZE_INVS =				22; // 12 bytes: 1 byte for each slot, first 6 are thisPlayer, last 6 are otherPlayer
	const CREATE_INV_ITEMS = 			23; // 1st byte 0=thisPlayer or 1=otherPlayer: 8 bit sequences: 4 bits item, 4 bits slot
	const MOVE_ITEM_FAILED = 			24; // 4 bytes: x, y, match type, 0=thisPlayer or 1=otherPlayer
	const OUT_OF_MOVES = 				31; // 1 byte: 0=thisPlayer or 1=otherPlayer
	
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
				this.board[i] = new Array(this.height);
			}
		
			this.randomizeBoard();
			this.randomizeInv(this.player1Inv, this.player1);
			this.randomizeInv(this.player2Inv, this.player2);
			
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
			this.initializeInvs();
		
		}
		
		invItem(slot, player) {
			return Math.floor(Math.random() * 5);
		}
		
		boardItem(x, y) {
			return Math.floor(Math.random() * 5);
		}
	
		randomizeBoard() {
			for (var x = 0; x < this.width; x++) {
				for (var y = 0; y < this.height; y++) {
					this.board[x][y] = this.boardItem(x, y);
				}
			}
		}

		randomizeInv(inv, player) {
			for (var slot = 0; slot < this.width; slot++) {
				inv[slot] = this.invItem(slot, player);
			}
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

		moveBoardItems(moveCoordinates) {
			var buf1 = messages.newMessage(MOVE_BOARD_ITEMS, moveCoordinates.length * 2);
			var buf2 = messages.newMessage(MOVE_BOARD_ITEMS, moveCoordinates.length * 2);
			
			var pos = 2, toX, toY, fromX, fromY;

			for (var i in moveCoordinates) {
				
				toX = moveCoordinates[i].toX;
				toY = moveCoordinates[i].toY;
				fromX = moveCoordinates[i].fromX;
				fromY = moveCoordinates[i].fromY;

				this.board[toX][toY] = this.board[fromX][fromY];
				this.board[fromX][fromY] = null;
				
				buf1.writeInt8(((fromX & 0xF) << 4) | (fromY & 0xF), pos);
				buf1.writeInt8(((toX & 0xF) << 4) | (toY & 0xF), pos + 1);
				
				toX = this.width - 1 - toX;
				toY = this.height - 1 - toY;
				fromX = this.width - 1 - fromX;
				fromY = this.height - 1 - fromY;

				buf2.writeInt8(((fromX & 0xF) << 4) | (fromY & 0xF), pos);
				buf2.writeInt8(((toX & 0xF) << 4) | (toY & 0xF), pos + 1);
				
				pos += 2;
			}

			this.player1.write(buf1);
			this.player2.write(buf2);
		}

		deleteInvItems(slots, player) {
			var buf1 = messages.newMessage(DELETE_INV_ITEMS, slots.length + 1);
			var buf2 = messages.newMessage(DELETE_INV_ITEMS, slots.length + 1);
			
			if (player == this.player1) {
				buf1.writeInt8(0, 2);
				buf2.writeInt8(1, 2);
			
			} else {
				buf2.writeInt8(0, 2);
				buf1.writeInt8(1, 2);
			}

			var slot;

			for (var i in slots) {

				slot = slots[i];

				if (player == this.player1) {
					this.player1Inv[slot] = null;
				} else {
					this.player2Inv[slot] = null;
				}

				buf1.writeInt8(slot, i + 3);
				buf2.writeInt8(this.width - 1 - slot, i + 3);

			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
			
		}

		createBoardItems(items, player) {
			var buf1 = messages.newMessage(CREATE_BOARD_ITEMS, items.length * 2 + 1);
			var buf2 = messages.newMessage(CREATE_BOARD_ITEMS, items.length * 2 + 1);
			
			if (this.player1 == player) {
				buf1.writeInt8(0, 2);
				buf2.writeInt8(1, 2);
			} else {
				buf2.writeInt8(0, 2);
				buf1.writeInt8(1, 2);
			
			}

			var x, y, item, pos = 3;

			for (var i in items) {

				x = items[i].x;
				y = items[i].y;
				item = items[i].item;

				this.board[x][y] = item;
				
				buf1.writeInt8(((x & 0xF) << 4) | (y & 0xF), pos);
				buf1.writeInt8(item, pos + 1);

				x = this.width - 1 - x;
				y = this.height - 1 - y;

				buf2.writeInt8(((x & 0xF) << 4) | (y & 0xF), pos);
				buf2.writeInt8(item, pos + 1);

				pos += 2;

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

		deleteBoardItems(coordinates, how) {
			var buf1 = messages.newMessage(DELETE_BOARD_ITEMS, coordinates.length + 1);
			var buf2 = messages.newMessage(DELETE_BOARD_ITEMS, coordinates.length + 1);
			
			buf1.writeInt8(how, 2);
			buf2.writeInt8(how, 2);

			var x, y, pos = 3;

			for (var i in coordinates) {

				x = coordinates[i].x;
				y = coordinates[i].y;

				this.board[x][y] = null;

				buf1.writeInt8(((x & 0xF) << 4) | (y & 0xF), pos);

				x = this.width - 1 - x;
				y = this.height - 1 - y;

				buf2.writeInt8(((x & 0xF) << 4) | (y & 0xF), pos);
				
				pos++;

			}

			this.player1.write(buf1);
			this.player2.write(buf2);
		}
	
		initializeInvs(x, y) {
			var buf1 = messages.newMessage(INITIALIZE_INVS, 12);
			var buf2 = messages.newMessage(INITIALIZE_INVS, 12);
		
			for (var i = 0; i < this.width; i++) {
				buf1.writeInt8(this.player1Inv[i], 2 + i);
				buf1.writeInt8(this.player2Inv[i], 2 + this.width + i);
			
				buf2.writeInt8(this.player2Inv[i], 2 + (this.width - 1 - i));
				buf2.writeInt8(this.player1Inv[i], 2 + this.width + (this.width - 1 - i));
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		}

		createInvItem(slot, item, player) {
			this.createInvItems([ { slot:slot, item:item } ], player);
		}

		createInvItems(items, player) {
			var buf1 = messages.newMessage(CREATE_INV_ITEMS, items.length + 1);
			var buf2 = messages.newMessage(CREATE_INV_ITEMS, items.length + 1);
			
			if (player == this.player1) {
				buf1.writeInt8(0, 2);
				buf2.writeInt8(1, 2);
			
			} else {
				buf2.writeInt8(0, 2);
				buf1.writeInt8(1, 2);
			}

			var item, slot, pos = 3;

			for (var i in items) {

				item = items[i].item;
				slot = items[i].slot;

				if (player == this.player1) {
					this.player1Inv[slot] = item;
				} else {
					this.player2Inv[slot] = item;
				}

				buf1.writeInt8(((slot & 0xF) << 4) | (item & 0xF), pos);
				
				slot = this.width - 1 - slot;

				buf2.writeInt8(((slot & 0xF) << 4) | (item & 0xF), pos);
				
				pos++;

			}

			this.player1.write(buf1);
			this.player2.write(buf2);
		
		}
	
		moveItemFailed(player, x, y, how) {
			var buf1 = messages.newMessage(MOVE_ITEM_FAILED, 4);
			var buf2 = messages.newMessage(MOVE_ITEM_FAILED, 4);
			
			buf1.writeInt8(x, 2);
			buf1.writeInt8(y, 3);
			buf2.writeInt8(this.width - 1 - x, 2);
			buf2.writeInt8(this.height - 1 - y, 3);
			
			buf1.writeInt8(how, 4)
			buf2.writeInt8(how, 4)
		

			if (player == this.player1) {
				buf1.writeInt8(0, 5);
				buf2.writeInt8(1, 5);
			} else {
				buf1.writeInt8(1, 5);
				buf2.writeInt8(0, 5);
			}

			this.player1.write(buf1);
			this.player2.write(buf2);
		}
		
		outOfMoves(player) {
			var buf1 = messages.newMessage(OUT_OF_MOVES, 1);
			var buf2 = messages.newMessage(OUT_OF_MOVES, 1);
		
			if (player == this.player1) {
				buf1.writeInt8(0, 2);
				buf2.writeInt8(1, 2)
			} else {
				buf2.writeInt8(0, 2);
				buf1.writeInt8(1, 2)
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);

			this.events.emit("outOfMoves", player);
		}

		reInitializeBoard() {
			var deleteCoords = new Array();

			for (var y = 0; y < this.height; y++) {
				for (var x = 0; x < this.width; x++) {
					deleteCoords.push({x:x, y:y});
				}
			}

			this.deleteBoardItems(deleteCoords, NORMAL_MATCH);

			this.initializeBoard();
		}

		refillInventory(inv, player) {

			var items = new Array();

			for (var slot = 0; slot < this.width; slot++) {
				if (inv[slot] == null) {
					items.push({slot:slot, item:this.invItem(slot, player)});
				}
			}

			this.createInvItems(items, player);

		}

		endTurn(player) {
			super.endTurn(player);

			if (player == this.player1) {
				this.refillInventory(this.player2Inv, this.player2);
			} else {
				this.refillInventory(this.player1Inv, this.player1);
			}
		}
	
		tryMoveItem(x, y, how, player) {
			if (this.turn != player) {
				return;
			}
			
			if (player == this.player2) {
				x = this.width - 1 - x;
				y = this.height - 1 - y;
			}
			
			var items = new ItemArray();
			
			if (this.matchTypes[how](this, x, y, items, player)) {
				
				this.events.emit("match", player, items, how);
			
				this.deleteBoardItems(items, how);
				
				if (player == this.player1) {
					this.fillDown();
				} else {
					this.fillUp();
				}

				if (player == this.player1) {
					
					if (!this.anyMatches(this.player1Inv)) {
						this.outOfMoves(this.player1);
					}

				} else {

					if (!this.anyMatches(this.player2Inv)) {
						this.outOfMoves(this.player2);
					}
				
				}
				
				
				
				
			} else {
			
				this.moveItemFailed(player, x, y, how);
			
			}
		
		}
		
		normalMatch(game, x, y, matches, player) {
			var inv = player == game.player1 ? game.player1Inv : game.player2Inv;
			var item = inv[x];
			
			if (item == null) {
				return false;
			}

			game.checkForMatches(x, y, item, matches);
			
			if (matches.length < 3) {
				return false;
			}
			
			inv[x] = null;

			game.moveInvItemToBoard(x, y, player);

			return true;
			
		}

		checkForMatches(x, y, item, matches) {

			this.getMatchingAdjacentItems (x, y, item, matches);

		}
	
		getMatchingAdjacentItems(x, y, item, matches) {
			
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
			
			if (item == test && !matches.contains(tx, ty)) {
				this.getMatchingAdjacentItems(tx, ty, test, matches);
			}
			
		}

		anyMatches(inv) {
			var matches, item;
		
			for (var x = 0; x < this.width; x++) {
			
				for (var y = 0; y < this.height; y++) {
				
					item = inv[x];

					if (item != null) {

						matches = new ItemArray();
						this.checkForMatches(x, y, item, matches);
					
						if (matches.length >= 3) {
							return true;
						}

					}
				
				}
			
			}
		
			return false;
		}
	
		fillDown() {
		
			var ground;
			var moveCoordinates = new Array();
			var itemsToCreate = new ItemArray();

			for (var x = 0; x < this.width; x++) {
			
				ground = 0;
			
				for (var y = 0; y < this.height; y++) {
				
					if (this.board[x][y] != null) {
					
						if (ground != y) {
							moveCoordinates.push({fromX:x, fromY:y, toX:x, toY:ground});
						}
						
						ground++;
					
					}
				
				}
			
				for (var i = ground; i < this.height; i++) {
					itemsToCreate.push(this.boardItem(this.player1), x, i);
				}
			
			}
			
			this.moveBoardItems(moveCoordinates);
			this.createBoardItems(itemsToCreate, this.player1);
		}
	
		fillUp() {
		
			var ground;
			var moveCoordinates = new Array();
			var itemsToCreate = new ItemArray();
		
			for (var x = 0; x < this.width; x++) {
			
				ground = this.height - 1;
			
				for (var y = this.height - 1; y >= 0; y--) {
				
					if (this.board[x][y] != null) {
					
						if (ground != y) {
							moveCoordinates.push({fromX:x, fromY:y, toX:x, toY:ground});
						}
						
						ground--;
						
					}
				
				}
			
				for (var i = ground; i >= 0; i--) {
					itemsToCreate.push(this.boardItem(this.player2), x, i);
				}
			}
			
			this.moveBoardItems(moveCoordinates);
			this.createBoardItems(itemsToCreate, this.player2);

		}
	
	
	}
	
	module.exports = Match3Game;
	
}());