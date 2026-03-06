import Max from "max-api";
import type { NoteEvent, VoicingResult, Section } from "../shared/types";
import { Note } from "tonal";
import { noteOn, noteOff, clampMidi, randPick, randInt, weightedPick } from "../shared/midi";
import { voiceLead, getScaleForChord } from "./voicingEngine";
import { CONFIG } from "./config";
import { STATE } from "./state";

// ─── Section helpers ──────────────────────────────────────────

/** Get the current section based on formIndex */
function getCurrentSection(): Section | null {
  if (!STATE.chart) return null;
  const form = STATE.chart.metadata.form;
  if (!form || form.length === 0) return null;

  const sectionName = form[STATE.formIndex];
  return STATE.chart.sections.find((s) => s.name === sectionName) ?? null;
}

/** Get the current chord entry based on section + chordIndex */
function getCurrentChordEntry(): { chord: string; durationBeats: number } | null {
  const section = getCurrentSection();
  if (!section || STATE.chordIndex < 0 || STATE.chordIndex >= section.chords.length) {
    return null;
  }
  return section.chords[STATE.chordIndex];
}

// ─── Advance logic ────────────────────────────────────────────

/**
 * Advance to the next chord in the current section.
 * Loops the current section when it reaches the end.
 * Returns the notes to play.
 */
export function advanceAndPlay(velocity: number): NoteEvent[] {
  if (!STATE.chart) return [];
  const form = STATE.chart.metadata.form;
  if (!form || form.length === 0) return [];

  const section = getCurrentSection();
  if (!section) return [];

  // Advance chord, loop within the current section
  STATE.chordIndex++;
  if (STATE.chordIndex >= section.chords.length) {
    STATE.chordIndex = 0;
  }

  const entry = getCurrentChordEntry();
  if (!entry) return [];

  const newVoicing = voiceLead(STATE.currentVoicing, entry.chord);
  STATE.currentVoicing = newVoicing;

  // Snap lastSoloNote to nearest note in the new chord's scale
  // so soloing flows smoothly across chord changes
  if (STATE.lastSoloNote != null) {
    const newScale = getScaleForChord(entry.chord);
    const soloNotes: number[] = [];
    for (const pc of newScale) {
      for (let oct = 5; oct <= 7; oct++) {
        const m = pc + oct * 12;
        if (m >= 72 && m <= 96) soloNotes.push(m);
      }
    }
    if (soloNotes.length > 0) {
      let closest = soloNotes[0];
      let closestDist = Math.abs(soloNotes[0] - STATE.lastSoloNote);
      for (const n of soloNotes) {
        const d = Math.abs(n - STATE.lastSoloNote);
        if (d < closestDist) { closest = n; closestDist = d; }
      }
      STATE.lastSoloNote = closest;
    }
  }

  // Log
  const bassName = Note.fromMidi(newVoicing.bass);
  const upperNames = newVoicing.upper.map((n) => Note.fromMidi(n)).join(" ");
  Max.post(`${entry.chord}: ${bassName} | ${upperNames}`);
  console.log(`${entry.chord}: ${bassName} | ${upperNames}`);

  return voicingToNoteEvents(newVoicing, velocity);
}

/**
 * Advance to the next section in the form.
 * Resets chordIndex to 0 (ready to play first chord).
 */
function advanceSection(): void {
  if (!STATE.chart) return;
  const form = STATE.chart.metadata.form;
  if (!form || form.length === 0) return;

  STATE.formIndex++;
  STATE.chordIndex = 0;

  if (STATE.formIndex >= form.length) {
    STATE.formIndex = 0;
    STATE.formPassCount++;
  }

  const section = getCurrentSection();
  if (section) {
    Max.post(`── Section: ${section.name} ──`);
    console.log(`── Section: ${section.name} ──`);
  }
}

/**
 * Jump to the next section (triggered by section advance MIDI note).
 * Sends note-offs, moves to the next section, plays the first chord.
 */
export function advanceSectionAndPlay(velocity: number): NoteEvent[] {
  if (!STATE.chart) return [];
  const form = STATE.chart.metadata.form;
  if (!form || form.length === 0) return [];

  advanceSection();

  const entry = getCurrentChordEntry();
  if (!entry) return [];

  const newVoicing = voiceLead(STATE.currentVoicing, entry.chord);
  STATE.currentVoicing = newVoicing;

  const bassName = Note.fromMidi(newVoicing.bass);
  const upperNames = newVoicing.upper.map((n) => Note.fromMidi(n)).join(" ");
  Max.post(`${entry.chord}: ${bassName} | ${upperNames}`);
  console.log(`${entry.chord}: ${bassName} | ${upperNames}`);

  return voicingToNoteEvents(newVoicing, velocity);
}

// ─── MIDI output helpers ──────────────────────────────────────

