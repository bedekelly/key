var KeyAuth = function(){
    
    // Private internal variables:
    var NOTE_OFF = 128, NOTE_ON = 144;
    var CURRENT_CHORD = new Set(), MAX_CHORD = new Set(), CHORDS;
    var AUTH_FN, UPDATE_FN, START_RECORDING_FN, STOP_RECORDING_FN, LOCK_FN,
        GET_KEY_LENGTH, UNLOCK_FN;
    var RECORDING = false, AUTHORIZED = false;


    /**
     * Start recording, and fire off the callback we've been given.
     * Make sure to reset CHORDS so that we're recording onto a clean slate.
     */
    function startRecording() {
        RECORDING = true;
        CHORDS = [];
        START_RECORDING_FN();
    }


    /**
     * Stop recording to CHORDS, and fire the callback we've been given.
     * (except if we haven't picked up any chords. Then do nothing.)
     * Again make sure to reset CHORDS.
     */
    function stopRecording() {
        RECORDING = false;
        var chords = [];

        // Build up an array of chord-arrays from the chord-sets we have now.
        CHORDS.forEach(function(e){
            chords.push(Array.from(e));
        });

        // If we've recorded a new chord sequence, run our update callback.
        if (chords.length > 0) {
            UPDATE_FN(chords, function(msg) {
                console.log(msg);
            });
        }

        // Reset our queue of currently-played chords, and fire the callback.
        if (chords.length == 0)
            GET_KEY_LENGTH(function(length){
                CHORDS = new FixedQueue(length);
            });
        else {
            CHORDS = new FixedQueue(chords.length);
        }

        STOP_RECORDING_FN();
    }


    /**
     * Handler for when a note is pressed down on the midi keyboard.
     * @param note An identifier for the note. Should be a unique integer.
     */
    function notePressed(note) {
        CURRENT_CHORD.add(note);

        /* A "chord" in our sequence is the longest array of notes played at
         * once. In case of a tie, the latest array is chosen.
         */
        if (CURRENT_CHORD.size >= MAX_CHORD.size)
            MAX_CHORD = new Set(CURRENT_CHORD);
    }


    /**
     * Handler for when a note is released on the midi keyboard.
     * @param note An identifier for the note. Should be a unique integer.
     * @param auth An instance of KeyAuth.
     */
    function noteReleased(note, auth) {
        CURRENT_CHORD.delete(note);

        // Handle the case where no notes are pressed any more.
        if (CURRENT_CHORD.size == 0) {
            CHORDS.push(MAX_CHORD);
            MAX_CHORD = new Set();

            // If we're not authorized already, try to login.
            GET_KEY_LENGTH(function(keyLength) {
                if (!AUTHORIZED && CHORDS.length == keyLength) {
                    // Convert CHORDS to a 2d array.
                    var chords = [];
                    CHORDS.forEach(function(e){
                        chords.push(Array.from(e));
                    });

                    // Authenticate and reset.
                    AUTH_FN(chords, auth.unlock);
                    CHORDS = new FixedQueue(keyLength);
                }
            });

        }
    }


    /**
     * Callback for when a MIDI message is received. Read the MIDI data and
     * delegate to notePressed and noteReleased where appropriate.
     * @param message The MIDI message, as an Array of bytes.
     * @param auth An instance of KeyAuth.
     */
    function onMidiMessage(message, auth) {
        // Extract information from MIDI data.
        var messageType = message.data[0] & 0xf0;
        var note = message.data[1];

        switch(messageType) {
            case NOTE_ON:
                notePressed(note, auth);
                break;
            case NOTE_OFF:
                noteReleased(note, auth);
        }
    }


    /**
     * Handler for when MIDI support is successfully confirmed.
     * @param midiAccess A MIDI Access object to interact with MIDI devices.
     * @param auth An instance of KeyAuth.
     */
    function onMidiSuccess(midiAccess, auth) {
        var inputs = midiAccess.inputs.values();

        // For each MIDI device:
        for (var input=inputs.next(); input&&!input.done; input=inputs.next()){
            // Register our onMidiMessage function as a callback.
            input.value.onmidimessage = function(message){
                onMidiMessage(message, auth)
            };
        }
    }


    /**
     * Attempt to setup MIDI interaction, logging a failure to the console
     * where MIDI support isn't available.
     */
    function setupMidi(auth) {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess({
                sysex: false
            }).then(function(midiAccess){onMidiSuccess(midiAccess, auth)})
        } else {
            console.log("No midi support available.");
        }
    }


    /**
     * Initialize the midiAuth library with some callback functions, and make
     * sure to set up MIDI interaction support.
     * @param attemptAuth A callback function to attempt authentication. Will
     *                    be called with a key of the correct length.
     * @param getKeyLength This function should return the length of the key.
     * @param updateKey This function should be able to update the secret key.
     * @param startRecord This function will be called when we start recording.
     * @param stopRecord This function will be called when we stop recording.
     * @param lock This function will be called when we deauthorize ("lock").
     * @param unlock This function will be called when we authorize ("unlock").
     */
    function init(attemptAuth, getKeyLength, updateKey, startRecord,
                  stopRecord, lock, unlock)
    {
        AUTH_FN = attemptAuth;
        UPDATE_FN = updateKey;

        GET_KEY_LENGTH = getKeyLength;
        START_RECORDING_FN = startRecord;
        STOP_RECORDING_FN = stopRecord;
        LOCK_FN = lock;
        UNLOCK_FN = unlock;
        getKeyLength(function(length){
            CHORDS = new FixedQueue(length);
        });
        setupMidi(this);

    }


    /**
     * Lock KeyAuth. It's the responsibility of LOCK_FN to delete any access
     * tokens we may have.
     */
    function lock() {
        if (RECORDING) return;  // Can't lock while recording!
        GET_KEY_LENGTH(function(length){
            CHORDS = new FixedQueue(length);
            AUTHORIZED = false;
            LOCK_FN();
        });
    }

    /**
     * Unlock KeyAuth. Again, it's the responsibility of UNLOCK_FN to
     * actually deal with auth, this is just updating our internal state.
     */
    function unlock() {
        AUTHORIZED = true;
        UNLOCK_FN();
    }


    /**
     * If we're recording, stop. Otherwise start recording.
     */
    function toggleRecord() {
        if (RECORDING) stopRecording();
        else startRecording();
    }


    /**
     * @returns {boolean} Is KeyAuth currently authorized (unlocked)?
     */
    function isAuthorized() {
        return AUTHORIZED;
    }


    this.init = init;
    this.lock = lock;
    this.unlock = unlock;
    this.toggleRecord = toggleRecord;
    this.isAuthorized = isAuthorized;
};