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
        var r = /^((z)|([_=^]*)(([a-g])('*)|([A-G])(,*)))/.exec(abc);
        if (!r) {
            return null;
        }

        var note;
        if (!r[2]) {
            note="C D EF G A Bc d ef g a b".indexOf(r[5] ? r[5] : r[7]);
            if (r[6]) {
                note += r[6].length * 12;
            }
            if (r[8]) {
                note -= r[8].length * 12;
            }
            if (r[3] && r[3].length) {
                note += ("_=^".indexOf(r[3].charAt(0)) - 2) * r[3].length;
            }
            note += 60; // - MIDI.pianoKeyOffset;
        }

        return { chars: r[1].length, note: note };
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

            var dd = Math.pow(0.5, d.dots.length);
            var d1 = d.dots.match('>') ? 2-dd : dd;
            var d2 = d.dots.match('<') ? 2-dd : dd;

            chunk.notes.push({ note: p.note, duration: d1 });
            chunk.notes.push({ note: p2.note, duration: d2 });
        } else {
            chunk.notes.push({ note: p.note, duration: (1*d.numer) / (1*d.denom) });
        }
        return chunk;
    }
}

abcChunkReader = new AbcChunkReader();

AbcReader = function() {
    this.convert = function(abc) {
        var chunks = []
        while (abc.length > 0) {
            var p = abcChunkReader.convert(abc);
            var old = abc;
            if (p) {
                abc = abc.slice(p.chars);
                if (p.notes) {
                    for (var i = 0; i < p.notes.length; ++i ) {
                        var n = p.notes[i];
                        chunks.push({note: n.note, duration: n.duration});
                    }
                } else {
                    chunks.push(p);
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
        var t = 0;
        var s = vurm.stream;
        for (var i = 0; i < s.length; ++i) {
            n = s[i];
            notes.push({deltaTime: 0, type: "channel", subtype: 'noteOn', channel:1, noteNumber: n.note, velocity:127});
            t = n.duration * 64;
            notes.push({deltaTime: t, type: "channel", subtype: 'noteOff', channel:1, noteNumber: n.note, velocity:0});
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

