/**
 * Created by bede on 01/10/2016.
 */

AMP_VALUE = 0.3;
AUDIO_CONTEXT = new window.AudioContext();
ACTIVE_VOICES = {};


var Oscillator = (function(context) {
    function Oscillator() {
        this.oscillator = context.createOscillator();
        this.oscillator.type = "sine";
        this.output = this.oscillator;
        this.input = this.oscillator;
    }

    Oscillator.prototype.setFrequency = function(freq) {
        console.log("setting osc frequency to " + freq);
        this.oscillator.frequency.setValueAtTime(freq, context.currentTime);
    };

    Oscillator.prototype.start = function() {
        console.log("starting osc");
        this.oscillator.start(0);
    };

    Oscillator.prototype.connect = function(node) {
        console.log("connecting osc:");
        console.log(node);
        if (node.hasOwnProperty("input")) {
            this.output.connect(node.input);
        } else {
            this.output.connect(node);
        }
    };

    Oscillator.prototype.stop = function() {
        console.log("stopping osc");
        this.oscillator.stop();
    };

    return Oscillator
})(AUDIO_CONTEXT);


var EnvelopeGenerator = (function(context) {
    function EnvelopeGenerator() {
        this.attackTime = 0.1;
        this.releaseTime = 0.1;

        var self = this;
        $(document).bind("gateOn", function(_) {
            console.log("gate on");
            self.trigger();
        });
    }

    EnvelopeGenerator.prototype.trigger = function() {
        console.log("triggered");
        var now = context.currentTime;
        this.param.cancelScheduledValues(now);
        this.param.setValueAtTime(0, now);
        this.param.linearRampToValueAtTime(1, now + this.attackTime);
        this.param.linearRampToValueAtTime(0, now + this.attackTime + this.releaseTime);
    };

    EnvelopeGenerator.prototype.connect = function(param) {
        this.param = param;
    };

    return EnvelopeGenerator;
})(AUDIO_CONTEXT);


var Amp = (function(context) {
    function Amp() {
        this.gain = context.createGain();
        this.gain.gain.value = 0.5;
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
        console.log("frequency: "+ frequency);
        this.frequency = frequency;
        this.oscillators = [];
    }

    Voice.prototype.start = function() {
        console.log("starting voice");

        // Setup the oscillator.
        var osc = new Oscillator;
        osc.setFrequency(this.frequency);

        // Setup the amplifier.
        var amp = new Amp;
        var env = new EnvelopeGenerator;

        // Route connections.
        osc.connect(amp);
        env.connect(amp.amplitude);
        amp.connect(context.destination);

        // Start the oscillator immediately.
        osc.start();

        // Keep track of the oscillators we're using.
        this.oscillators.push(osc);
    };

    Voice.prototype.stop = function() {
        console.log("stopping voice");
        this.oscillators.forEach(function(osc, _) {
            osc.stop();
        })
    };

    return Voice;
})(AUDIO_CONTEXT);


var Synth = function() {
    function Synth() {
        var self = this;
        self.voices = {};
    }

    Synth.prototype.noteOn = function(freq, velocity) {
        console.log("Synth note on");
        var self = this;
        var voice = new Voice(freq);
        self.voices[freq] = voice;
        voice.start();
    };

    Synth.prototype.noteOff = function(freq, velocity) {
        console.log("Synth note off");
        var self = this;
        self.voices[freq].stop();
        delete self.voices[freq];
    };
    return new Synth();
};



audioEngine = Synth();


var frequency = function(note) {
    return 440 * Math.pow(2, (note-69)/12);
};


var onMidiMessage = function(message) {
    console.log("midi message");
    data = message.data;
    console.log("data: "+ data);

    command = data[0] >> 4;
    channel = data[0] & 0xf;
    type = data[0] & 0xf0;
    note = data[1];
    velocity = data[2];
    freq = frequency(note);

    switch(type) {
        case 144:
            audioEngine.noteOn(freq, velocity);
            break;
        case 128:
            audioEngine.noteOff(freq);
            break;
    }
};


var onMidiSuccess = function(midiAccess) {
    console.log("midi success");
    var inputs = midiAccess.inputs.values();
    for (var input = inputs.next(); input && !input.done; input = inputs.next()) {
        input.value.onmidimessage = onMidiMessage;
    }
};


if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMidiSuccess)
} else {
    console.log("No midi support");
}