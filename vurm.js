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

    document.getElementById('abc').innerHTML += r[0];

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
    var d = /^(([<>])|(\/?)([0-9]*))/.exec(abc);
    if (!d) {
        return null;
    }

    document.getElementById('abc').innerHTML += d[0];

    if (!d[4]) {
        d[4] = d[3] ? "2" : "1";
    }
    return d;
}

function onceLoaded() {
    MIDI.programChange(0, 0);
    var abc=window.location.hash.slice(1);
    var old = abc;
    var time = 0;
    var period = 1;
    while (abc.length > 0) {
        var p = note(abc);
        if (p) {
            abc = abc.slice(p[0].length);
            var dur = duration(abc);
            abc = abc.slice(dur[0].length);
            if (dur[2]) {
                var p2 = note(abc);
                abc = abc.slice(p2[0].length);
                
                var d1 = (dur[2] == '>') ? 1 : 3;
                var d2 = (dur[2] == '<') ? 1 : 3;

                MIDI.noteOn(0, p.note, 127, time);

                var per = period / 2;
                time += per * d1;
                
document.getElementById('abc').innerHTML += "=" + p.note + "-" + time + " ";

                MIDI.noteOn(0, p2.note, 127, time);

                time += per * d2;
document.getElementById('abc').innerHTML += "=" + p2.note + "-" + time + " ";
            } else {
                MIDI.noteOn(0, p.note, 127, time);
                if (dur[3]) {
                    time += period / dur[4];
                } else {
                    time += period * dur[4];
                }
document.getElementById('abc').innerHTML += "=" + p.note + "-" + time + " ";
            }
        }
        if (old == abc) {
            break;
        }
    }		
}

