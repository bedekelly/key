/**
 * Created by bede on 01/10/2016.
 */

UPDATE_FN = function(chords){};
AMP_LEVEL = 0;
AUDIO_CONTEXT = new window.AudioContext();
ACTIVE_VOICES = {};
CURRENT_CHORD = new Set();
MAX_CHORD = new Set();
CHORDS = undefined;
AUTH = {fn: undefined};
RECORDING = false;

function arrayFromIterable(iter) {
    var arr = [];
    iter.forEach(function(i, _){
        arr.push(i);
    });
    return arr;
}

var EnvelopeGenerator = (function(context) {
    function EnvelopeGenerator() {
        this.attackTime = 0;
        this.decayTime = 0.2;

        var that = this;
        $(document).bind('gateOn', function (_) {
            that.trigger();
        });
        $(document).bind("gateOff", function(_) {
            console.log("gate off");
            that.offTrigger();
        });
        $(document).bind('setAttack', function (_, value) {
            that.attackTime = value;
        });
        $(document).bind('setRelease', function (_, value) {
            that.releaseTime = value;
        });
    }

    EnvelopeGenerator.prototype.trigger = function() {
        now = context.currentTime;
        this.param.cancelScheduledValues(now);
        this.param.setValueAtTime(0, now);
        this.param.linearRampToValueAtTime(1, now + this.attackTime);
    };

    EnvelopeGenerator.prototype.offTrigger = function() {
        now = context.currentTime;
        this.param.cancelScheduledValues(now);
        this.param.setValueAtTime(1, now);
        this.param.linearRampToValueAtTime(0, now+this.decayTime);
    };

    EnvelopeGenerator.prototype.connect = function(param) {
        this.param = param;
    };

    return EnvelopeGenerator;
})(AUDIO_CONTEXT);


var Oscillator = (function(context) {
    function Oscillator() {
        this.oscillator = context.createOscillator();
        this.oscillator.type = "sine";
        this.output = this.oscillator;
        this.input = this.oscillator;
    }

    Oscillator.prototype.setFrequency = function(freq) {
        this.frequency = freq;
    };

    Oscillator.prototype.start = function() {
        this.oscillator.frequency.value = this.frequency;
        this.oscillator.start(0);
    };

    Oscillator.prototype.connect = function(node) {
        if (node.hasOwnProperty("input")) {
            this.output.connect(node.input);
        } else {
            this.output.connect(node);
        }
    };

    Oscillator.prototype.stop = function() {
        console.log("stopping");
        this.oscillator.stop();
    };

    return Oscillator
})(AUDIO_CONTEXT);


var Amp = (function(context) {
    function Amp() {
        this.gain = context.createGain();
        this.gain.value = AMP_LEVEL;
        this.input = this.gain;
        this.output = this.gain;
        this.amplitude = this.gain.gain;
    }

    Amp.prototype.connect = function(node) {
        if (node.hasOwnProperty("input")) {
            this.output.connect(node.input);
        } else {
            this.output.connect(node);
        }
    };
    return Amp;
})(AUDIO_CONTEXT);


var Voice = (function(context) {
    function Voice(frequency) {
        this.frequency = frequency;
        this.oscillators = [];
    }

    Voice.prototype.start = function() {
        // Setup the oscillator.
        var osc = new Oscillator;
        osc.setFrequency(this.frequency);

        // Setup the amplifier.
        var amp = new Amp();

        // Route connections.
        var env = new EnvelopeGenerator();
        osc.connect(amp);
        env.connect(amp.amplitude);
        amp.connect(context.destination);

        // Start the oscillator immediately.
        $.event.trigger("gateOn");
        osc.start();
        $.event.trigger("gateOff");

        // Keep track of the oscillators we're using.
        this.oscillators.push(osc);
    };

    Voice.prototype.stop = function() {
        this.oscillators.forEach(function(osc, _) {
            osc.stop();
        });
    };

    return Voice;
})(AUDIO_CONTEXT);


var Synth = function() {
    function Synth() {
        var self = this;
        self.voices = {};
    }

    Synth.prototype.noteOn = function(freq, velocity) {
        var self = this;
        var voice = new Voice(freq);
        self.voices[freq] = voice;
        voice.start();
    };

    Synth.prototype.noteOff = function(freq, velocity) {
        var self = this;
        self.voices[freq].stop();
        delete self.voices[freq];
    };
    return new Synth();
};


synth = Synth();


var frequency = function(note) {
    return 440 * Math.pow(2, (note-69)/12);
};


var startRecording = function() {
    console.log("start recording");
    RECORDING = true;
    CHORDS = [];
    $(".background").css("background-color", "#e74c3c");
    $(".glyphicon-ok-circle").removeClass("glyphicon-ok-circle").addClass("glyphicon-record");
    $(".lock-text").text("Recording...");
    $("#record-text").text("Press R to stop recording")
};

var stopRecording = function() {
    console.log("stop recording:");
    RECORDING = false;
    var chords = [];
    CHORDS.forEach(function(e, _){
        chords.push(arrayFromIterable(e));
    });
    console.log("CHORDS COMING UP");
    console.log(chords);
    if (chords.length > 0) {UPDATE_FN(chords);}
    else console.log("Not updating chords");
    CHORDS = new FixedQueue(chords.length);
    $(".background").css("background-color", "#2ecc71");
    $(".glyphicon-record").removeClass("glyphicon-record").addClass("glyphicon-ok-circle");
    $(".lock-text").text("Unlocked");
    $("#record-text").text("Press R to record")
};


var onMidiMessage = function(message) {
    data = message.data;

    command = data[0] >> 4;
    channel = data[0] & 0xf;
    type = data[0] & 0xf0;
    note = data[1];
    velocity = data[2];
    freq = frequency(note);

    switch(type) {
        case 144:
            //synth.noteOn(freq, velocity);
            // Add note to current chord
            CURRENT_CHORD.add(note);
            // If current chord greater than max, store it
            if (CURRENT_CHORD.size >= MAX_CHORD.size)
                MAX_CHORD.clear();
            CURRENT_CHORD.forEach(function(item, _){
                MAX_CHORD.add(item);
            });
            break;
        case 128:
            //synth.noteOff(freq);
            CURRENT_CHORD.delete(note);
            if (CURRENT_CHORD.size == 0) {
                CHORDS.push(MAX_CHORD);
                console.log(arrayFromIterable(MAX_CHORD));
                var chords = arrayFromIterable(CHORDS);
                if (!RECORDING) {
                    AUTH.fn(chords);
                }
                MAX_CHORD = new Set();
            }
    }
};


var onMidiSuccess = function(midiAccess) {
    var inputs = midiAccess.inputs.values();
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = onMidiMessage;
    }
    CHORDS = FixedQueue(SECRET_KEY_LENGTH(), []);
};


if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMidiSuccess)
} else {
    console.log("No midi support");
}

var musicAuthInit = function(attemptAuth, updateKey) {
    AUTH.fn = attemptAuth;
    UPDATE_FN = updateKey;
};

function toggleRecord() {
    if (RECORDING) stopRecording();
    else startRecording();
}