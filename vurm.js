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


function AbcPitchTokeniser () {
    this.convert = function(abc) {
    // Reads a single element of pitch
        var r = /^(([zxZ])|([_=^]*)([a-gA-G])([',]*))/.exec(abc);
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

abcPitchTokeniser = new AbcPitchTokeniser();

function AbcDurationTokeniser() {
    this.convert = function(abc) {
    // Reads a single element of duration (for after some pitch)
        var d = /^(([0-9]*)(\/+([0-9]*))?(<+|>+)?`*)/.exec(abc);
        if (!d) {
            return null;
        }

        var chunk = { chars: d[1].length, numer: d[2], denom: d[4], dots: d[5] };
        var halves = d[3];

        if (chunk.denom == undefined) { chunk.denom = 1; }
        if (chunk.denom == '') {
            chunk.denom = Math.pow(2, halves.length);
        }
        if (chunk.numer == '') { chunk.numer = 1; }

        return chunk;
    }
}

abcDurationTokeniser = new AbcDurationTokeniser();

function AbcPunctuationTokeniser() {
    this.convert = function(abc) {
    // Pre, inter, and post punctuation.
        var d = /^((\()|(\))|(\|)|( +))/.exec(abc);
        if (!d) {
            return null;
        }

        var chunk = {
            chars:      d[1].length,
            tieStart:   d[2],
            tieEnd:     d[3],
            bar:        d[4],
            space:      d[5]
        };
        for (var key in chunk) {
            if (!chunk[key]) {
                delete chunk[key];
            }
        }

        return chunk;
    }
}

abcPunctuationTokeniser = new AbcPunctuationTokeniser();

function AbcChunkReader() {
    this.convert = function(abc) {
    // Read a smallest complete chunk into notes, like a>b.
    // Later, handle recursive [abc]->[abc] and similar.
        var p = abcPitchTokeniser.convert(abc);
        if (!p) {
            return abcPunctuationTokeniser.convert(abc);
        }
        var chunk = { chars: p.chars, notes: [] };
        abc = abc.slice(p.chars);
        delete p.chars;
        var d = abcDurationTokeniser.convert(abc);
        if (!d) {
            return null;
        }
        abc = abc.slice(d.chars);
        chunk.chars += d.chars;
        p.duration = (1*d.numer) / (1*d.denom);
        if (d.dots) {
            var p2 = abcPitchTokeniser.convert(abc);
            if (!p2) {
                return null;
            }
            abc = abc.slice(p2.chars);
            chunk.chars += p2.chars;
            delete p2.chars;

            var d2  = abcDurationTokeniser.convert(abc);
            if (!d2) {
                return null;
            }
            abc = abc.slice(d2.chars);
            chunk.chars += d2.chars;
            p2.duration = (1*d2.numer) / (1*d2.denom);
            if (p2.dots) {
                // Not going to handle a>b>c: unequal lengths are not advised anyway.
                // Mmmaybe have a>b>c mean 'carry the dot' for a3/2 b c/2.
                return null;
            }

            var dd = Math.pow(0.5, d.dots.length);
            p.duration *= d.dots.match('>') ? 2-dd : dd;
            p2.duration *= d.dots.match('<') ? 2-dd : dd;

            chunk.notes.push(p, p2);
        } else {
            chunk.notes.push(p);
        }
        return chunk;
    }
}

abcChunkReader = new AbcChunkReader();

function LineSource(abc) {
    // Strips %% commands and post \ comments and trailing spaces.
    this.lines = abc.split("\n");
    this.line = 0;
    for (var n = this.lines.length - 1; n >= 0; --n) {
        var r = /^\s*((%%)?(([^\\%]|\\.)*?)(\s*?(\\))?)(\s*?(%.*)?)$/.exec(this.lines[n]);
        this.lines[n] = (r[7] && !r[1]) ? '%' : r[1];
    }
    this.state = function() {
    // Show the parsing status
        var see = this.see();
        return "[:"
            + this.lines.slice(0, this.line).join("><")
            + '-' + this.line + "=" + see + '-'
            + this.lines.slice(this.line).join("><")
            + ":]";
    };
    this.skipDels = function() {
    // Skip any lines marked 'deleted'.
        while ( this.lines.length > this.line && this.lines[this.line] == '%') {
            ++this.line;
        };
    };
    this.see = function() {
    // Look at the current line
        this.skipDels();
        return this.lines[this.line];
    };
    this.take = function() {
    // Move on from the current line
        this.skipDels();
        var line = this.lines[this.line ++];
        return line;
    }
}

function HeaderLineParser(lineSource) {
// Cope with header lines having %% preprocessor comments
    this.source = lineSource;
    this.preparse = function (line) {
    // Turn '%% preprocessor' directives into the I: form.
        var prep = /^%%\s*(.*?)\s*$/.exec(line);
        if (prep) {
            return { head: [ 'I', prep[1] ] };
        }
    };
    this.matchHeaderLine = function (line) {
    // Recognise X: lkajlsjfasdf header lines
        return /^(\w|\+):\s*(.*?)\s*(%.*)?$/.exec(line);
    };
    this.parse = function() {
        var line = this.source.see();
        var p = this.preparse(line);
        if (p) { return p; }
        var r = this.matchHeaderLine(line);
        if (r) {
            var headData = [ r[1], r[2] ];
            this.source.take();
            do {
                line = this.source.see();
                p = this.preparse(line);
                if (p) {
                    headData.push(p);
                    this.source.take();
                }
                r = this.matchHeaderLine(line);
                if (r) {
                    if (r[1] == '+') {
                        headData.push(' ' + r[2]);
                        this.source.take();
                    }
                    else {
                        r = undefined;
                    }
                }
            } while (p || r);
            return { head: headData };
        }
        return null;
    }
}

// Returns [ { head: [ 'x', 'values', 'of', 'the', 'header' ] }, ... ]
function HeaderBlockParser(lineSource) {
    this.lineSource = lineSource;
    this.source = new HeaderLineParser(lineSource);
    this.parse = function() {
        var header = this.source.parse();
        if (!header) { return header; }
        var heads = [];
        do {
            heads.push(header);
            var backup = this.lineSource.line;
            header = this.source.parse();
            if (header) {
                if (header.head[0] == 'X') {
                    header = '';
                    this.lineSource.line = backup;
                }
                else if (header.head[0] == 'K') {
                    heads.push(header);
                    header = '';
                }
            }
        } while (header);
        return heads;
    }
}

function TuneLineParser(lineSource) {
// Returns a free header line, or a tune line with embedded headers
    this.source = lineSource;
    this.parse = function() {
        tuneLine = [];
        headerLineParser = new HeaderLineParser(lineSource);
        lineHeader = headerLineParser.parse();
        if (lineHeader != null) {
            return [ lineHeader ];
        }
        abcChunkReader = new AbcChunkReader();
        var line = lineSource.see();
        do {
            var chunk = abcChunkReader.convert(line);
            if (chunk != null) {
                tuneLine.push(chunk.notes);
                line = line.slice(chunk.chars);
            }
            else {
                if (line == '\\') {
                    lineSource.take();
                    do {
                        lineHeader = headerLineParser.parse();
                        if (lineHeader != null) {
                            tuneLine.push(lineHeader);
                        }
                    }
                    while (lineHeader != null)
                    line = lineSource.see();
                }
                else {
                    tuneLine.push({error: line});
                }
            }
        } while (line.length > 0);
        lineSource.take();
        return tuneLine;
    }
}

function AbcReader() {
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
        return { parts: { "": { "":  chunks } } };
    }
}

abcReader = new AbcReader();

function VurmToMidi() {
    this.convert = function (tune, vurm) {
        voice = [];
        var s = tune.parts[""][""];
        for (var i = 0; i < s.length; ++i) {
            n = s[i];
            if ('ledger' in n) {
                var ledger = n.ledger;
                var letter = (ledger % 7 + 7 ) % 7;
                var octave = (ledger - letter)/7;
                // c-d-ef-g-a-bc
                // 0=0 1=2 2=4 3=5 4=7 5=9 6=11
                var semitones = letter*2 - (letter > 2) + ( n.sharps ? n.sharps : 0);
                // semitones += key(letter);
                // FCGDAEB - 3 0 4 1 5 2 6 'Fat Charlie Got Don An Elephant Barnacle' :)
                var midi = semitones + octave*12 + 60; // = MIDI.pianoKeyOffset;
                voice.push({deltaTime: 0, type: "channel", subtype: 'noteOn', channel:1, noteNumber: midi, velocity:127});
                var t = n.duration * 64;
                voice.push({deltaTime: t, type: "channel", subtype: 'noteOff', channel:1, noteNumber: midi, velocity:0});
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
    }
}

vurmToMidi = new VurmToMidi();

function onAbcChanged() {
    // Auto-play first tune.
    var abc = document.getElementById('abc').value;
    var vurm = abcReader.convert(abc);
    var firstTune = vurm.parts[""][""];
    var midi = vurmToMidi.convert(vurm, firstTune);
    MIDI.Player.setMidiData(midi);
    MIDI.Player.resume();
}

function onceLoaded() {
    MIDI.programChange(0, 0);
    document.getElementById('abc').textContent = window.location.hash.slice(1);
    onAbcChanged();
}

