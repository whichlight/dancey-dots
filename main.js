
function dot(data, context, templates) {
    // setup //////////////////////////////////////////////////////////////////
    var that = this;

    this.id = data.id;
    this.col = data.col;

    var $el, _x, _y, oscillator, filter, gain, processor,
        t = 0, effects = {}, gain_init_value = 0.5;

    function initialize() {
        $('body').append(templates.dot(data));
        $el = $('body').find('#synth_'+data.id).first();

        // filter -> gain -> context.destination
        filter = context.createBiquadFilter();
        filter.type = 0;
        gain = context.createGainNode();
        gain.gain.value = gain_init_value;

        filter.connect(gain);
        gain.connect(context.destination);

        // oscillator -> filter
        // (needs to be redone each time oscillator starts and stops)
        prep_synths();

        // processor effects
        processor = context.createScriptProcessor(1024, 0, 2);
        processor.onaudioprocess = effects.constant.processor;
        processor.connect(context.destination);

        bind_keyup_events();

        // play
        that.move(data);
    }

    // moving, silencing, and ending a dot ////////////////////////////////////
    function prep_synths() {
        oscillator = context.createOscillator();
        oscillator.type = 1;
        oscillator.connect(filter);
    }

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

    this.silent = function() {
        oscillator.stop(0);
        prep_synths();
        $el.css('opacity', '0.2');
    };

    this.end = function() {
        oscillator.stop(0);
        $('body').remove($el);
    };

    // define processor effects here //////////////////////////////////////////
    effects.constant = {
        key_event: 48, // keyup ev.which for '0'
        start: function() {},
        process: function() {
            console.log('constant processor');
        },
        end: function() {},
    };
    effects.crescendo = {
        key_event: 67, // 'c'
        start: function() {
            gain.gain.value = 0.01;
        },
        process: function() {
                     console.log('crescendo processor');
                     gain.gain.value *= 1.1;
                 },
        end: function() {
                 gain.gain.value = gain_init_value;
             },
        duration: 75,
    };
    effects.wobble = {
        key_event: 87, // 'w'
        start: function() {
            gain.gain.value = gain_init_value;
        },
        process: function() {
                     console.log('wobble processor');
                     gain.gain.value = gain_init_value + 0.75 * Math.sin(t);
                 },
        end: function() {
                 gain.gain.value = gain_init_value;
             },
    };

    // handling processor effects /////////////////////////////////////////////
    function transition_effects(o1, o2) {
        console.log('transition effects');
        processor.onaudioprocess = effects.constant.processor;
        t = 0;
        o1.end();
        o2.start();
        processor.onaudioprocess = o2.processor;
    }
    // each effect's processor does process() and knows when to end itself
    function make_processor(o) {
        return function() {
            o.process();
            t += 1;
            if (o.duration && t >= o.duration) {
                transition_effects(o, effects.constant);
            }
        }
    }
    _.each(effects, function(o, name) {
        o.processor = make_processor(o);
    });
    function bind_keyup_events() {
        var fxmap = {}; // map key event number to effect object
        _.each(effects, function(o, name) {
            fxmap[o.key_event] = o;
        });
        var current_effect = effects.constant;
        $(document).on('keyup', function(ev) {
            console.log('keyup ev', ev.which);
            var new_effect = fxmap[ev.which];
            if (new_effect) {
                transition_effects(current_effect, new_effect);
                current_effect = new_effect;
            }
        });
    }
    ///////////////////////////////////////////////////////////////////////////

    initialize();

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

