// This deals with playing awsedrfgyhujAWSEDRFGYHUJ.
//
// Converts to MIDI and plays it. Yay.

function QwerToMidi() {
    this.duration = function () {
        var len = 1;
        while (this.tune.length > this.ix) {
            ch = this.tune.charAt(this.ix);
            if (ch == '/') {
                len++;
            } else if (ch == '\\') {
                len/=2;
            } else {
                break;
            }
            ++this.ix;
        }
        return len;
    };

    this.convert = function (tune) {
        this.tune = tune;
        this.ix = 0;
        var beat = this.duration();
        var oct = 0;
        trax = [ [ /* meta */ ] ];
        voice = [];
        while (this.ix < this.tune.length) {
            var ch = this.tune.charAt(this.ix++);
            var semitones = "qasedrfgyhujikSEDRFGYHUJIKLP:".indexOf(ch);
            if (semitones >= 0) {
                var midi = semitones + oct * 12 + 60; // = MIDI.pianoKeyOffset;
                var t = this.duration() * beat * 64;
                voice.push({deltaTime: 0, type: "channel", subtype: 'noteOn', channel: trax.length, noteNumber: midi, velocity:127});
                voice.push({deltaTime: t, type: "channel", subtype: 'noteOff', channel: trax.length, noteNumber: midi, velocity:0});
            }
            else {
                var tpos = "-*+".indexOf(ch) - 1;
                if (tpos == 0) {
                    trax.push(voice);
                    voice = [];
                    oct = 0;
                }
                if (tpos >= -1) {
                    oct += tpos;
                }
            }
        }
        trax.push(voice);
        return {
            header: {
                formatType: 1,
                trackCount: trax.length,
                ticksPerBeat: 64 // per crotchet
            },
            tracks: trax
        };
    };
};


qwerToMidi = new QwerToMidi();

function onQwerChanged() {
    // Auto-play first tune.
    var tune = document.getElementById('tune').value;
    var midi = qwerToMidi.convert(tune);
    MIDI.Player.setMidiData(midi);
    MIDI.Player.resume();
}

function playImmediate(ch) {
    var midi = qwerToMidi.convert(ch);
    MIDI.Player.setMidiData(midi);
    MIDI.Player.resume();
    return midi.tracks[1].length > 0 || ("\\/*\n\r\b+-".indexOf(ch) >= 0) ;
}

function playAndOrValidateEvent(event) {
    var code = event.charCode;
    if (code == 0) {
        return true;
    }
    var ch = String.fromCharCode(code);
    return playImmediate(ch);
}

function keyboardClick(e) {
    var target = e.target || e.srcElement;
    var insert = playImmediate(target.innerHTML);
    if (insert) {
        var tune = document.getElementById('tune');
        var csr = tune.selectionStart;
        var old = tune.value;
        var next = tune.value.substr(0,csr) + target.innerHTML.substr(0,1) + tune.value.substr(csr, tune.value.length);
        tune.value = next;
        tune.textContent = tune.value;
        tune.selectionStart = csr+1;
        tune.selectionEnd = csr+1;
        putTuneInHash();
    }
}

function putTuneInHash() {
    var tune = document.getElementById("tune");
    var data = tune.value;
//    data = data.replace(/\\/g, "~");
//    data = data.replace(/\s/g, "_");
//    data = encodeURIComponent(data);
//    data = data.replace(/%2F/g, "/");
//    data = data.replace(/%5E/g, "_");
//    data = data.replace(/%2B/g, "+");
    data = LZString.compressToBase64(data);
    window.location.hash = "v1" + data;
}

function putHashInTune() {
    var data = window.location.hash.slice(1);
    
    if (data.lastIndexOf("v1", 0) >= 0) {
        data = LZString.decompressFromBase64(data.slice(2));
    }
    else {
        data = decodeURIComponent(data);
        data = data.replace(/~/g, "\\");
        data = data.replace(/_/g, "\n");
    }
    var tune = document.getElementById("tune");
    tune.value = data;
    tune.textContent = tune.value;
}

function onceLoaded() {
    MIDI.programChange(0, 0);
    putHashInTune();
    var tune = document.getElementById("tune");
    tune.disabled = false;
    onQwerChanged();
}

