import Max from "max-api";
import { handle } from "./handler";
import { STATE } from "./state";

function log(msg: string): void {
  Max.post(msg);
  console.log(msg);
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

  // Send note-offs and remove from tracking
  const offSet = new Set(noteOffs.map((n) => n.note));
  for (const n of noteOffs) {
    Max.outlet([n.note, 0, n.channel]);
  }
  STATE.playingNotes = STATE.playingNotes.filter((n) => !offSet.has(n));

  // Send note-ons and track
  for (const n of noteOns) {
    Max.outlet([n.note, n.velocity, n.channel]);
    STATE.playingNotes.push(n.note);
  }
}

Max.addHandlers({
  [Max.MESSAGE_TYPES.ALL]: (_handled: boolean, ...args: number[]) => {
    const [, midiNote, midiVelocity, midiChannel] = args;

    // Guard: ignore non-MIDI messages
    if (typeof midiNote !== "number" || typeof midiVelocity !== "number") return;

    if (midiVelocity !== 0) {
      sendNoteOffs();
    }

    const notesToPlay = handle(midiNote, midiVelocity, midiChannel);
    const ons = notesToPlay.filter((n) => n.velocity !== 0).map((n) => n.note);
    if (ons.length) {
      log(`playing: ${ons.join(", ")}`);
    }

    sendNotes(notesToPlay);
  },
});

log("═══════════════════════════════════════");
log("batteryChords chord-selector loaded");
log(`Script: ${__filename}`);
log("═══════════════════════════════════════");
