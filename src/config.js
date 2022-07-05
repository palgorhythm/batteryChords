module.exports = {
  CONFIG: {
    kickMidiNote: 60,
    snareMidiNote: 62,
    tomMidiNote: 64,
    keys: {
      cMajor:{root: 'c', scaleType: 'major', noteRange: [3,9]},
      dMajor:{root: 'd', scaleType: 'major', noteRange: [12,18]},
      eMajor:{root: 'e', scaleType: 'major', noteRange: [21,27]},
      fSharpMajor:{root: 'f#', scaleType: 'major', noteRange: [30,36]},
      gSharpMajor:{root: 'g#', scaleType: 'major', noteRange: [39,45]},
      aSharpMajor:{root: 'a#', scaleType: 'major', noteRange: [48,54]},
      bSharpMajor:{root: 'b', scaleType: 'major', noteRange: [57,63]},
      bSharpMajor:{root: 'c#', scaleType: 'major', noteRange: [66,72]},
    },
    chord: {
      octave: {
        min: 1,
        max: 6,
      },
      extensions: [0, 2, 4, 6, 8, 12],
    },
    scale: {
      numNotes: 7,
    }
  }
}