/** Convert a VoicingResult to MIDI note events with velocity shaping */
export function voicingToNoteEvents(
  voicing: VoicingResult,
  velocity: number
): NoteEvent[] {
  const ch = CONFIG.outputChannel;
  const events: NoteEvent[] = [
    // Bass: boosted velocity so it cuts through
    noteOn(clampMidi(voicing.bass), Math.min(127, velocity + 20), ch),
  ];
  for (let i = 0; i < voicing.upper.length; i++) {
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

// ─── Solo notes ───────────────────────────────────────────────

/** Play a solo note — melodic, with directional momentum.
 *  Melodies go up for a few notes then come back down (or vice versa).
 *  Mostly stepwise, occasional skips, rare leaps. */
export function playSoloNote(velocity: number): NoteEvent[] {
  const entry = getCurrentChordEntry();
  if (!entry) return [];

  const scalePcs = getScaleForChord(entry.chord);

  // Build all scale notes in solo range (C5–C7, MIDI 72–96)
  const candidates: number[] = [];
  for (const pc of scalePcs) {
    for (let oct = 5; oct <= 7; oct++) {
      const midi = pc + oct * 12;
      if (midi >= 72 && midi <= 96) candidates.push(midi);
    }
  }
  if (candidates.length === 0) return [];
  candidates.sort((a, b) => a - b);

  // First solo note: middle of range
  if (STATE.lastSoloNote == null) {
    const mid = candidates[Math.floor(candidates.length / 2)];
    const nearby = candidates.filter((n) => Math.abs(n - mid) <= 5);
    const chosen = randPick(nearby.length > 0 ? nearby : candidates);
    STATE.lastSoloNote = chosen;
    STATE.soloDirection = Math.random() < 0.5 ? 1 : -1;
    STATE.soloDirectionRun = 0;
    return [noteOn(chosen, velocity, CONFIG.outputChannel)];
  }

  // Maybe reverse direction — more likely the longer we've been going one way
  // After 2-4 notes, increasingly likely to turn around
  const reverseChance = Math.min(0.7, STATE.soloDirectionRun * 0.15);
  if (Math.random() < reverseChance) {
    STATE.soloDirection *= -1;
    STATE.soloDirectionRun = 0;
  }

  const dir = STATE.soloDirection;
  const last = STATE.lastSoloNote;

  // Weight: favor notes in the current direction, close to last note
  const weights = candidates.map((n) => {
    const dist = Math.abs(n - last);
    const sameDir = dir > 0 ? n > last : n < last;
    const isRepeat = n === last;

    if (isRepeat) return 0.3;          // avoid repeating same note

    // Base weight by distance (stepwise = heavy, leaps = light)
    let w: number;
    if (dist <= 2) w = 10;             // step
    else if (dist <= 4) w = 5;         // small skip
    else if (dist <= 7) w = 1.5;       // larger skip
    else w = 0.2;                      // leap

    // Directional bonus: notes in the current direction get 3x
    if (sameDir) w *= 3;

    return w;
  });

  const chosen = weightedPick(candidates, weights);

  // Update direction tracking
  if (chosen !== last) {
    const newDir = chosen > last ? 1 : -1;
    if (newDir === STATE.soloDirection) {
      STATE.soloDirectionRun++;
    } else {
      STATE.soloDirection = newDir;
      STATE.soloDirectionRun = 1;
    }
  }

  STATE.lastSoloNote = chosen;
  return [noteOn(chosen, velocity, CONFIG.outputChannel)];
}

// ─── MIDI input routing ───────────────────────────────────────

let lastTriggerTime = 0;
const TRIGGER_DEBOUNCE_MS = 100;

/**
 * Handle MIDI input:
 * - triggerNote (36) = advance chord within section (debounced)
 * - sectionAdvanceNote (39) = jump to next section
 * - any other note = solo
 */
export function handleMidi(
  note: number,
  velocity: number
): { noteOffs: NoteEvent[]; noteOns: NoteEvent[] } {
  // Note-offs
  if (velocity === 0) {
    if (note === CONFIG.triggerNote || note === CONFIG.sectionAdvanceNote) {
      return { noteOffs: getNoteOffs(), noteOns: [] };
    }
    // Solo note-offs: ignore — the next solo note-on silences the previous one.
    // This prevents cross-zone note-offs (SP sends multiple zones per hit)
    // from killing solo notes prematurely.
    if (CONFIG.soloNotes.includes(note)) {
      return { noteOffs: [], noteOns: [] };
    }
    return { noteOffs: [], noteOns: [] };
  }

  // Chord trigger (kick)
  if (note === CONFIG.triggerNote) {
    const now = Date.now();
    if (now - lastTriggerTime < TRIGGER_DEBOUNCE_MS) {
      return { noteOffs: [], noteOns: [] };
    }
    lastTriggerTime = now;
    const offs = getNoteOffs();
    const ons = advanceAndPlay(velocity);
    return { noteOffs: offs, noteOns: ons };
  }

  // Section advance — only if chart has multiple sections
  if (note === CONFIG.sectionAdvanceNote) {
    const form = STATE.chart?.metadata.form;
    if (form && form.length > 1) {
      const offs = getNoteOffs();
      const ons = advanceSectionAndPlay(velocity);
      return { noteOffs: offs, noteOns: ons };
    }
    return { noteOffs: [], noteOns: [] };
  }

  // Solo note (any crash zone)
  if (CONFIG.soloNotes.includes(note)) {
    const soloOffs: NoteEvent[] = [];
    if (STATE.lastSoloNote != null) {
      soloOffs.push(noteOff(STATE.lastSoloNote, CONFIG.outputChannel));
    }
    const ons = playSoloNote(velocity);
    return { noteOffs: soloOffs, noteOns: ons };
  }

  // Everything else: ignore
  return { noteOffs: [], noteOns: [] };
}

// ─── Display helpers ──────────────────────────────────────────

export function getCurrentChordName(): string {
  const entry = getCurrentChordEntry();
  return entry?.chord ?? "—";
}

export function getProgressInfo(): string {
  if (!STATE.chart) return "No chart loaded";
  const form = STATE.chart.metadata.form;
  if (!form) return "No form";

  const section = getCurrentSection();
  const sectionName = section?.name ?? "?";
  const chordNum = Math.max(0, STATE.chordIndex) + 1;
  const chordTotal = section?.chords.length ?? 0;
  const formNum = STATE.formIndex + 1;
  const formTotal = form.length;

  return `${sectionName}: ${chordNum}/${chordTotal} | Form ${formNum}/${formTotal} | Pass ${STATE.formPassCount + 1}`;
}
