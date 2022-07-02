var chords = [[36,40,43,47,50], [36,38,44,47,55]] // C major (different possible versions)

function generateChord(){
  return chords[Math.round(Math.random() * (chords.length - 1))]
}


// MIDI note 0 -> play kick (play whole chord)
// MIDI note 1 -> play snare (random note from top 2 notes of chord)
// MIDI note 2 -> play tom (random note from 2nd & 3rd notes of chord - assumes 5 note chords)
// MIDI notes 3-127 -> regenerate chord in scale using midi note as root
// SPD patch change -> set scale ???? TODO