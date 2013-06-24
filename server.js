var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')

app.listen(8000);

colors = {}

function handler(req, res) {
    var filePath = req.url;
    if (filePath == '/')
        filePath = '/index.html';

    fs.readFile(__dirname + filePath, function (err, data) {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }
        res.writeHead(200);
        res.end(data);
    });
}

io.sockets.on('connection', function (client) {
    if(!colors[client.id]){
        col = hsvToRgb(Math.random(),1,1);
        colors[client.id]= 'rgb('+col[0]+','+col[1]+','+col[2]+')';
    }
    client.on('move', function(message) {
        message.id = client.id;
        message.col = colors[client.id];
        console.log(client.id);
        io.sockets.emit('move', message);
    });
    client.on('silent',function(){
        io.sockets.emit('silent',client.id);
    });
    client.on('disconnect', function(){
        io.sockets.emit('silent', client.id);
        io.sockets.emit('close', client.id);
        delete colors[client.id];
    });
});

function hsvToRgb(h, s, v){
    var r, g, b;

    var i = Math.floor(h * 6);
    var f = h * 6 - i;
    var p = v * (1 - s);
    var q = v * (1 - f * s);
    var t = v * (1 - (1 - f) * s);

    switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }

    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}


