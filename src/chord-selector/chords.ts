import { Scale, Note } from "tonal";
import { CONFIG } from "./config";
import { randInt } from "../shared/midi";

function keyToNoteNameChords(root: string, scaleType: string): string[][] {
  const scale = Scale.get(`${root} ${scaleType}`);
  const notes = scale.notes;
  const chords: string[][] = [];
  for (let i = 0; i < notes.length; i++) {
    const chord = CONFIG.chord.extensions.map(
      (ext) => notes[(i + ext) % notes.length]
    );
    chords.push(chord);
  }
  return chords;
}

function noteNameToMidi(
  note: string,
  octaveMin: number,
  octaveMax: number
): number {
  const octave = randInt(octaveMin, octaveMax);
  const midi = Note.midi(`${note}${octave}`);
  return midi ?? 60;
}

function noteNameChordToMidi(noteNameChord: string[]): number[] {
  const midi: number[] = [];
  for (let i = 0; i < noteNameChord.length; i++) {
    const note = noteNameChord[i];
    if (i === 0) {
      midi.push(
        noteNameToMidi(note, CONFIG.bass.octave.min, CONFIG.bass.octave.max)
      );
    } else {
      midi.push(
        noteNameToMidi(note, CONFIG.chord.octave.min, CONFIG.chord.octave.max)
      );
    }
  }
  return midi.sort((a, b) => a - b);
}

export function keyToMidiChords(
  root: string,
  scaleType: string
): number[][] {
  const noteNameChords = keyToNoteNameChords(root, scaleType);
  return noteNameChords.map((chord) => noteNameChordToMidi(chord));
}
