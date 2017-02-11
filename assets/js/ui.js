var exampleUI = (function() {

    /**
     * This block of functions alter the UI to reflect the current state
     * of the authentication process: locked, unlocked or recording.
     */

    /**
     * Updates the UI to show the "authenticated" dashboard.
     */
    function UIUnlock() {
        $(".background").css("background-color", "#2ecc71");
        $(".glyphicon-remove-circle")
            .removeClass("glyphicon-remove-circle")
            .addClass("glyphicon-ok-circle");
        $(".lock-text").text("Unlocked");
        $(".secret-info").css("visibility", "visible");
        $(".instructions").css("visibility", "visible");
        $(".instructions>#lock-text").text("Press L to lock");
        $(".instructions>#record-text").show();
        $(".instructions>#record-text").text("Press R to record")
    }


    /**
     * Show a temporary message to demonstrate that the given key was wrong.
     */
    function UIWrongPass() {
        $(".background").css("background-color", "#e74c3c");
        setTimeout(function () {
            $(".background").css("background-color", "#3498db");
        }, 1000);
    }


    /**
     * Update the UI to show the "locked" screen.
     */
    function UILock() {
        $(".background").css("background-color", "#3498db");
        $(".glyphicon-ok-circle")
            .removeClass("glyphicon-ok-circle")
            .addClass("glyphicon-remove-circle");
        $(".lock-text").text("Locked");
        $(".secret-info").css("visibility", "hidden");
        $(".instructions").css("visibility", "hidden");
    }


    /**
     * Update the UI to show that we're currently recording.
     */
    function UIStartRecording() {
        $(".background").css("background-color", "#e74c3c");
        $("#icon")
            .removeClass("glyphicon-ok-circle")
            .addClass("glyphicon-record");
        $(".lock-text").text("Recording...");
        $(".secret-info").css("visibility", "hidden");
        $(".instructions>#lock-text").text("");
        $(".instructions>#record-text").text("Press R to stop recording")
    }


    /**
     * Update the UI to return to the dashboard.
     */
    function UIStopRecording() {
        $("#icon")
            .removeClass("glyphicon-record")
            .addClass("glyphicon-ok-circle");
        UIUnlock();
    }


    return {
        startRecording: UIStartRecording,
        stopRecording: UIStopRecording,
        lock: UILock,
        unlock: UIUnlock,
        wrongPass: UIWrongPass
    }

});