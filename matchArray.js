
(function() {
	
	class MatchArray extends Array {
		
		contains(x, y) {
			for (var m in this) {
				if (this[m].x == x && this[m].y == y) {
					return true;
				}
			}
			
			return false;
		}
		
		containsItem(item) {
			for (var m in this) {
				if (this[m].item == item) {
					return true;
				}
			}
			
			return false;
		}
		
		push(item, x, y) {
			super.push({
				'item':item, 
				'x':x, 
				'y':y
			});
		}
		
		count(item) {
			var count = 0;
			
			for (var m in this) {
				if (this[m].item == item) {
					count++;
				}
			}
			
			return count;
		}
	
	}
	
	module.exports = MatchArray;
	
}());