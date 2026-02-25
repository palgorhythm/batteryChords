import type { NoteEvent } from "../shared/types";
import { allNotesOff } from "../shared/midi";
import { keyToMidiChords } from "./chords";
import { CONFIG } from "./config";
import { STATE } from "./state";

function getNotesFromState(velocity: number, channel: number): NoteEvent[] {
  return STATE.chord.map((n) => ({ note: n, velocity, channel }));
}

function setChord(chord: number[]): void {
  STATE.prevChord = STATE.chord;
  STATE.chord = chord;
}

function setChordFromKeyAndNote(): void {
  const { key, note } = STATE;
  if (!key) return;

  const midiChords = keyToMidiChords(key.root, key.scaleType);
  const noteInKey = note - key.noteRange[0];
  if (noteInKey < 0 || noteInKey >= midiChords.length) return;

  setChord(midiChords[noteInKey]);
}

function pickRandomUpperNote(
  notes: NoteEvent[],
  octaveShift: number
): NoteEvent[] {
  if (notes.length < 2) {
    return notes.length === 1
      ? [{ ...notes[0], note: notes[0].note + octaveShift }]
      : [];
  }
  const idx = 1 + Math.floor(Math.random() * (notes.length - 1));
  const chosen = notes[idx];
  return [{ ...chosen, note: chosen.note + octaveShift }];
}

export function handle(
  note: number,
  velocity: number,
  channel: number
): NoteEvent[] {
  // Note-off: silence current chord at all octave shifts
  if (velocity === 0) {
    return [
      ...getNotesFromState(0, channel),
      ...getNotesFromState(0, channel).map((n) => ({
        ...n,
        note: n.note + 12,
      })),
      ...getNotesFromState(0, channel).map((n) => ({
        ...n,
        note: n.note + 24,
      })),
    ];
  }

  switch (note) {
    case CONFIG.kickMidiNote: {
      setChordFromKeyAndNote();
      return getNotesFromState(velocity, channel);
    }
    case CONFIG.snareMidiNote: {
      const notes = getNotesFromState(velocity, channel);
      return pickRandomUpperNote(notes, 12);
    }
    case CONFIG.tomMidiNote: {
      const notes = getNotesFromState(velocity, channel);
      return pickRandomUpperNote(notes, 24);
    }
    default: {
      const key = Object.values(CONFIG.keys).find(
        (k) => note >= k.noteRange[0] && note <= k.noteRange[1]
      );
      if (!key) return allNotesOff();
      setChordFromKeyAndNote();
      STATE.key = key;
      STATE.note = note;
      return allNotesOff();
    }
  }
}
