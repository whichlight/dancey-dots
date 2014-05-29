var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(8000);
io.set('log level', 1);


function handler (req, res) {
   var filePath = req.url;
   if (filePath == '/')
        filePath = '/index.html';

  fs.readFile(__dirname + filePath,
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

io.sockets.on('connection', function (client) {
  console.log(client.id);

   client.on('move', function(message) {
    client.broadcast.emit('move', message);
  });

   client.on('silent',function(){
	io.sockets.broadcast.emit('silent',client.id);
   });

   client.on('disconnect', function(){
     io.sockets.emit('close', client.id);
   });

});




