import type { NoteEvent } from "./types";

export function noteOn(note: number, velocity: number, channel = 1): NoteEvent {
  return { note, velocity, channel };
}

export function noteOff(note: number, channel = 1): NoteEvent {
  return { note, velocity: 0, channel };
}

export function allNotesOff(channel = 0): NoteEvent[] {
  return Array.from({ length: 128 }, (_, i) => noteOff(i, channel));
}

export function clampMidi(n: number): number {
  return Math.max(0, Math.min(127, Math.round(n)));
}

/** Find the closest octave transposition of `pitchClass` to `target` MIDI note */
export function closestOctave(
  pitchClass: number,
  target: number,
  minMidi: number,
  maxMidi: number
): number {
  const pc = ((pitchClass % 12) + 12) % 12;
  let best = -1;
  let bestDist = Infinity;
  for (let octave = 0; octave <= 10; octave++) {
    const midi = pc + octave * 12;
    if (midi < minMidi || midi > maxMidi) continue;
    const dist = Math.abs(midi - target);
    if (dist < bestDist) {
      bestDist = dist;
      best = midi;
    }
  }
  return best;
}

/** Pick a random integer in [min, max] inclusive */
export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Pick a random element from an array */
export function randPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Weighted random pick — weights[i] is the relative probability of index i */
export function weightedPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}
