const Scale = require('@tonaljs/scale')
const Note = require('@tonaljs/note')

const CONFIG = {
  octave: {
    min: 1,
    max: 6
  },
  numExtensions: 5
}

const getChords = ({root, scaleType}) => {
  const scale = Scale.get(root + ' ' + scaleType)
  const notes = scale.notes
  const chords = []
  for(let i = 0; i < notes.length; i ++){
    const extensions = Array.from({length: CONFIG.numExtensions}).map((_,idx) => idx * 2)
    const chord = extensions.map(ext => notes[(i + ext) % notes.length])
    chords.push(chord)
  }
  return chords
}

const _getMidiFromNote = ({note, octaveMin = CONFIG.octave.min, octaveMax = CONFIG.octave.max }) => {
  if(octaveMax < octaveMin){
    throw new Error('octaveMax must be >= octaveMin!')
  }
  const randomOctave = Math.round(octaveMin + (Math.random() * (octaveMax - octaveMin)))
  return Note.get(note + randomOctave).midi
}

const _getMidiFromChord = (notes) => {
  const midi = []
  for(let i = 0; i < notes.length; i ++){
    const note = notes[i]
    if(i === 0){
      midi.push(_getMidiFromNote({note, octaveMin: 2, octaveMax: 3}))
    } else {
      midi.push(_getMidiFromNote({note, octaveMin: 4, octaveMax: 6}))
    }
  }
  return midi
}




const chords = getChords({root: 'c', scaleType: 'major'})
const mappedChords = chords.map(chord => _getMidiFromChord(chord))
console.log(mappedChords)