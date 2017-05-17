const Match3Game = require("./match3Game");

(function() {

	const SET_LOOT = 					27; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_HEALTH = 					28; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_DEFENSE = 				29; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_ENERGY = 					32; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const ATTACKED =					33; // 5 bytes: 2 bytes total attack amount, 2 bytes damage to health, last byte 0=thisPlayer or 1=otherPlayer
	
	const POT = 0;
	const GEM = 1;
	const HEART = 2;
	const SHIELD = 3;
	const STAR  = 4;
	const SWORD = 5;
	
	// game properties
	const INIT_LOOT = 0;
	const INIT_HEALTH = 80;
	const INIT_DEFENSE = 40;
	const INIT_ENERGY = 0;
	
	const HEART_REGEN_TURNS = 5;
	const HEART_REGEN_AMOUNT = 1;
	const SWORD_ATTACK= 3;
	const SHIELD_DEFENSE = 2;
	const GEM_LOOT = 1;
	const STAR_ENERGY = 1;
	
	class GemBattleGame extends Match3Game {
		constructor(player1, player2) {
			super(player1, player2, 6, 6);
			
			this.setHealth(this.player1, INIT_HEALTH);
			this.setHealth(this.player2, INIT_HEALTH);
			this.setDefense(this.player1, INIT_DEFENSE);
			this.setDefense(this.player2, INIT_DEFENSE);
			this.setLoot(this.player1, INIT_LOOT);
			this.setLoot(this.player2, INIT_LOOT);
			
			
			this.player1.hearts = new Array();
			this.player2.hearts = new Array();
			
			var game = this;
			
			this.events.on("newTurn", function(player) {
				for (var i = player.hearts.length - 1; i >= 0; i--) {
					player.hearts[i] = player.hearts[i] - 1;
					game.setHealth(player, player.health + HEART_REGEN_AMOUNT);
					
					if (player.hearts[i] == 0) {
						player.hearts.splice(i, 1);
					}
				}
			});
			
			this.events.on("match", function(player, item, matches) {
				
				if (item == GEM) {
					
					game.setLoot(player, player.loot + matches.length * GEM_LOOT);
					
				} else if (item == HEART) {
					
					for (var i = 0; i < matches.length; i++) {
						player.hearts.push(HEART_REGEN_TURNS);
					}
					
				} else if (item == SHIELD) {
					
					game.setDefense(player, player.defense + matches.length * SHIELD_DEFENSE);
					
				} else if (item == STAR) {
					
					game.setEnergy(player, player.energy + matches.length * STAR_ENERGY);
					
				} else if (item == SWORD) {
					
					game.attack(player == game.player1 ? game.player2 : game.player1, matches.length * SWORD_ATTACK);
					
				}
				
				
				
			});
			
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
			
			if (player.health < 0) {
				player.health = 0;
			}
		
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
			
			if (player.health == 0) {
				
				if (player == this.player1) {
					this.gameWon(this.player2);
				} else {
					this.gameWon(this.player1);
				}
				
			}
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
		
		setEnergy(player, value) {
			player.energy = value;
		
			var buf1 = messages.newMessage(SET_ENERGY, 3);
			var buf2 = messages.newMessage(SET_ENERGY, 3);
		
			buf1.writeUInt16LE(player.energy, 2);
			buf2.writeUInt16LE(player.energy, 2);
		
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
		
		attack(player, damage) {
			var healthDamage;
			
			if (player.defense >= damage) {
				healthDamage = 0;
				this.setDefense(player, player.defense - damage);
			}
			
			if (player.defense < damage) {
				healthDamage = damage - player.defense;
				this.setDefense(player, 0);
				this.setHealth(player, player.health - healthDamage);
			}
			
			var buf1 = messages.newMessage(ATTACKED, 5);
			var buf2 = messages.newMessage(ATTACKED, 5);
			
			buf1.writeUInt16LE(damage, 2);
			buf2.writeUInt16LE(damage, 2);
			
			buf1.writeUInt16LE(healthDamage, 4);
			buf2.writeUInt16LE(healthDamage, 4);
		
			if (player == this.player1) {
				buf1.writeInt8(0, 6);
				buf2.writeInt8(1, 6);
			} else {
				buf2.writeInt8(0, 6);
				buf1.writeInt8(1, 6);
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		}	
	}
	
	module.exports = GemBattleGame;
	
}());