const handle = ({note, velocity, channel}) => {
  console.log('handling', {note, velocity, channel})

  return {note, velocity, channel}
}


module.exports = { handle }