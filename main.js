var NUM_CHORDS_PLAYED = 0;
var UNLOCKED = false;

SECRET_KEY = [
    [63, 58, 55, 60],
    [54, 57, 60, 63],
    [56, 60, 53, 63],
    [58, 65, 60, 55],
    [58, 55, 63, 60]
];
SECRET_KEY_LENGTH = function(){return SECRET_KEY.length};


function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}


var setsEqual = function(setA, setB) {
    var equal = true;
    if (!setA || !setB) return false;
    setA.forEach(function(elem, _){
        equal &= setB.has(elem);
    });

    setB.forEach(function(elem, _){
        equal &= setA.has(elem);
    });
    return !!equal;
};

fixedQueuesEqual = function(queueA, queueB) {
    console.log(queueA);
    console.log(queueB);
    if (!(queueA.length & queueB.length)) return false;
    if (queueA.length != queueB.length) return false;
    var equal = true;
    for (var i=0; i<queueA.length; i++) {
        equal &= arraysEqual(queueA[i].sort(), arrayFromIterable(queueB[i]).sort());
    }
    console.log(!!equal);
    return !!equal;
};


function onSuccess() {
    UNLOCKED = true;
    $(".background").css("background-color", "#2ecc71");
    $(".glyphicon-remove-circle").removeClass("glyphicon-remove-circle").addClass("glyphicon-ok-circle");
    $(".lock-text").text("Unlocked");
    $(".instructions").css("visibility", "visible");
}

function onFailure() {
    $(".background").css("background-color", "#e74c3c");
    setTimeout(function(){
        $(".background").css("background-color", "#3498db");
    }, 1000);
}

function updateSecretKey(key) {
    SECRET_KEY = key;
}

function lock() {
    UNLOCKED = false;
    NUM_CHORDS_PLAYED = 0;
    $(".background").css("background-color", "#3498db");
    $(".glyphicon-ok-circle").removeClass("glyphicon-ok-circle").addClass("glyphicon-remove-circle");
    $(".lock-text").text("Locked");
    $(".instructions").css("visibility", "hidden");
}

musicAuthInit(function(chords){
    if (UNLOCKED) return;
    NUM_CHORDS_PLAYED += 1;
    var key = [];
    SECRET_KEY.forEach(function(i, _) {
        console.log(i);
        key.push(arrayFromIterable(i).sort());
    });
    var accepted = fixedQueuesEqual(key, chords);

    if (accepted) {
        onSuccess();
        UNLOCKED = true;
    } else if (NUM_CHORDS_PLAYED >= SECRET_KEY_LENGTH()) {
        onFailure();
        NUM_CHORDS_PLAYED = 0;
    }
}, updateSecretKey);



$(window).keypress(function(e){
    if (!UNLOCKED) return;
    console.log(e);
    switch(e.key) {
        case "R":
        case "r": toggleRecord(); break;
        case "l":
        case "L": lock(); break;
    }
});

onSuccess();