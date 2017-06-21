messages = require("./messages.js");
EventEmitter = require("events");

messages.labelRegistry[2] = 'setName';
messages.labelRegistry[3] = 'leaveGame';

(function() {


	// messages server sends to clients
	const OPPONENTS_NAME =				25; // string
	const GAME_ENDED = 					26; // 1 byte: 0 = opponent left, 1 = this player won, 2 = other player won
	const SET_TURN = 					30;	// 1 byte: 0=thisPlayer or 1=otherPlayer
	
	class Game {
		constructor(player1, player2) {
			this.player1 = player1;
			this.player2 = player2;
			this.events = new EventEmitter();
			
			var game = this;
			
			function callPlayer1Leave() {
				game.playerLeft(game.player1);
			}
		
			function callPlayer2Leave() {
				game.playerLeft(game.player2);
			}
			
			player1.messages.once("leaveGame", callPlayer1Leave);
			
			player2.messages.once("leaveGame", callPlayer2Leave);
			
			player1.once("end", callPlayer1Leave);
			
			player2.once("end", callPlayer2Leave);
			
			this.events.once("gameEnd", function() {
				player1.removeListener("end", callPlayer1Leave);
				player2.removeListener("end", callPlayer2Leave);
			});
			
			this.giveOpponentsName();
			this.setTurn(Math.random() > 0.5 ? this.player1 : this.player2);
		
		}
	
		giveOpponentsName() {
			var buf1 = messages.newMessage(OPPONENTS_NAME, this.player2.name.length);
			var buf2 = messages.newMessage(OPPONENTS_NAME, this.player1.name.length);
			
			buf1.write(this.player2.name, 2, this.player2.name.length, 'utf8');
			buf2.write(this.player1.name, 2, this.player1.name.length, 'utf8');
			
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
			
			this.player1.game = null;
			this.player2.game = null;
			
			this.events.emit("gameWon", player);
			this.events.emit("gameEnd");
		}
	
		playerLeft(player) {
			var buf = messages.newMessage(GAME_ENDED, 1);
		
			buf.writeInt8(0, 2);
		
			if (player == this.player1) {
				this.player2.write(buf);
			} else {
				this.player1.write(buf);
			}
			
			this.player1.game = null;
			this.player2.game = null;
			
			this.events.emit("playerLeave", player);
			this.events.emit("gameEnd");
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
			
			this.events.emit("newTurn", player);
		}
	
	}
	
	module.exports = Game;
	
}());