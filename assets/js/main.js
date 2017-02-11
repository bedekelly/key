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

    var API_URL = "http://localhost:5000";

    /**
     * @returns {*} Callback to get length of the secret key required.
     */
    function getKeyLength(cb){
        jQuery.get(
            API_URL + "/auth/keylength"
        ).then(function(response) {
            cb(response.keylength);
        })
    }

    
    /**
     * Update the "remote service" with a new secret key.
     * @param cb
     * @param newKey The new secret key.
     */
    function updateKey(newKey, cb) {
        console.log(cb);
        console.log(newKey);
        var token = sessionStorage.getItem("token");
        jQuery.ajax(
            {
                url: API_URL + "/auth/key?token=" + token,
                type: "POST",
                data: JSON.stringify({
                    key: newKey
                }),
                contentType: 'application/json; charset=utf-8',
                dataType: 'json'
            }
        ).then(function(response) {
            cb(response.message);
        });
    }


    function formatKey(key) {
        return encodeURIComponent(JSON.stringify(key));
    }


    /**
     * Attempt to authenticate with the "remote service" using `key`.
     * @param key The secret key to use.
     * @param onSuccess
     * @param onFailure
     * @returns {boolean} Whether authentication succeeded or not.
     */
    function attemptAuth(key, onSuccess, onFailure) {
        jQuery.get(
            API_URL + "/auth/token?key=" + formatKey(key)
        ).then(function(response){
            onSuccess(response.token);
            sessionStorage.setItem("token", response.token);
        }, function(err){
            if (onFailure) onFailure(err.error);
            ui.wrongPass();
        });
    }


    /**
     * Setup KeyAuth with our UI and "security" functions.
     */
    var auth = new KeyAuth();
    auth.init(attemptAuth, getKeyLength, updateKey, ui.startRecording,
              ui.stopRecording, ui.lock, ui.unlock);
    registerKeyPressCallbacks(auth);
})();
