$(document).ready(function() {
    try{
        var context = new webkitAudioContext(),
_x, _y;
    }
    catch(err){
        alert("this uses the web audio API, try opening it in google chrome \n\n <3 whichlight" );
    }
    var templates = prep_templates();

    var dots = {};
    var pressed = false;

    //socketio
    //var socket = io.connect('http://whichlight.synth_fun.jit.su/');
    var socket = io.connect('http://localhost:8000');

    //sending events to the server
    $(document).mousedown(function(e){
        pressed = true;
        sendMousePosition(e);
    });

    function sendMousePosition(e) {
        if(pressed){
            socket.emit('move', {
                x: e.pageX,
                y: e.pageY,
            });
        }
    }

    document.onmousemove = _.throttle(sendMousePosition, 40);

    $(document).mouseup(function(){
        pressed = false;
        socket.emit('silent', {
            state:"stop"
        });
    });

    //responding to events from the server
    socket.on('silent',function(id){
        if (dots[id]) {
            dots[id].silent();
        }
    });

    socket.on('move', function (data) {
        if (!dots[data.id]) {
            dots[data.id] = dot(data, context, templates);
        }
        dots[data.id].move(data);
    });

    socket.on('close', function (id) {
        dots[id].end();
        delete dots[id];
    });
});

