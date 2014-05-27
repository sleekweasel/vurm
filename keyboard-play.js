// This deals with playing awsedrfgyhujAWSEDRFGYHUJ.
//
// Converts to MIDI and plays it. Yay.

function QwerToMidi() {
    this.duration = function () {
        var len = 1;
        var next = 1;
        while (this.tune.length > this.ix) {
            ch = this.tune.charAt(this.ix);
            if (ch == '/') {
                len++;
            } else if (ch == '\\') {
                len/=2;
            } else if (ch == '>') {
                next/=2;
                len=2-next;
            } else if (ch == '<') {
                len/=2;
                next=2-len;
            } else {
                break;
            }
            ++this.ix;
        }
        return {len:len, next:next};
    };

    this.eatInt = function () {
        var chan = "";
        while ("1234567890".indexOf(this.tune.charAt(this.ix)) >= 0) {
            chan += this.tune.charAt(this.ix);
            ++this.ix;
        }
        return parseInt(chan);
    }

    this.convert = function (tune) {
        this.tune = tune;
        this.ix = 0;
    //var debug = document.getElementById('debug');
        var trax = [ [ /* meta = ch 0 */ ] ];
        var duration = this.duration();
        var beat = duration.len;
        var oct = 0;
        var next = 1;
        var voice = [];
        trax.push(voice);
        voice.chan = trax.length;
        while (this.ix < this.tune.length) {
            var ch = this.tune.charAt(this.ix++);
            var semitones = "qasedrfgyhujikSEDRFGYHUJIKLP:".indexOf(ch);
            if (semitones >= 0) {
                var midi = semitones + oct * 12 + 60; // = MIDI.pianoKeyOffset;
                var duration = this.duration();
                var t = duration.len * next * beat * 64;
                next = duration.next;
                voice.push({deltaTime: 0, type: "channel", subtype: 'noteOn', channel: voice.chan, noteNumber: midi, velocity:127});
                voice.push({deltaTime: t, type: "channel", subtype: 'noteOff', channel: voice.chan, noteNumber: midi, velocity:0});
            }
            else {
                var tpos = "-*+".indexOf(ch) - 1;
                if (tpos == 0) {
                    voice.oct = oct;
                    voice.next = next;
                    var chan = this.eatInt();
                    if (isFinite(chan) && trax[chan]) {
                        voice = trax[chan];
                        oct = voice.oct;
                        next = voice.next;
                    } else {
                        oct = 0;
                        next = 1;
                        voice = [];
                        trax.push(voice);
                        voice.chan = trax.length;
                    }
                }
                if (tpos >= -1) {
                    oct += tpos;
                }
            }
        }
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
    return midi.tracks[1].length > 0;
}

function validateSpecial(ch, ta) {
    var digit = "1234567890".indexOf(ch);
    if (digit >= 0) {
        // Only allow digits immediately after *
        return (/\*[0-9]*$/.test(ta.value.substr(0,ta.selectionStart)));
    }
    return  ("\\/<>*\n\r\b+- ".indexOf(ch) >= 0);
}

// Fancy textarea editing.
function playAndOrValidateEvent(event) {
    var code = event.charCode;
    if (code == 0) {
        return true;
    }
    var ch = String.fromCharCode(code);
    return validateSpecial(ch, event.target || event.srcElement) || playImmediate(ch);
}

// on-screen piano keyboard handling.
function pianoClick(e) {
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

