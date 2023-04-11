module.exports = {
  CONFIG: {
    kickMidiNote: 0,
    snareMidiNote: 1,
    tomMidiNote: 2,
    keys: {
      cMajor: { root: "c", scaleType: "major", noteRange: [27, 33] },
      dMajor: { root: "d", scaleType: "major", noteRange: [36, 42] },
      eMajor: { root: "e", scaleType: "major", noteRange: [45, 51] },
      fSharpMajor: { root: "c", scaleType: "major", noteRange: [54, 60] },
      gSharpMajor: { root: "g#", scaleType: "major", noteRange: [63, 69] },
      aSharpMajor: { root: "a#", scaleType: "major", noteRange: [45, 51] },
      bSharpMajor: { root: "b", scaleType: "major", noteRange: [72, 78] },
      bSharpMajor: { root: "c#", scaleType: "major", noteRange: [81, 87] },
    },
    bass: {
      octave: {
        min: 2,
        max: 3,
      },
    },
    chord: {
      octave: {
        min: 4,
        max: 6,
      },
      extensions: [0, 2, 4, 6, 0, 2],
    },
    scale: {
      numNotes: 7,
    },
  },
};
