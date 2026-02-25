import { randPick } from "../shared/midi";

/**
 * Auto-comp rhythmic patterns.
 *
 * Each pattern is an array of beat offsets (0-indexed within a chord's duration)
 * where the chord should be voiced/re-attacked.
 *
 * For a chord lasting 4 beats (1 bar in 4/4):
 *   [0]       = play on beat 1 only (whole notes)
 *   [0, 2]    = play on beats 1 and 3 (half notes)
 *   [0, 1, 2, 3] = play on every beat (quarter notes)
 *   [3]       = anticipated (play on beat 4, before the next chord)
 */

export type CompPattern = number[];

const COMP_PATTERNS_4BEAT: CompPattern[] = [
  [0],          // whole note — simple, open
  [0, 2],      // half notes — standard two-feel
  [0, 1.5],   // dotted quarter + eighth rest + ... — swing feel
  [0, 2.5],   // beat 1 and the "and" of beat 3 — charleston rhythm
  [0, 1, 2],  // 3 quarter notes + rest — driving
  [1, 3],     // beats 2 and 4 — backbeat comping
];

const COMP_PATTERNS_2BEAT: CompPattern[] = [
  [0],         // on the beat
  [0.5],      // pushed (on the "and")
  [0, 1],     // both beats
];

const COMP_PATTERNS_1BEAT: CompPattern[] = [
  [0],         // on the beat
  [0.5],      // pushed
];

export interface AutoCompState {
  enabled: boolean;
  beatCount: number;         // beats elapsed for current chord
  chordDuration: number;     // duration of current chord in beats
  pattern: CompPattern;      // current rhythmic pattern
  triggeredBeats: Set<number>; // which pattern beats have been triggered
}

export function createAutoCompState(): AutoCompState {
  return {
    enabled: false,
    beatCount: 0,
    chordDuration: 4,
    pattern: [0],
    triggeredBeats: new Set(),
  };
}

/** Pick a random comping pattern appropriate for the chord duration */
export function pickPattern(durationBeats: number): CompPattern {
  if (durationBeats <= 1) return randPick(COMP_PATTERNS_1BEAT);
  if (durationBeats <= 2) return randPick(COMP_PATTERNS_2BEAT);
  return randPick(COMP_PATTERNS_4BEAT);
}

/**
 * Called on each beat tick. Returns true if the chord should be
 * attacked/re-attacked on this beat.
 */
export function shouldTrigger(state: AutoCompState): boolean {
  for (const patternBeat of state.pattern) {
    if (
      !state.triggeredBeats.has(patternBeat) &&
      state.beatCount >= patternBeat &&
      state.beatCount < patternBeat + 1
    ) {
      state.triggeredBeats.add(patternBeat);
      return true;
    }
  }
  return false;
}

/** Reset for a new chord */
export function resetForNewChord(state: AutoCompState, durationBeats: number): void {
  state.beatCount = 0;
  state.chordDuration = durationBeats;
  state.pattern = pickPattern(durationBeats);
  state.triggeredBeats = new Set();
}
