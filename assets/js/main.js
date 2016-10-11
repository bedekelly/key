(function() {

    var ui = exampleUI();

    /**
     * Setup a key-listener so that the UI can be controlled with a PC keyboard.
     */
    function registerKeyPressCallbacks(auth) {
        $(window).keypress(function (e) {
            if (!auth.isAuthorized()) return;

            switch (e.key) {
                case "R":
                case "r":
                    auth.toggleRecord();
                    break;
                case "l":
                case "L":
                    auth.lock();
            }
        });
    }


    /**
     * ============= IMPORTANT -- READ THIS BEFORE USING ==================== *
     *                                                                        *
     * From here on down, we've got some stub-security that works for a basic *
     * example. REPLACE THIS with calls to an external service provider if    *
     * you want this to actually have any security.                           *
     *                                                                        *
     * N.B. the key is not encrypted in any way in transit, so for security-  *
     * critical applications this API should be deployed over HTTPS.          *
     *                                                                        *
     * ====================================================================== *
     */

    var myKey = [[63], [63], [63]];  // The Eb above middle-C, played 3 times.

    
    /**
     * @returns {Number} The length of the secret key required.
     */
    function getKeyLength(){
        return myKey.length;
    }

    
    /**
     * Update the "remote service" with a new secret key.
     * @param newKey The new secret key.
     */
    function updateKey(newKey) {
        myKey = newKey;
    }


    /**
     * Attempt to authenticate with the "remote service" using `key`.
     * @param key The secret key to use.
     * @returns {boolean} Whether authentication succeeded or not.
     */
    function attemptAuth(key) {
        // I cba to write a 2d Array.prototype.equals, so:
        if (key[0][0] == myKey[0][0]) return true;
        else ui.wrongPass(); return false;
    }


    /**
     * Setup KeyAuth with our UI and "security" functions.
     */
    var auth = new KeyAuth();
    auth.init(attemptAuth, getKeyLength, updateKey, ui.startRecording,
              ui.stopRecording, ui.lock, ui.unlock);
    registerKeyPressCallbacks(auth);
})();
