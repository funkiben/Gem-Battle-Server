const Match3Game = require("./match3Game");

(function() {

	const SET_LOOT = 					27; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_HEALTH = 					28; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_DEFENSE = 				29; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	
	// game properties
	const INIT_LOOT = 0;
	const INIT_HEALTH = 20;
	const INIT_DEFENSE = 10;
	
	class GemBattleGame extends Match3Game {
		constructor(player1, player2) {
			super(player1, player2, 6, 6);
			
			this.setHealth(this.player1, INIT_HEALTH);
			this.setHealth(this.player2, INIT_HEALTH);
			this.setDefense(this.player1, INIT_DEFENSE);
			this.setDefense(this.player2, INIT_DEFENSE);
			this.setLoot(this.player1, INIT_LOOT);
			this.setLoot(this.player2, INIT_LOOT);
			
			
			
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
	
	}
	
	module.exports = GemBattleGame;
	
}());