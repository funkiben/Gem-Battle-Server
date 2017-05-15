const EventEmitter = require("events");

(function() {
	module.exports.messageEventEmitter = new EventEmitter();
	
	module.exports.newMessage = function(label, dataLen) {
		var buf = Buffer.allocUnsafe(2 + dataLen);
		buf.writeInt8(label, 0);
		buf.writeInt8(dataLen, 1);
		return buf;
	};
	
	module.exports.labelRegistry = {};
	
	module.exports.call = function(msg) {
		var byteCount = msg[1];
		var data = msg.slice(2);
		var label = labelRegistry[msg[0]];
		
		if (label != null) {
			messageEventEmitter.emit(label, data);
		} else {
			console.log("Received unknown label: " + msg[0]);
		}
	};
	
	
	
}());