import Max from "max-api";
import type { NoteEvent, VoicingResult } from "../shared/types";
import { Note } from "tonal";
import { noteOn, noteOff, clampMidi, randPick, randInt } from "../shared/midi";
import { voiceLead, getSoloNote, getScaleForChord } from "./voicingEngine";
import { CONFIG } from "./config";
import { STATE } from "./state";

/**
 * Advance to the next chord in the chart and compute a voice-led voicing.
 * Returns the notes to play (including bass).
 */
export function advanceAndPlay(velocity: number): NoteEvent[] {
  if (!STATE.chart || STATE.chart.chords.length === 0) return [];

  // Advance
  STATE.chordIndex++;
  if (STATE.chordIndex >= STATE.chart.chords.length) {
    STATE.chordIndex = 0;
    STATE.formPassCount++;
  }

  const entry = STATE.chart.chords[STATE.chordIndex];
  const newVoicing = voiceLead(
    STATE.currentVoicing,
    entry.chord,
    STATE.formPassCount,
    STATE.chordIndex
  );
  STATE.currentVoicing = newVoicing;

  // Log actual MIDI notes to verify variety
  const bassName = Note.fromMidi(newVoicing.bass);
  const upperNames = newVoicing.upper.map((n) => Note.fromMidi(n)).join(" ");
  const msg = `${entry.chord}: ${bassName} | ${upperNames}`;
  Max.post(msg);
  console.log(msg);

  return voicingToNoteEvents(newVoicing, velocity);
}

/** Convert a VoicingResult to MIDI note events with velocity shaping */
export function voicingToNoteEvents(
  voicing: VoicingResult,
  velocity: number
): NoteEvent[] {
  const ch = CONFIG.outputChannel;
  const events: NoteEvent[] = [
    // Bass: full velocity
    noteOn(clampMidi(voicing.bass), velocity, ch),
  ];
  for (let i = 0; i < voicing.upper.length; i++) {
    // Top and bottom voices: full velocity
    // Inner voices: slightly softer (more natural piano touch)
    const isOuter = i === 0 || i === voicing.upper.length - 1;
    const v = isOuter ? velocity : Math.max(40, velocity - randInt(8, 20));
    events.push(noteOn(clampMidi(voicing.upper[i]), v, ch));
  }
  return events;
}

/** Get note-offs for all currently playing notes */
export function getNoteOffs(): NoteEvent[] {
  return STATE.playingNotes.map((n) => noteOff(n, CONFIG.outputChannel));
}

/** Play a solo note over the current chord */
export function playSoloNote(padIndex: number, velocity: number): NoteEvent[] {
  if (!STATE.chart || STATE.chart.chords.length === 0) return [];

  const chordIdx = Math.max(0, STATE.chordIndex);
  const entry = STATE.chart.chords[chordIdx];
  const scale = getScaleForChord(entry.chord);

  // Map pad index to a scale degree
  const degree = padIndex % scale.length;
  const pc = scale[degree];

  // Place in solo range with some randomness
  const octave = randInt(5, 6);
  const midi = clampMidi(pc + octave * 12);

  return [noteOn(midi, velocity, CONFIG.outputChannel)];
}

/**
 * Handle MIDI input. Returns notes to send.
 */
export function handleMidi(
  note: number,
  velocity: number,
  channel: number
): { noteOffs: NoteEvent[]; noteOns: NoteEvent[] } {
  const soloEnd = CONFIG.soloPadStart + CONFIG.soloPadCount;

  // Note-off: send offs for matching notes
  if (velocity === 0) {
    if (note === CONFIG.triggerNote) {
      // Release trigger — send note-offs for the chord
      return { noteOffs: getNoteOffs(), noteOns: [] };
    }
    if (note >= CONFIG.soloPadStart && note < soloEnd) {
      // Release solo pad — we don't track individual solo notes, just let them ring
      return { noteOffs: [], noteOns: [] };
    }
    return { noteOffs: [], noteOns: [] };
  }

  // Note-on: trigger chord or solo
  if (note === CONFIG.triggerNote) {
    const offs = getNoteOffs();
    const ons = advanceAndPlay(velocity);
    return { noteOffs: offs, noteOns: ons };
  }

  if (note >= CONFIG.soloPadStart && note < soloEnd) {
    const padIndex = note - CONFIG.soloPadStart;
    const ons = playSoloNote(padIndex, velocity);
    return { noteOffs: [], noteOns: ons };
  }

  // Other MIDI notes: pass through or ignore
  return { noteOffs: [], noteOns: [] };
}

/** Get the current chord name for display */
export function getCurrentChordName(): string {
  if (!STATE.chart || STATE.chordIndex < 0) return "—";
  const idx = Math.min(STATE.chordIndex, STATE.chart.chords.length - 1);
  return STATE.chart.chords[idx].chord;
}

/** Get progress info for display */
export function getProgressInfo(): string {
  if (!STATE.chart) return "No chart loaded";
  const idx = Math.max(0, STATE.chordIndex);
  return `${idx + 1}/${STATE.chart.chords.length} | Pass ${STATE.formPassCount + 1}`;
}
