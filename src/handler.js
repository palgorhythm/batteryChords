// MIDI note 0 -> play kick (play whole chord)
// MIDI note 1 -> play snare (random note from top 2 notes of chord)
// MIDI note 2 -> play tom (random note from 2nd & 3rd notes of chord - assumes 5 note chords)
// MIDI notes 3-127 -> regenerate chord in scale using midi note as root
// SPD patch change -> set scale ???? TODO

const { keyToMidiChords } = require("./chords");
const { CONFIG } = require("./config");
const { STATE } = require("./state");

const _getNotesFromState = ({ velocity, channel }) => {
  return [...STATE.chord.map((n) => ({ note: n, velocity, channel }))];
};

const _setChord = (chord) => {
  STATE.prevChord = STATE.chord;
  STATE.chord = chord;
};

const _setChordFromKeyAndNote = ({ key, note }) => {
  if (!key) {
    return;
  }
  const midiChords = keyToMidiChords({
    root: key.root,
    scaleType: key.scaleType,
  }); // should have length 7
  const noteInKey = note - key.noteRange[0];
  // console.log(
  //   `Setting ${noteInKey + 1} chord in the key of ${key.root} ${key.scaleType}.`
  // );
  // console.log(midiChords[noteInKey]);
  _setChord(midiChords[noteInKey]);
};

const _mute = () => {
  return Array.from({ length: 128 }).map((_, idx) => ({
    note: idx,
    velocity: 0,
    channel: 0,
  }));
};

const handle = ({ note, velocity, channel }) => {
  // console.log({ note, velocity, channel })
  if (velocity === 0) {
    return [
      ..._getNotesFromState({ velocity, channel }),
      ..._getNotesFromState({ velocity, channel }).map((n) => ({
        ...n,
        note: n.note + 12,
      })),
    ];
  }
  switch (note) {
    case CONFIG.kickMidiNote: {
      _setChordFromKeyAndNote({ key: STATE.key, note: STATE.note });
      const notes = _getNotesFromState({ velocity, channel });
      console.log({notes})
      return notes;
    }
    case CONFIG.snareMidiNote: {
      const notes = _getNotesFromState({ velocity, channel });
      if (!notes.length) {
        return [];
      }
      const randomIndex = 1 + Math.round(Math.random() * (notes.length - 2));
      const chosenNote = notes[randomIndex];
      return [{ ...chosenNote, note: chosenNote.note + 12 }];
    }
    case CONFIG.tomMidiNote: {
      const notes = _getNotesFromState({ velocity, channel });
      if (!notes.length) {
        return [];
      }
      const randomIndex = 1 + Math.round(Math.random() * (notes.length - 2));
      const chosenNote = notes[randomIndex];
      return [{ ...chosenNote, note: chosenNote.note + 24 }];
    }
    default: {
      const key = Object.values(CONFIG.keys).find(
        (key) => note >= key.noteRange[0] && note <= key.noteRange[1]
      );
      if (!key) {
        return _mute();
      }
      _setChordFromKeyAndNote({ key, note });
      STATE.key = key;
      STATE.note = note;
      return _mute();
    }
  }
};

module.exports = { handle };
