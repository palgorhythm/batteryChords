const Max = require('max-api');
const Handler = require('./handler')

const handlers = {
  [Max.MESSAGE_TYPES.ALL]: (_, ...args) => {
    Max.post("Script received a message!", args);
    const [,midiNote,midiVelocity, midiChannel] = args
    const result = Handler.handle({note: midiNote, velocity: midiVelocity, channel: midiChannel})
    Max.post("Script Result", result);
    Max.outlet([result.note, result.velocity, result.channel]) // can do a an array here.
  }
};

Max.addHandlers(handlers);
