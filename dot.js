// TODO it would be nice if dot_effects_display automatically matched the
// effects defined for a dot, and it would be nice if each dot did not redefine
// the same effects inside itself. we could have a globally defined dot_effects
// that gave back functions that apply themselves using the dot's context
var dot_effects_display = {
    constant: {
        description: 'no effects',
        key: '1',
    },
    wobble: {
        description: 'wobble',
        key: '3',
    },
    swell: {
        description: '!',
        key: '4',
    },
};

var key_numbers = {
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
};

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
        key_event: key_numbers[dot_effects_display.constant.key],
        start: function() {},
        process: function() {},
        end: function() {},
    };
    effects.wobble = {
        key_event: key_numbers[dot_effects_display.wobble.key],
        start: function() {
            gain.gain.value = gain_init_value;
        },
        process: function() {
            gain.gain.value = gain_init_value + 0.75 * Math.sin(t);
        },
        end: function() {
            gain.gain.value = gain_init_value;
        },
    };
    effects.swell = {
        key_event: key_numbers[dot_effects_display.swell.key],
        start: function() {
            gain.gain.value = gain_init_value;
        },
        process: function() {
            if (t < 25) {
                gain.gain.value *= 1.1;
            } else {
                gain.gain.value = .7 * gain.gain.value + .3 * gain_init_value;
            }
        },
        end: function() {
            gain.gain.value = gain_init_value;
        },
        duration: 50,
    };

    // handling processor effects /////////////////////////////////////////////
    function transition_effects(o1, o2) {
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

