function dot(data, context) {
    this.id = data.id;
    this.col = data.col;

    var _x, _y, oscillator, filter, gainNode;

    var $el = $(
        '<span class="synth" id="synth_'+data.id+'" style="background-color:'+this.col+';">'+
            '<span class="chat" style="display:none;"/>'+
        '</span>');
    $('body').append($el);

    function prep_synths() {
        oscillator = context.createOscillator();
        oscillator.type = 1;
        filter = context.createBiquadFilter();
        filter.type = 0;
        gainNode = context.createGainNode();
        gainNode.gain.value = 0.05;

        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(context.destination);
    }
    prep_synths();

    this.move = function(data) {
        _x = 30 + Math.pow(2, data.x/72.0);
        _y = 200 + Math.pow(2.5, ($(window).height() - data.y)/72.0);
        oscillator.frequency.value = _x;
        filter.frequency.value = _y;
        oscillator.start(0);
        $el.css({
            left: (data.x - 20) + 'px',
            top: (data.y - 20) + 'px',
            opacity: 0.7,
        });
    };
    this.move(data);

    this.silent = function() {
        oscillator.stop(0);
        prep_synths();
        $el.css('opacity', '0.2');
    };

    this.end = function() {
        oscillator.stop(0);
        $('body').remove($el);
    };

    return this;
}


$(document).ready(function() {
    try{
        var context = new webkitAudioContext(),
	    _x, _y;
    }
    catch(err){
        alert("this uses the web audio API, try opening it in google chrome \n\n <3 whichlight" );
    }

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
        dots[id].silent();
    });

    socket.on('move', function (data) {
        if (!dots[data.id]) {
            dots[data.id] = dot(data, context);
        }
        dots[data.id].move(data);
    });

    socket.on('close', function (id) {
        dots[id].end();
        delete dots[id];
    });
});

