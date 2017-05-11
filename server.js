var net = require("net");

var server = net.createServer(function (socket) {
	console.log("client connected from " + socket.address().toString());
	
	socket.on("end", function() {
		console.log("client disconnected: " + socket.address());
	});
	
	//socket.write("Hello");
	
	var msg = "Hello World!";
	
	var buf = Buffer.allocUnsafe(14);
	
	buf.writeInt8(1, 0);
	buf.writeInt8(12, 1);
	buf.write(msg, 2, 12, 'utf8');
	
	socket.write(buf);
	
	socket.on("data", function(data) {
		console.log(data);
	});
});

server.listen(8080, function() {
	console.log("server is listening");
})

// good tcp node server example: https://gist.github.com/creationix/707146