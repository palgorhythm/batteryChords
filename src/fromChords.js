var chords = [[36,40,43,47,50], [36,38,44,47,55]] // C major (different possible versions)

function generateChord(){
  return chords[Math.round(Math.random() * (chords.length - 1))]
}