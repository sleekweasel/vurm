// This dis/plays the music in the window.location.hash, in abc format.
//
// Display doesn't care (much) about note count / bar, but might display warning wiggly lines.
//
// Interpret abc to:
//   note = iterator.next(root) : iterator is either display or play - repeat sections.
//      - pitch, basic C..GAB
//      - accidentals +/- n
//      - duration (p/q)
//      - tied to next note
//   bar = group of notes
//      - repeat group (2 times default, specified, or deduced from nth repeat bars)
//      - bar, perhaps for nth repeat
//
// But... some things straddle bars. Maybe bars are ephemeral?
//      - tuple of notes
//      - start of slur/group (to bar/repeat)
//      - end of slur/group (from bar/repeat)
//      - meta [ K|M|G|L|Q|T|X ]


AbcNoteReader = function() {
    this.convert = function(abc) {
        var r = /^((z)|([_=^]*)([a-gA-G])([',]*))/.exec(abc);
        if (!r) {
            return null;
        }

        var note = { chars: r[1].length };
        if (!r[2]) {
            var accidence = r[3];
            if (accidence) {
                var l = accidence.length;
                note.sharps = ("_=^".indexOf(accidence.charAt(0)) - 1) * l;
            }
            var step = r[5];
            var octave = 0;
            if (step) {
                var l = step.length;
                for (var i = 0; i < l ; ++i) {
                    octave += step.charAt(i) == "'" ? 7 : -7;
                }
            }
            note.ledger = octave + "CDEFGABcdefgab".indexOf(r[4]);
        }

        return note;
    }
}

abcNoteReader = new AbcNoteReader();

AbcDurationReader = function() {
    this.convert = function(abc) {
        var d = /^((<+|>+)|([0-9]*)(\/([0-9]*))?)/.exec(abc);
        if (!d) {
            return null;
        }

        var chunk = { chars: d[1].length, dots: d[2], numer: d[3], denom: d[5] };

        if (!chunk.dots) {
            if (chunk.denom == undefined) { chunk.denom = 1; }
            if (chunk.denom == '') { chunk.denom = 2; }
            if (chunk.numer == '') { chunk.numer = 1; }
        }

        return chunk;
    }
}

abcDurationReader = new AbcDurationReader();

AbcPunctuationReader = function() {
    this.convert = function(abc) {
        var d = /^((\()|(\))|(\|)|( +))/.exec(abc);
        if (!d) {
            return null;
        }

        var chunk = { chars: d[1].length, tieStart: d[2], tieEnd: d[3], bar: d[4], space: d[5] };

        return chunk;
    }
}

abcPunctuationReader = new AbcPunctuationReader();

AbcChunkReader = function() {
    this.convert = function(abc) {
        var p = abcNoteReader.convert(abc);
        if (!p) {
            return abcPunctuationReader.convert(abc);
        }
        var chunk = { chars: p.chars, notes: [] };
        abc = abc.slice(p.chars);
        delete p.chars;
        var d = abcDurationReader.convert(abc);
        if (!d) {
            return null;
        }
        abc = abc.slice(d.chars);
        chunk.chars += d.chars;
        if (d.dots) {
            var p2 = abcNoteReader.convert(abc);
            if (!p2) {
                return null;
            }
            abc = abc.slice(p2.chars);
            chunk.chars += p2.chars;
            delete p2.chars;

            var dd = Math.pow(0.5, d.dots.length);
            p.duration = d.dots.match('>') ? 2-dd : dd;
            p2.duration = d.dots.match('<') ? 2-dd : dd;

            chunk.notes.push(p, p2);
        } else {
            p.duration = (1*d.numer) / (1*d.denom);
            chunk.notes.push(p);
        }
        return chunk;
    }
}

abcChunkReader = new AbcChunkReader();

AbcReader = function() {
    this.convert = function(abc) {
        var chunks = []
        while (abc.length > 0) {
            var chunk = abcChunkReader.convert(abc);
            var old = abc;
            if (chunk) {
                abc = abc.slice(chunk.chars);
                if (chunk.notes) {
                    for (var i = 0; i < chunk.notes.length; ++i ) {
                        var n = chunk.notes[i];
                        chunks.push(n);
                    }
                } else {
                    chunks.push(chunk);
                }
            }
            if (old == abc) {
                chunks.push({parseFailAt: abc});
                abc = '';
            }
        }
        return { stream: chunks };
    }
}

abcReader = new AbcReader();

VurmToMidi = function() {
    this.convert = function (vurm) {
        notes = [];
        var s = vurm.stream;
        for (var i = 0; i < s.length; ++i) {
            n = s[i];
            if ('ledger' in n) {
                var ledger = n.ledger;
                var letter = (ledger % 7 + 7 ) % 7;
                var octave = (ledger - letter)/7;
                // c-d-ef-g-a-bc
                // 0=0 1=2 2=4 3=5 4=7 5=9 6=11
                var semitones = letter*2 - Math.floor((letter+4)/7) - Math.floor(letter/7);
                // semitones += key(letter);
                var midi = semitones + octave*12 + 60; // = MIDI.pianoKeyOffset;
                notes.push({deltaTime: 0, type: "channel", subtype: 'noteOn', channel:1, noteNumber: midi, velocity:127});
                var t = n.duration * 64;
                notes.push({deltaTime: t, type: "channel", subtype: 'noteOff', channel:1, noteNumber: midi, velocity:0});
            }
        }
        return {
            header: {
                formatType: 1,
                trackCount: 2,
                ticksPerBeat: 64 // per crotchet
            },
            tracks: [
                [
                    // Meta: title, key, etc.
                ],
                notes
            ]
        };
    }
}

vurmToMidi = new VurmToMidi();

function onAbcChanged() {
    var abc = document.getElementById('abc').value;
    var vurm = abcReader.convert(abc);
    var midi = vurmToMidi.convert(vurm);
    MIDI.Player.setMidiData(midi);
    MIDI.Player.resume();
}

function onceLoaded() {
    MIDI.programChange(0, 0);
    document.getElementById('abc').textContent = window.location.hash.slice(1);
    onAbcChanged();
}

