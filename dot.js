// TODO it would be nice if dot_effects_display automatically matched the
// effects defined for a dot, and it would be nice if each dot did not redefine
// the same effects inside itself. we could have a globally defined dot_effects
// that gave back functions that apply themselves using the dot's context
var dot_effects_display = {
    constant: {
        description: 'no effects',
        key: '1',
    },
    accent: {
        description: '!',
        key: '2',
    },
    wobble: {
        description: 'wobble',
        key: '3',
    },
    swell: {
        description: 'swell',
        key: '4',
    },
};

var key_codes = {
    1: 49, // the keyup event for hitting the '1' key has event.which = 49
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
        start: function() {},
        process: function() {},
        end: function() {},
    };
    effects.accent = {
        start: function() {
            gain.gain.value = gain_init_value;
        },
        process: function() {
            if (t < 1) {
                gain.gain.value = .1 * gain.gain.value + .9 * 2;
                oscillator.frequency.value = 2.5 * _x;
            } else if (t < 3) {
                return;
            } else {
                gain.gain.value = .05 * gain.gain.value + .95 * gain_init_value;
            }
        },
        end: function() {
            gain.gain.value = gain_init_value;
            oscillator.frequency.value = _x;
        },
        duration: 4,
    },
    effects.wobble = {
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
    var current_effect = effects.constant;
    function transition_effects_to(new_effect) {
        processor.onaudioprocess = effects.constant.processor;
        t = 0;
        current_effect.end();
        new_effect.start();
        current_effect = new_effect;
        processor.onaudioprocess = new_effect.processor;
    }
    // each effect's processor does process() and knows when to end itself
    function make_processor(o) {
        return function() {
            o.process();
            t += 1;
            if (o.duration && t >= o.duration) {
                transition_effects_to(effects.constant);
            }
        }
    }
    _.each(effects, function(o, name) {
        o.processor = make_processor(o);
    });
    function bind_keyup_events() {
        var fxmap = {}; // map key code to effect object
        _.each(effects, function(o, name) {
            var key_character = dot_effects_display[name].key;
            var key_code = key_codes[key_character];
            fxmap[key_code] = o;
        });
        $(document).on('keyup', function(ev) {
            var new_effect = fxmap[ev.which];
            if (new_effect) {
                transition_effects_to(new_effect);
            }
        });
    }
    ///////////////////////////////////////////////////////////////////////////

    initialize();

    return this;
}

