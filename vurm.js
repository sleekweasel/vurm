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

function note(abc) {
    var r = /^((z)|([_=^]*)(([a-g])('*)|([A-G])(,*)))/.exec(abc);
    if (!r) {
        return null;
    }

 //   document.getElementById('abc').innerHTML += r[0];

    if (!r[2]) {
        r.note="C D EF G A Bc d ef g a b".indexOf(r[5] ? r[5] : r[7]);
        if (r[6]) {
            r.note += r[6].length * 12;
        }
        if (r[8]) {
            r.note -= r[8].length * 12;
        }
        if (r[3] && r[3].length) {
            r.note += ("_=^".indexOf(r[3].charAt(0)) - 2) * r[3].length;
        }
        r.note += 60; // - MIDI.pianoKeyOffset;
    }
    return r;
}

function duration(abc) {
    var d = /^((<+|>+|)|(\/?)([0-9]*))/.exec(abc);
    if (!d) {
        return null;
    }

//    document.getElementById('abc').innerHTML += d[0];

    if (!d[4]) {
        d[4] = d[3] ? "2" : "1";
    }
    return d;
}

AbcToVurm = function() {
    this.convert = function() { return {} }
}

NoteReader = function() {
    this.convert = function() {
        return {}
    }
}

ChunkReader = function() {
    this.convert = function(abc) {
        chunk = { chars: 0, notes: [] };
            var p = note(abc);
        chunk.chars += p[0].length;
            abc = abc.slice(p[0].length);
            var dur = duration(abc);
            abc = abc.slice(dur[0].length);
        chunk.chars += dur[0].length;
            if (dur[2]) {
                var p2 = note(abc);
                abc = abc.slice(p2[0].length);
        chunk.chars += p2[0].length;

                var dd = Math.pow(0.5, dur[2].length);
                
                var d1 = dur[2].match('>') ? 2-dd : dd;
                var d2 = dur[2].match('<') ? 2-dd : dd;

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
                var dn = dur[4];
                if (dur[3]) {
                    dn = 1 / dn;
                }
                //time += period * dn;
//document.getElementById('abc').innerHTML += "=" + p.note + "-" + time + " ";
        chunk.notes.push({ note: p.note, duration: dn });
            }
        return chunk;
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
    }
}

