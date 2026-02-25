import Max from "max-api";
import { handle } from "./handler";
import { STATE } from "./state";

function log(msg: string): void {
  Max.post(msg);
  console.log(msg); // also shows in n4m.monitor
}

function sendNoteOffs(): void {
  for (const note of STATE.playingNotes) {
    Max.outlet([note, 0, 1]);
  }
  STATE.playingNotes = [];
}

function sendNotes(notes: { note: number; velocity: number; channel: number }[]): void {
  const noteOffs = notes.filter((n) => n.velocity === 0);
  const noteOns = notes.filter((n) => n.velocity !== 0);

  for (const n of noteOffs) {
    Max.outlet([n.note, 0, n.channel]);
  }
  for (const n of noteOns) {
    Max.outlet([n.note, n.velocity, n.channel]);
    STATE.playingNotes.push(n.note);
  }
}

Max.addHandlers({
  [Max.MESSAGE_TYPES.ALL]: (handled: boolean, ...args: number[]) => {
    const [, midiNote, midiVelocity, midiChannel] = args;
    const isNoteOn = midiVelocity !== 0;

    if (isNoteOn) {
      sendNoteOffs();
    }

    const notesToPlay = handle(midiNote, midiVelocity, midiChannel);
    const ons = notesToPlay.filter((n) => n.velocity !== 0).map((n) => n.note);
    if (ons.length) {
      log(`playing: ${ons.join(", ")}`);
    }

    sendNotes(notesToPlay);
    handled = true;
  },
});

log("═══════════════════════════════════════");
log("batteryChords chord-selector loaded");
log(`Script: ${__filename}`);
log("═══════════════════════════════════════");
