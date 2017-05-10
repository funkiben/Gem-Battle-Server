var net = require("net");

var server = net.createServer(function (socket) {
	console.log("client connected from " + socket.address());
	
	socket.on("end", function() {
		console.log("client disconnected: " + socket.address());
	});
	
	socket.write("Hello");
	
	socket.on("data", function(data) {
		console.log(data);
	});
});

server.listen(8080, function() {
	console.log("server is listening");
})