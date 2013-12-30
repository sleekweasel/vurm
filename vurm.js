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


NoteReader = function() {
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

noteReader = new NoteReader();

DurationReader = function() {
    this.convert = function(abc) {
        var d = /^((<+|>+|)|(\/?)([0-9]*))/.exec(abc);
        if (!d) {
            return null;
        }

        var chunk = { chars: d[0].length, dots: d[2] };

        if (!d[4]) {
            d[4] = d[3] ? "2" : "1";
        }
   
        chunk.reciprocal = d[3];
        chunk.num = d[4];
        
        return chunk;
    }
}

durationReader = new DurationReader();

ChunkReader = function() {
    this.convert = function(abc) {
        var chunk = { chars: 0, notes: [] };
            var p = noteReader.convert(abc);
            if (!p) {
                return null;
            }
        chunk.chars += p.chars;
            abc = abc.slice(p.chars);
            var d = durationReader.convert(abc);
            abc = abc.slice(d.chars);
        chunk.chars += d.chars;
            if (d.dots) {
                var p2 = noteReader.convert(abc);
                abc = abc.slice(p2.chars);
        chunk.chars += p2.chars;

                var dd = Math.pow(0.5, d.dots.length);
                
                var d1 = d.dots.match('>') ? 2-dd : dd;
                var d2 = d.dots.match('<') ? 2-dd : dd;

                //MIDI.noteOn(0, p.note, 127, time);

                //time += period * d1;
                
//document.getElementById('abc').innerHTML += "=" + p.note + "-" + time + " ";
        chunk.notes.push({ note: p.note, duration: d1 });

                //MIDI.noteOn(0, p2.note, 127, time);

                //time += period * d2;
//document.getElementById('abc').innerHTML += "=" + p2.note + "-" + time + " ";
        chunk.notes.push({ note: p2.note, duration: d2 });
            } else {
                //MIDI.noteOn(0, p.note, 127, time);
                var dn = d.num;
                if (d.reciprocal) {
                    dn = 1 / dn;
                }
                //time += period * dn;
//document.getElementById('abc').innerHTML += "=" + p.note + "-" + time + " ";
        chunk.notes.push({ note: p.note, duration: dn });
            }
        return chunk;
    }
}


AbcToVurm = function() {
    this.convert = function(abc) {
        var chunks = []
        var noteReader = new ChunkReader();
        while (abc.length > 0) {
            var p = noteReader.convert(abc);
            var old = abc;
            if (p) {
                abc = abc.slice(p.chars);
                for (var i = 0; i < p.notes.length; ++i ) {
                    var n = p.notes[i];
                    chunks.push({note: n.note, duration: 64*n.duration});
                }
            }
            if (old == abc) {
                chunks.push({parseFailAt: abc});
                abc = '';
            }
        }
        return chunks;
    }
}

function onceLoaded() {
    MIDI.programChange(0, 0);
    var abc=window.location.hash.slice(1);
    var old = abc;
    var time = 0;
    var period = 1;
    var noteReader = new ChunkReader();
    while (abc.length > 0) {
        var p = noteReader.convert(abc);
        if (p) {
            abc = abc.slice(p.chars);
            for (var i = 0; i < p.notes.length; ++i ) {
                var n = p.notes[i];
                MIDI.noteOn(0, n.note, 127, time);
                time += n.duration;
            }
        }
        if (old == abc) {
document.getElementById('abc').innerHTML += " Stopped at " + abc;
            break;
        }
        old = abc;
    }
}

