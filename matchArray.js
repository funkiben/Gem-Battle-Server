
(function() {
	
	class MatchArray extends Array {
		
		constructor() {
			super();
			
			this.itemCounts = new Array(6);
			
			for (var i = 0; i < 6; i++) {
				itemCounts[i] = 0;
			}
		}
		
		contains(x, y) {
			for (var m in this) {
				if (this[m].x == x && this[m].y == y) {
					return true;
				}
			}
			
			return false;
		}
		
		contains(item) {
			for (var m in this) {
				if (this[m].item == item) {
					return true;
				}
			}
			
			return false;
		}
		
		contains(item, x, y) {
			for (var m in this) {
				if (this[m].x == x && this[m].y == y && this[m] == item) {
					return true;
				}
			}
			
			return false;
		}
		
		push(item, x, y) {
			this.itemCounts[item]++;
			
			push({
				'item':item, 
				'x':x, 
				'y':y
			});
		}
	
	}
	
	module.exports = MatchArray;
	
}());