const Match3Game = require("./match3Game");
const messages = require("./messages");

(function() {

	const SET_LOOT = 					27; // 4 bytes: 2 bytes is value, 1 byte for how, last byte 0=thisPlayer or 1=otherPlayer
	const SET_HEALTH = 					28; // 4 bytes: 2 bytes is value, 1 byte for how, last byte 0=thisPlayer or 1=otherPlayer
	const SET_DEFENSE = 				29; // 4 bytes: 2 bytes is value, 1 byte for how, last byte 0=thisPlayer or 1=otherPlayer
	const SET_ENERGY = 					32; // 4 bytes: 2 bytes is value, 1 byte for how, last byte 0=thisPlayer or 1=otherPlayer
	const ATTACKED =					33; // 6 bytes: 2 bytes total attack amount, 2 bytes damage to health, 1 byte for how, last byte 0=thisPlayer or 1=otherPlayer
	const GAME_PROPERTIES =				34; // 16 bytes: 2 bytes max health, 2 bytes max defense, 2 bytes max energy, 2 bytes heart health, 2 bytes sword attack, 2 bytes shield defense, 2 bytes gem loot, 2 bytes star energy
	
	const SET_VALUE_REASON = {
		NORMAL_MATCH: 0,
		HAMMER_SMASH: 1,
		INIT: 100,
		USE_SPECIAL: 101
	};

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
	const INIT_HEALTH = 800;
	const INIT_DEFENSE = 40;
	const INIT_ENERGY = 0;
	
	const MAX_HEALTH = 1000;
	const MAX_DEFENSE = 80;
	const MAX_ENERGY = 16;
	
	const HEART_HEALTH = 30;
	const SWORD_ATTACK = 50;
	const SHIELD_DEFENSE = 4;
	const GEM_LOOT = 1;
	const STAR_ENERGY = 2;
	
	const ATTACK_SHIELD_DAMAGE_MODIFIER = 0.1;

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
			
			this.setHealth(this.player1, INIT_HEALTH, SET_VALUE_REASON.INIT);
			this.setHealth(this.player2, INIT_HEALTH, SET_VALUE_REASON.INIT);
			this.setDefense(this.player1, INIT_DEFENSE, SET_VALUE_REASON.INIT);
			this.setDefense(this.player2, INIT_DEFENSE, SET_VALUE_REASON.INIT);
			this.setLoot(this.player1, INIT_LOOT, SET_VALUE_REASON.INIT);
			this.setLoot(this.player2, INIT_LOOT, SET_VALUE_REASON.INIT);
			this.setEnergy(this.player1, INIT_ENERGY, SET_VALUE_REASON.INIT);
			this.setEnergy(this.player2, INIT_ENERGY), SET_VALUE_REASON.INIT;
			
			this.player1.hearts = new Array();
			this.player2.hearts = new Array();

			var game = this;

			this.events.on("match", function(player, matches, how) {
				
				var gemCount = matches.count(GEM), 
					heartCount = matches.count(HEART), 
					shieldCount = matches.count(SHIELD), 
					starCount = matches.count(STAR), 
					swordCount = matches.count(SWORD);
				
				if (gemCount > 0) {
					
					game.setLoot(player, player.loot + gemCount * GEM_LOOT, how);
					
				}
				
				if (heartCount > 0) {
					
					game.setHealth(player, player.health + heartCount * HEART_HEALTH, how);
					
				}
				
				if (shieldCount > 0) {
					
					game.setDefense(player, player.defense + shieldCount * SHIELD_DEFENSE, how);
					
				}
				
				if (starCount > 0) {
					
					game.setEnergy(player, player.energy + starCount * STAR_ENERGY, how);
					
				} 
				
				if (swordCount > 0) {
					
					game.attack(player == game.player1 ? game.player2 : game.player1, swordCount * SWORD_ATTACK, how);
					
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
			buf.writeUInt16LE(HEART_HEALTH, 8);
			buf.writeUInt16LE(SWORD_ATTACK, 10);
			buf.writeUInt16LE(SHIELD_DEFENSE, 12);
			buf.writeUInt16LE(GEM_LOOT, 14);
			buf.writeUInt16LE(STAR_ENERGY, 16);
			
			this.player1.write(buf);
			this.player2.write(buf);
		}
	
		setLoot(player, value, how) {
			player.loot = value;
		
			var buf1 = messages.newMessage(SET_LOOT, 4);
			var buf2 = messages.newMessage(SET_LOOT, 4);
		
			buf1.writeUInt16LE(player.loot, 2);
			buf2.writeUInt16LE(player.loot, 2);

			buf1.writeInt8(how, 4);
			buf2.writeInt8(how, 4);
		
			if (player == this.player1) {
				buf1.writeInt8(0, 5);
				buf2.writeInt8(1, 5);
			} else {
				buf2.writeInt8(0, 5);
				buf1.writeInt8(1, 5);
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		}
	
		setHealth(player, value, how) {
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
		
			var buf1 = messages.newMessage(SET_HEALTH, 4);
			var buf2 = messages.newMessage(SET_HEALTH, 4);
		
			buf1.writeUInt16LE(player.health, 2);
			buf2.writeUInt16LE(player.health, 2);

			buf1.writeInt8(how, 4);
			buf2.writeInt8(how, 4);
		
			if (player == this.player1) {
				buf1.writeInt8(0, 5);
				buf2.writeInt8(1, 5);
			} else {
				buf2.writeInt8(0, 5);
				buf1.writeInt8(1, 5);
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
	
		setDefense(player, value, how) {
			if (value > MAX_DEFENSE) {
				value = MAX_DEFENSE;
			}

			if (value < 0) {
				value = 0;
			}
			
			if (player.defense == value) {
				return;
			}
			
			player.defense = value;
		
			var buf1 = messages.newMessage(SET_DEFENSE, 4);
			var buf2 = messages.newMessage(SET_DEFENSE, 4);
		
			buf1.writeUInt16LE(player.defense, 2);
			buf2.writeUInt16LE(player.defense, 2);

			buf1.writeInt8(how, 4);
			buf2.writeInt8(how, 4);
		
			if (player == this.player1) {
				buf1.writeInt8(0, 5);
				buf2.writeInt8(1, 5);
			} else {
				buf2.writeInt8(0, 5);
				buf1.writeInt8(1, 5);
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		}
		
		setEnergy(player, value, how) {
			if (value > MAX_ENERGY) {
				value = MAX_ENERGY;
			}
			
			if (player.energy == value) {
				return;
			}
			
			player.energy = value;
		
			var buf1 = messages.newMessage(SET_ENERGY, 4);
			var buf2 = messages.newMessage(SET_ENERGY, 4);
		
			buf1.writeUInt16LE(player.energy, 2);
			buf2.writeUInt16LE(player.energy, 2);
		
			buf1.writeInt8(how, 4);
			buf2.writeInt8(how, 4);
		

			if (player == this.player1) {
				buf1.writeInt8(0, 5);
				buf2.writeInt8(1, 5);
			} else {
				buf2.writeInt8(0, 5);
				buf1.writeInt8(1, 5);
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);
		}
		
		attack(player, damage, how) {
			var healthDamage = damage * (1 - player.defense * 0.01);
			this.setDefense(player, player.defense - damage * ATTACK_SHIELD_DAMAGE_MODIFIER, how);
			this.setHealth(player, player.health - healthDamage, how);
			
			var buf1 = messages.newMessage(ATTACKED, 6);
			var buf2 = messages.newMessage(ATTACKED, 6);
			
			buf1.writeUInt16LE(damage, 2);
			buf2.writeUInt16LE(damage, 2);
			
			buf1.writeUInt16LE(healthDamage, 4);
			buf2.writeUInt16LE(healthDamage, 4);
			
			buf1.writeInt8(how, 6);
			buf2.writeInt8(how, 6);
		

			if (player == this.player1) {
				buf1.writeInt8(0, 7);
				buf2.writeInt8(1, 7);
			} else {
				buf2.writeInt8(0, 7);
				buf1.writeInt8(1, 7);
			}
		
			this.player1.write(buf1);
			this.player2.write(buf2);

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
			
			game.setEnergy(player, 0, SET_VALUE_REASON.USE_SPECIAL);
			
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
			
			game.setEnergy(player, 0, SET_VALUE_REASON.USE_SPECIAL);
			
			return true;
			
		}
		
		matchRow(game, x, y, matches, player) {
			
			if (player.energy != MAX_ENERGY) {
				return false;
			}
			
			for (var xi = 0; xi < game.width; xi++) {
				matches.add(game.board[xi][y], xi, y);
			}
			
			game.setEnergy(player, 0, SET_VALUE_REASON.USE_SPECIAL);
			
			return true;
			
		}
		
		matchColumn(game, x, y, matches, player) {
			
			if (player.energy != MAX_ENERGY) {
				return false;
			}
			
			for (var yi = 0; yi < game.height; yi++) {
				matches.add(game.board[x][yi], x, yi);
			}
			
			game.setEnergy(player, 0, SET_VALUE_REASON.USE_SPECIAL);
			
			return true;
			
		}
		
		
	}
	
	module.exports = GemBattleGame;
	
}());