const Max = require("max-api");
const Handler = require("./handler");
const { STATE } = require("./state");

const sleep = async (ms = 1000) =>
  await new Promise((resolve) => setTimeout(resolve, 1000));

const _sendNotes = async (notesToPlay) => {
  notesToPlay.map((noteToPlay) => {
    Max.post("out", noteToPlay.note);
    Max.outlet([noteToPlay.note, noteToPlay.velocity, noteToPlay.channel]); // can do a an array here.
  });
  // TODO: gracefully silence each chord 1 second after it's played,
  // but DO NOT affect other chords
  // await sleep(1000)
  // const playingNotes = Array.from(STATE.playingNotes)
  // playingNotes.map(note => {
  //     Max.outlet([note, 0, 1]) // can do a an array here.
  //     Max.post('out noteoff', note)
  // })
};

const handlers = {
  [Max.MESSAGE_TYPES.ALL]: (handled, ...args) => {
    // Max.post("Script received a message!", args);
    const [, midiNote, midiVelocity, midiChannel] = args;
    isHolding = midiVelocity !== 0;
    const notesToPlay = Handler.handle({
      note: midiNote,
      velocity: midiVelocity,
      channel: midiChannel,
    });
    const noteOns = notesToPlay
      .filter((np) => np.velocity !== 0)
      .map((np) => np.note);
    if (noteOns.length) {
      Max.post("notes to play", noteOns);
    }
    _sendNotes(notesToPlay).then(() => {
      handled = true;
    });
  },
};

Max.addHandlers(handlers);
