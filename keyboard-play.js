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
        voice = [];
        while (this.ix < this.tune.length) {
            var semitones = "qasedrfgyhujikSEDRFGYHUJIKLP:".indexOf(this.tune.charAt(this.ix));
            ++this.ix;
            if (semitones >= 0) {
                var midi = semitones + 60; // = MIDI.pianoKeyOffset;
                var t = this.duration() * beat * 64;
                voice.push({deltaTime: 0, type: "channel", subtype: 'noteOn', channel:1, noteNumber: midi, velocity:127});
                voice.push({deltaTime: t, type: "channel", subtype: 'noteOff', channel:1, noteNumber: midi, velocity:0});
            }
            else {
                // Silently ignore rubbish for now.
            }
        }
        return {
            header: {
                formatType: 1,
                trackCount: 2,
                ticksPerBeat: 64 // per crotchet
            },
            tracks: [ // One per voice.
                [
                    // Meta: title, key, etc.
                ],
                voice
            ]
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
    return midi.tracks[1].length > 0 || ("\\/\n\r\b".indexOf(ch) >= 0) ;
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
        tune.selectionStart = csr+1;
        tune.selectionEnd = csr+1;
        window.location.hash=tune.value;
    }
}

function onceLoaded() {
    MIDI.programChange(0, 0);
    hash = decodeURIComponent(window.location.hash.slice(1));
    document.getElementById('tune').textContent = hash;
    onQwerChanged();
}

