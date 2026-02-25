export interface KeyConfig {
  root: string;
  scaleType: string;
  noteRange: [number, number];
}

export const CONFIG = {
  kickMidiNote: 0,
  snareMidiNote: 1,
  tomMidiNote: 2,
  keys: {
    cMajor: { root: "C", scaleType: "major", noteRange: [27, 33] },
    dMajor: { root: "D", scaleType: "major", noteRange: [36, 42] },
    eMajor: { root: "E", scaleType: "major", noteRange: [45, 51] },
    fSharpMajor: { root: "F#", scaleType: "major", noteRange: [54, 60] },
    gSharpMajor: { root: "G#", scaleType: "major", noteRange: [63, 69] },
    bMajor: { root: "B", scaleType: "major", noteRange: [72, 78] },
    cSharpMajor: { root: "C#", scaleType: "major", noteRange: [81, 87] },
    aSharpMajor: { root: "A#", scaleType: "major", noteRange: [90, 96] },
  } as Record<string, KeyConfig>,
  bass: { octave: { min: 2, max: 3 } },
  chord: { octave: { min: 4, max: 6 }, extensions: [0, 2, 4, 6, 0, 2] },
  scale: { numNotes: 7 },
} as const;
