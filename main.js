var context;
var col;
var _x, _y;
var synths = {};
var pressed;
var time=(new Date()).getTime();
var client_id;


var checkFeatureSupport = function(){
  try{
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    context = new AudioContext();
  }
  catch (err){
    alert('web audio not supported');
  }

  if (!window.DeviceMotionEvent) {
    alert("DeviveMotionEvent not supported");
  }
}



$(document).ready(function() {
  try{
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    var context = new AudioContext();
  }
  catch(err){
    alert("this uses the web audio API, try opening it in google chrome \n\n <3 whichlight" );
  }

//  alert("Turn the volume up and touch the screen. Share the URL with a friend to hear their sounds. Let's have a wild synth party! \n\n <3 @whichlight");

  var color = hsvToRgb(Math.random(),1,1);
  col = 'rgb(' + color.join(',') + ')';

    checkFeatureSupport();
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
    });


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
  sendData(data);
  playSynth(data);
}

var touchDeactivate = function(){
  pressed=false;
  socket.emit('silent',{state:"stop"});
}

//
//socketio

var socket = io.connect('http://'+window.location.hostname);

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
  $('#synth_'+id).css({
    'opacity' : '0.2'
  });

  console.log(id);
  synths[id][2].gain.value=0;
});

socket.on('move', function (data) {
  playSynth(data);
});

var playSynth = function(data){
  if($('#synth_'+data['id']).length == 0 && typeof data['id'] !="undefined") {
    $('body').append('<span class="synth" id="synth_'+data['id']+'"><span style="display:none;" class="chat"/></span>');
  }

  $('#synth_'+data['id']).css({
    'left' : (data['x']*$(window).width()-20) + 'px',
    'top' : data['y']*$(window).height()-20 + 'px',
    'background-color': data['col'],
    'opacity' : '0.7'
  });

  if(!synths[data.id] && typeof data.id != "undefined"){
    synths[data.id]=prepSynths();
  }
  var n = synthmap(data.x,data.y);
  _x=n[0];
  _y=n[1];
  if(synths[data.id]){
    if(synths[data.id][0] && synths[data.id][1]){
      synths[data.id][0].frequency.value=_x;
      synths[data.id][1].frequency.value=_y;
      synths[data.id][2].gain.value=(0.2+data.y/3);
      if(synths[data.id][0].playbackState==0){
       synths[data.id][0].start(0);
      }
    }
  }

}

socket.on('close', function (id) {
  console.log('disconnect ' + id);
  if(id in synths){
    if(synths[id][0].playbackState>1){
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
  oscillator.type=1;
  oscillator.frequency.value=_x;
  //filter
  var filter = context.createBiquadFilter();
  filter.type=0;
  filter.frequency.value=_y;

  //volume
  var gainNode = context.createGain();
  gainNode.gain.value=0.05;

  //connect it all
  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(context.destination);
  return [oscillator, filter, gainNode]
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
