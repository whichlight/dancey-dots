var context;
var col;
var _x, _y;
var synths = {};
var pressed;
var time=(new Date()).getTime();
var client_id;

var THROTTLE_MS = 50,  // only emit on socket once per this many ms

    // the smaller the coeff the more the ball lags behind the mouse. the higher
    // it is the jumpier throttled move messages will appear.
    SMOOTHING_COEFFICIENT = 0.3;

var checkFeatureSupport = function(){
  try{
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    context = new AudioContext();

    var iOS = ( navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false );
    if (iOS) {
        $("#fun").prepend("<p id='initialize'>tap to initialize</p>");
        window.addEventListener('touchend', function() {
            var buffer = context.createBuffer(1, 1, 22050);
            var source = context.createBufferSource();
            source.buffer = buffer;
            source.connect(context.destination);
            source.start(0);
            $("#initialize").remove();
        }, false);
    }


  }
  catch (err){
    alert("this uses the web audio API, try opening it in google chrome \n\n <3 whichlight" );
  }
}

// updates synth location, pitch & filter frequency on every animation
// frame. this is the only place that synth.coords is written to.
function updateSynths(){
    for (var cid in synths){
        var synth = synths[cid],
            coef = SMOOTHING_COEFFICIENT,
            synthArgs;

        if(!synth.playing) {
            synth.gainNode.gain.value=0;
            synths[cid].coords.x = synths[cid].coords.y = null;
            $('#synth_'+cid).css({
                'opacity' : '0.2'
            });
            continue;
        }

        if(!synth.started){
            synth.started = true;
            synth.oscillator.start(0);
        }

        // if coords are null, set them to synth.dest. this prevents the synth
        // blob from sliding to a note on mouse down. it just instantly appears
        // there.
        synth.coords.x = synth.coords.x == null ? synth.dest.x : synth.coords.x;
        synth.coords.y = synth.coords.y == null ? synth.dest.y : synth.coords.y;

        // simple exponential smoothing
        synth.coords.x = synth.dest.x * coef + (1 - coef) * synth.coords.x;
        synth.coords.y = synth.dest.y * coef + (1 - coef) * synth.coords.y;

        synthArgs = synthmap(synth.coords.x, synth.coords.y);
        synth.oscillator.frequency.value = synthArgs[0];
        synth.filter.frequency.value = synthArgs[1];
        synth.gainNode.gain.value=(0.2+synth.coords.y/3);

        $('#synth_'+cid).css({
            'left' : (synth.coords.x*$(window).width()-20) + 'px',
            'top' : synth.coords.y*$(window).height()-20 + 'px',
            'background-color': synth.color,
            'opacity' : '0.7'
        });

    }
    window.requestAnimationFrame(updateSynths);
}

$(document).ready(function() {
  checkFeatureSupport();
  alert("Turn the volume up and touch the screen. Share the URL with a friend to hear their sounds. Let's have a wild synth party! \n\n <3 @whichlight");

  var color = hsvToRgb(Math.random(),1,1);
  col = 'rgb(' + color.join(',') + ')';

    $fun = document.getElementById("fun");
    hammertime = Hammer($fun, {
      prevent_default: true,
      no_mouseevents: true
    })
    .on('touch', function(event){
      touchActivate(event);
    })
    .on('drag', function(event){
      touchActivate(event);
    })
    .on('release', function(event){
      touchDeactivate();
    });
    updateSynths();
});

// calls fun at most once every ms.
function throttle(ms, fun){
    var then = performance.now(),
        that = this,
        lastArgs = null,
        timeout = null;

    return function(){
        var now = performance.now(),
            args = Array.prototype.slice.apply(arguments);
        if(now - then > ms){
            fun.apply(that, args);
            then = now;
            // TODO: clear the timeout here?
        } else {
            // if it hasn't been long enough, schedule the most recent function
            // call to fire after `ms` have passed.
            lastArgs = args;
            timeout && window.clearTimeout(timeout);
            timeout = window.setTimeout(function(){
                fun.apply(that, args);
            }, ms);
        }
    };
}


var touchActivate = function(event){
  pressed= true;
  var c = event.gesture.center;
  var x = c.pageX;
  var y = c.pageY;
  $("#press").html("");
  var xRatio = x/$(window).width();
  var yRatio = y/$(window).height();
  var data = {
    x:xRatio,
    y:yRatio,
    col:col,
    id:client_id,
  }
  if(typeof client_id != "undefined"){
    socket.emit('move', data);
  }
  playSynth(data);
}

var touchDeactivate = function(){
  pressed=false;
  socket.emit('silent',{state:"stop"});
  synths[client_id].playing = false;
}

//
//socketio

var socket = io.connect('http://'+window.location.hostname);
socket.emit = throttle.call(socket, THROTTLE_MS, socket.emit);

function synthmap(x,y){
  tx = 40*Math.pow(2,x*5);
  ty = 100*Math.pow(2,(1-y)*6);
  return [tx,ty]
}

function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}


socket.on('connect',function(){
  client_id = socket.socket.sessionid;
  console.log(client_id);

  if(typeof client_id != "undefined"){
  $('body').append('<span class="synth" id="synth_'+client_id+'"><span style="display:none;" class="chat"/></span>');
  }

  $('#synth_'+client_id).css({
    'left' : ($(window).width()/2-20) + 'px',
    'top' : $(window).height()/2-20 + 'px',
    'background-color': col,
    'opacity' : '0.2'
  });

  if(typeof client_id !="undefined"){
    synths[client_id]=prepSynths();
  }

});

socket.on('silent',function(id){
  console.log(id);
  synths[id].playing = false;
});

socket.on('move', function (data) {
  playSynth(data);
});

var playSynth = function(data){
  if($('#synth_'+data['id']).length == 0 && typeof data['id'] !="undefined") {
    $('body').append('<span class="synth" id="synth_'+data['id']+'"><span style="display:none;" class="chat"/></span>');
  }

  if(!synths[data.id] && typeof data.id != "undefined"){
    synths[data.id]=prepSynths();
  }

  var synth = synths[data.id];
  if(synth){
      synth.dest.x = data.x;
      synth.dest.y = data.y;
      synth.color = data.col;
      synth.playing = true;
  }
};

socket.on('close', function (id) {
  console.log('disconnect ' + id);
  if(id in synths){
    if(synths[id][3]){
      synths[id][0].stop(0);
      synths[id][0].disconnect(0);
    }
  }
  $('#synth_'+id).remove();
});


function sendData(data) {
  var now = (new Date()).getTime();
  if(typeof client_id != "undefined" && pressed && (now-time>40)){
    socket.emit('move', data);
    time= (new Date()).getTime();
  }
  return true;
}


function prepSynths(){
  var oscillator = context.createOscillator(); //need perens here
  oscillator.type="square";
  oscillator.frequency.value=_x || 0;
  //filter
  var filter = context.createBiquadFilter();
  filter.type="lowpass";
  filter.frequency.value=_y || 0;

  //volume
  var gainNode = context.createGain();
  gainNode.gain.value=0.05;

  //connect it all
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);

  return {
      started: false,
      playing: false,  // false on touchDeactivate

      // dest contains the destination coordinates the server gave us for this
      // node. these are updated by use interaction / move messages from server.
      dest: {x: 0, y: 0},

      // coords contains the current on-screen location of the node. these
      // coordinates transition smoothly between the coords in .dest
      coords: {x: null, y: null},

      color: null,
      oscillator: oscillator,
      filter: filter,
      gainNode: gainNode
  };
}

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
