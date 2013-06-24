$(document).ready(function() {
    try{
        var context = new webkitAudioContext(),
	    _x, _y;
    }
    catch(err){
        alert("this uses the web audio API, try opening it in google chrome \n\n <3 whichlight" );
    }

    var col;
    var synths = {};
    var pressed;
    var time=(new Date()).getTime();

    //prepare the synths, fill buffer to play

    //mouse down, play your synth
    $(document).mousedown(function(e){
        pressed = true;
        sendMousePosition(e);
    });

    //mouse up, stop playing your synth, and prepare the buffer
    $(document).mouseup(function(){
        //oscillator.noteOff(0);
        //prepSynths();
        pressed = false;
        socket.emit('silent',{state:"stop"});
    });

    //socketio
    //var socket = io.connect('http://whichlight.synth_fun.jit.su/');
    var socket = io.connect('http://localhost:8000');

    function synthmap(x,y){
        tx = 30+Math.pow(2,x/72.0);
        ty = 200+Math.pow(2.5,($(window).height()-y)/72.0);
        return [tx,ty]
    }

    document.onmousemove = sendMousePosition;

    socket.on('silent',function(id){
        $('#synth_'+id).css({'opacity' : '0.2'});
        synths[id][0].noteOff(0);
        synths[id] = prepSynths();
    });

    socket.on('move', function (data) {
        if($('#synth_'+data['id']).length == 0) {
            $('body').append('<span class="synth" id="synth_'+data['id']+'"><span style="display:none;" class="chat"/></span>');
        }

        $('#synth_'+data['id']).css({
            'left' : (data['x']-20) + 'px',
            'top' : data['y']-20 + 'px',
            'background-color': data['col'],
            'opacity' : '0.7'
        });

        socket.on('close', function (id) {
            $('#synth_'+id).remove();
        });

        if(!synths[data.id]){
            synths[data.id] = prepSynths();
        }
        var n = synthmap(data.x, data.y);
        _x = n[0];
        _y = n[1];
        if(synths[data.id]){
            if(synths[data.id][0] && synths[data.id][1]){
                synths[data.id][0].frequency.value = _x;
                synths[data.id][1].frequency.value = _y;
                synths[data.id][0].noteOn(0);
            }
        }
    });

    var sendMousePosition = _.throttle(function(mp){
        if(pressed){
            socket.emit('move', {
                x: mp.pageX,
                y: mp.pageY,
                w: $(window).width(),
                h: $(window).height()
			});
        }
        return true;
    }, 40);

    function prepSynths(){
        var oscillator = context.createOscillator(); //need perens here
        oscillator.type = 1;
        oscillator.frequency.value = _x;

        //filter
        var filter = context.createBiquadFilter();
        filter.type = 0;
        filter.frequency.value = _y;

        //volume
        var gainNode = context.createGainNode();
        gainNode.gain.value = 0.05;

        //connect it all
        oscillator.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(context.destination);

		return [oscillator, filter];
	}
});

