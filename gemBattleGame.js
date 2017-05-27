const MatchArray = require("./matchArray");
const Match3Game = require("./match3Game");
const messages = require("./messages");

(function() {

	const SET_LOOT = 					27; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_HEALTH = 					28; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_DEFENSE = 				29; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const SET_ENERGY = 					32; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer
	const ATTACKED =					33; // 5 bytes: 2 bytes total attack amount, 2 bytes damage to health, last byte 0=thisPlayer or 1=otherPlayer
	const GAME_PROPERTIES =				34; // 18 bytes: 2 bytes max health, 2 bytes max defense, 2 bytes max energy, 2 bytes health regen amount, 2 bytes health regen turns, 2 bytes sword attack, 2 bytes shield defense, 2 bytes gem loot, 2 bytes star energy
	const HEALTH_AFTER_REGEN = 			35; // 3 bytes: 2 bytes is value, last byte 0=thisPlayer or 1=otherPlayer

	const GEM = 0;
	const HEART = 1;
	const SHIELD = 2;
	const STAR  = 3;
	const SWORD = 4;
	
	const GEM_BIAS = 1;
	const HEART_BIAS = 1.5;
	const SHIELD_BIAS = 2;
	const STAR_BIAS  = 1.5;
	const SWORD_BIAS = 2;
	const BIAS_COMBINED = GEM_BIAS + HEART_BIAS + SHIELD_BIAS + SWORD_BIAS + STAR_BIAS;
	
	const INIT_LOOT = 0;
	const INIT_HEALTH = 80;
	const INIT_DEFENSE = 40;
	const INIT_ENERGY = 0;
	
	const MAX_HEALTH = 100;
	const MAX_DEFENSE = 80;
	const MAX_ENERGY = 16;
	
	const HEART_REGEN_TURNS = 3;
	const HEART_REGEN_AMOUNT = 1;
	const SWORD_ATTACK= 5;
	const SHIELD_DEFENSE = 1;
	const GEM_LOOT = 1;
	const STAR_ENERGY = 2;
	
	const HAMMER_SMASH = 1;
	const MATCH_ALL = 2;
	const MATCH_ROW = 3;
	const MATCH_COLUMN = 4;
	
	class GemBattleGame extends Match3Game {
		constructor(player1, player2) {
			super(player1, player2, 6, 6);
			
			this.matchTypes[HAMMER_SMASH] = this.hammerSmash;
			this.matchTypes[MATCH_ALL] = this.matchAll;
			this.matchTypes[MATCH_ROW] = this.matchRow;
			this.matchTypes[MATCH_COLUMN] = this.matchColumn;
			
			this.gameProperties();
			
			this.setHealth(this.player1, INIT_HEALTH);
			this.setHealth(this.player2, INIT_HEALTH);
			this.setDefense(this.player1, INIT_DEFENSE);
			this.setDefense(this.player2, INIT_DEFENSE);
			this.setLoot(this.player1, INIT_LOOT);
			this.setLoot(this.player2, INIT_LOOT);
			this.setEnergy(this.player1, INIT_ENERGY);
			this.setEnergy(this.player2, INIT_ENERGY);
			
			this.player1.hearts = new Array();
			this.player2.hearts = new Array();

			this.healthAfterRegen(this.player1);
			this.healthAfterRegen(this.player2);
			
			var game = this;
			
			this.events.on("newTurn", function(player) {
				if (player.health == 0) {
					return;
				}

				for (var i = player.hearts.length - 1; i >= 0; i--) {
					player.hearts[i]--;
					game.setHealth(player, player.health + HEART_REGEN_AMOUNT);
					
					if (player.hearts[i] == 0) {
						player.hearts.splice(i, 1);
					}
				}
			});
			
			this.events.on("match", function(player, matches, how) {
				
				var gemCount = matches.count(GEM), 
					heartCount = matches.count(HEART), 
					shieldCount = matches.count(SHIELD), 
					starCount = matches.count(STAR), 
					swordCount = matches.count(SWORD);
				
				if (gemCount > 0) {
					
					game.setLoot(player, player.loot + gemCount * GEM_LOOT);
					
				}
				
				if (heartCount > 0) {
					
					for (var i = 0; i < heartCount; i++) {
						player.hearts.push(HEART_REGEN_TURNS);
					}

					game.healthAfterRegen(player);
					
				}
				
				if (shieldCount > 0) {
					
					game.setDefense(player, player.defense + shieldCount * SHIELD_DEFENSE);
					
				}
				
				if (starCount > 0) {
					
					game.setEnergy(player, player.energy + starCount * STAR_ENERGY);
					
				} 
				
				if (swordCount > 0) {
					
					game.attack(player == game.player1 ? game.player2 : game.player1, swordCount * SWORD_ATTACK);
					
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
			
			if (val < (test = GEM_BIAS)) {
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
			var buf = messages.newMessage(GAME_PROPERTIES, 18);
			
			buf.writeUInt16LE(MAX_HEALTH, 2);
			buf.writeUInt16LE(MAX_DEFENSE, 4);
			buf.writeUInt16LE(MAX_ENERGY, 6);
			buf.writeUInt16LE(HEART_REGEN_AMOUNT, 8);
			buf.writeUInt16LE(HEART_REGEN_TURNS, 10);
			buf.writeUInt16LE(SWORD_ATTACK, 12);
			buf.writeUInt16LE(SHIELD_DEFENSE, 14);
			buf.writeUInt16LE(GEM_LOOT, 16);
			buf.writeUInt16LE(STAR_ENERGY, 18);
			
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
			
			if (player.health == value) {
				return;
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
					console.log(this.player2.name + " beat " + this.player1.name);
				} else {
					this.gameWon(this.player1);
					console.log(this.player1.name + " beat " + this.player2.name);
				}
				
			}
		}
		
		healthAfterRegen(player) {
			var value = player.health;

			for (var i in player.hearts) {
				value += player.hearts[i] * HEART_REGEN_AMOUNT;
			}

			if (value > MAX_HEALTH) {
				value = MAX_HEALTH;
			}

			var buf1 = messages.newMessage(HEALTH_AFTER_REGEN, 3);
			var buf2 = messages.newMessage(HEALTH_AFTER_REGEN, 3);
		
			buf1.writeUInt16LE(value, 2);
			buf2.writeUInt16LE(value, 2);
		
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
			if (value > MAX_DEFENSE) {
				value = MAX_DEFENSE;
			}
			
			if (player.defense == value) {
				return;
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
			
			if (player.energy == value) {
				return;
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

			this.healthAfterRegen(player);
		}
		
		hammerSmash(game, x, y, matches, player) {
			
			if (player.energy != MAX_ENERGY) {
				return false;
			}
			
			for (var xi = Math.max(x - 1, 0); xi <= Math.min(x + 1, game.width - 1); xi++) {
				for (var yi = Math.max(y - 1, 0); yi <= Math.min(y + 1, game.height - 1); yi++) {
					matches.push(game.board[xi][yi], xi, yi);
				}
			}
			
			game.setEnergy(player, 0);
			
			return true;
			
		}
		
		matchAll(game, x, y, matches, player) {
			
			if (player.energy != MAX_ENERGY) {
				return false;
			}
			
			var item = game.board[x][y];
			
			for (var xi = 0; xi < game.width; xi++) {
				for (var yi = 0; yi < game.height; yi++) {
					if (game.board[xi][yi] == item) {
						matches.add(item, xi, yi);
					}
				}
			}
			
			game.setEnergy(player, 0);
			
			return true;
			
		}
		
		matchRow(game, x, y, matches, player) {
			
			if (player.energy != MAX_ENERGY) {
				return false;
			}
			
			for (var xi = 0; xi < game.width; xi++) {
				matches.add(game.board[xi][y], xi, y);
			}
			
			game.setEnergy(player, 0);
			
			return true;
			
		}
		
		matchColumn(game, x, y, matches, player) {
			
			if (player.energy != MAX_ENERGY) {
				return false;
			}
			
			for (var yi = 0; yi < game.height; yi++) {
				matches.add(game.board[x][yi], x, yi);
			}
			
			game.setEnergy(player, 0);
			
			return true;
			
		}
		
		
	}
	
	module.exports = GemBattleGame;
	
}());