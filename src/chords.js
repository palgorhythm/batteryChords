const Scale = require('@tonaljs/scale')
const Note = require('@tonaljs/note')
const { CONFIG } = require('./config')

const _keyToNoteNameChords = ({root, scaleType}) => {
  const scale = Scale.get(root + ' ' + scaleType)
  const notes = scale.notes
  const chords = []
  for(let i = 0; i < notes.length; i ++){
    const chord = CONFIG.chord.extensions.map(ext => notes[(i + ext) % notes.length])
    chords.push(chord)
  }
  return chords
}

const _noteNameToMidi = ({note, octaveMin = CONFIG.chord.octave.min, octaveMax = CONFIG.chord.octave.max }) => {
  if(octaveMax < octaveMin){
    throw new Error('octaveMax must be >= octaveMin!')
  }
  const randomOctave = Math.round(octaveMin + (Math.random() * (octaveMax - octaveMin)))
  return Note.get(note + randomOctave).midi
}

const _noteNameChordToMidi = (noteNameChord) => {
  const midi = []
  for(let i = 0; i < noteNameChord.length; i ++){
    const note = noteNameChord[i]
    if(i === 0){
      midi.push(_noteNameToMidi({note, octaveMin: 2, octaveMax: 3}))
    } else if(i === noteNameChord.length - 1) {
      midi.push(_noteNameToMidi({note, octaveMin: 5, octaveMax: 7}))
    } else {
      midi.push(_noteNameToMidi({note, octaveMin: 4, octaveMax: 6}))
    }
  }
  return midi.sort((a,b) => a < b ? - 1 : 1)
}

const keyToMidiChords = ({root, scaleType}) => {
  const noteNameChords = _keyToNoteNameChords({root, scaleType})
  const midiChords = noteNameChords.map(chord => _noteNameChordToMidi(chord))
  return midiChords
}



module.exports = {keyToMidiChords}