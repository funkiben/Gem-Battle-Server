const MatchArray = require("./matchArray");
const Match3Game = require("./match3Game");

(function() {

	const SET_LOOT = 					27; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_HEALTH = 					28; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_DEFENSE = 				29; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_ENERGY = 					32; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const ATTACKED =					33; // 5 bytes: 2 bytes total attack amount, 2 bytes damage to health, last byte 0=thisPlayer or 1=otherPlayer
	const GAME_PROPERTIES =				34; // 6 bytes: 2 bytes max health, 2 bytes max defense, 2 bytes max energy
	
	const POT = 0;
	const GEM = 1;
	const HEART = 2;
	const SHIELD = 3;
	const STAR  = 4;
	const SWORD = 5;
	
	const POT_BIAS = 1;
	const GEM_BIAS = 1.5;
	const HEART_BIAS = 1.5;
	const SHIELD_BIAS = 2;
	const STAR_BIAS  = 1.5;
	const SWORD_BIAS = 2;
	const BIAS_COMBINED = POT_BIAS + GEM_BIAS + HEART_BIAS + SHIELD_BIAS + SWORD_BIAS + STAR_BIAS;
	
	const INIT_LOOT = 0;
	const INIT_HEALTH = 80;
	const INIT_DEFENSE = 40;
	const INIT_ENERGY = 0;
	
	const MAX_HEALTH = 100;
	const MAX_DEFENSE = 80;
	const MAX_ENERGY = 40;
	
	const HEART_REGEN_TURNS = 3;
	const HEART_REGEN_AMOUNT = 1;
	const SWORD_ATTACK= 4;
	const SHIELD_DEFENSE = 1;
	const GEM_LOOT = 1;
	const STAR_ENERGY = 1;
	
	const POWERUP_HAMMER_SMASH = 1;
	const POWERUP_MATCH_ALL = 2;
	
	
	class GemBattleGame extends Match3Game {
		constructor(player1, player2) {
			super(player1, player2, 6, 6);
			
			this.gameProperties();
			
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
			
			this.events.on("match", function(player, matches) {
				
				if (matches.itemCount[GEM] > 0) {
					
					game.setLoot(player, player.loot + matches.itemCount[GEM] * GEM_LOOT);
					
				} else if (matches.itemCount[HEART] > 0) {
					
					for (var i = 0; i < matches.itemCount[HEART]; i++) {
						player.hearts.push(HEART_REGEN_TURNS);
					}
					
				} else if (matches.itemCount[SHIELD] > 0) {
					
					game.setDefense(player, player.defense + matches.itemCount[SHIELD] * SHIELD_DEFENSE);
					
				} else if (matches.itemCount[STAR] > 0) {
					
					game.setEnergy(player, player.energy + matches.itemCount[STAR] * STAR_ENERGY);
					
				} else if (matches.itemCount[SWORD] > 0) {
					
					game.attack(player == game.player1 ? game.player2 : game.player1, matches.itemCount[SWORD] * SWORD_ATTACK);
					
				}
				
				
				
			});
			
		}
		
		invItem(slot, player) {
			return this.weightedRandomItem();
		}
		
		boardItem(x, y) {
			return this.weightedRandomItem();
		}
		
		weightedRandomItem() {
			var val = BIAS_COMBINED * Math.random();
			
			var test;
			
			if (val < (test = POT_BIAS)) {
				return POT;
			} else if (val < (test += GEM_BIAS)) {
				return GEM;
			} else if (val < (test += HEART_BIAS)) {
				return HEART;
			} else if (val < (test += SHIELD_BIAS)) {
				return SHIELD;
			} else if (val < (test += STAR_BIAS)) {
				return STAR;
			} else if (val < (test += SWORD_BIAS)) {
				return SWORD;
			}
		}
		
		gameProperties() {
			var buf = messages.newMessage(GAME_PROPERTIES, 6);
			
			buf.writeUInt16LE(MAX_HEALTH, 2);
			buf.writeUInt16LE(MAX_DEFENSE, 4);
			buf.writeUInt16LE(MAX_ENERGY, 6);
			
			this.player1.write(buf);
			this.player2.write(buf);
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
			if (value < 0) {
				value = 0;
			}
			
			if (value > MAX_HEALTH) {
				value = MAX_HEALTH;
			}
			
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
			
			if (player.health == 0) {
				
				if (player == this.player1) {
					this.gameWon(this.player2);
				} else {
					this.gameWon(this.player1);
				}
				
			}
		}
	
		setDefense(player, value) {
			if (value > MAX_DEFENSE) {
				value = MAX_DEFENSE;
			}
			
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
			if (value > MAX_ENERGY) {
				value = MAX_ENERGY;
			}
			
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
		
		hammerSmash(x, y, player) {
			
			var matches = new MatchArray();
			
			for (var xi = Math.max(x - 1, 0); xi <= Math.min(x + 1, this.width); xi++) {
				for (var yi = Math.max(y - 1, 0); yi <= Math.min(y + 1, this.height); yi++) {
					matches.push(this.board[xi][yi], xi, yi);
				}
			}
			
			this.events.emit("matches", matches, player);
			
			
			for (var m in matches) {
				this.deleteBoardItem(matches[m].x, matches[m].y, POWERUP_HAMMER_SMASH);
			}
			
			if (player == this.player1) {
				this.fillDown();
			} else {
				this.fillUp();
			}
			
		}
		
		matchAll(item, player) {
			
			var matches = new MatchArray();
			
			for (var x = 0; x < this.width; x++) {
				for (var y = 0; y < this.height; y++) {
					if (this.board[x][y] == item) {
						matches.add(item, x, y);
					}
				}
			}
			
			this.events.emit("matches", matches, player);
			
			
			for (var m in matches) {
				this.deleteBoardItem(matches[m].x, matches[m].y, POWERUP_MATCH_ALL);
			}
			
			if (player == this.player1) {
				this.fillDown();
			} else {
				this.fillUp();
			}
			
		}
		
		
	}
	
	module.exports = GemBattleGame;
	
}());