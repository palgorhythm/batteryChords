import Max from "max-api";
import { readFileSync } from "fs";
import { resolve, isAbsolute } from "path";
import { parseChart } from "./chartParser";
import {
  handleMidi,
  advanceAndPlay,
  getNoteOffs,
  voicingToNoteEvents,
  getCurrentChordName,
  getProgressInfo,
} from "./handler";
import { CONFIG } from "./config";
import { STATE, resetState } from "./state";
import { shouldTrigger, resetForNewChord } from "./autoComp";

const PROJECT_ROOT = resolve(__dirname, "..");

function log(msg: string): void {
  Max.post(msg);
  console.log(msg);
}

// ─── Output helpers ───────────────────────────────────────────
// All MIDI goes out prefixed with "midi" so Max can route it.
// Display updates go out prefixed with "display" for chord name + keyboard.

function sendMidi(note: number, velocity: number, channel: number): void {
  Max.outlet(["midi", note, velocity, channel]);
}

function sendDisplay(): void {
  const name = getCurrentChordName();
  // Send chord name
  Max.outlet(["display", name]);
  // Send playing notes for keyboard display — "keys" followed by MIDI note numbers
  Max.outlet(["keys", ...STATE.playingNotes]);
}

function sendNoteOffs(): void {
  for (const note of STATE.playingNotes) {
    sendMidi(note, 0, CONFIG.outputChannel);
  }
  STATE.playingNotes = [];
  // Clear keyboard display
  Max.outlet(["keys"]);
}

function sendNoteEvents(
  noteOffs: { note: number; velocity: number; channel: number }[],
  noteOns: { note: number; velocity: number; channel: number }[]
): void {
  for (const n of noteOffs) {
    sendMidi(n.note, 0, n.channel);
  }
  const offSet = new Set(noteOffs.map((n) => n.note));
  STATE.playingNotes = STATE.playingNotes.filter((n) => !offSet.has(n));

  for (const n of noteOns) {
    sendMidi(n.note, n.velocity, n.channel);
    STATE.playingNotes.push(n.note);
  }

  // Update display after note changes
  if (noteOns.length > 0) {
    sendDisplay();
  }
}

function postChordInfo(): void {
  log(`[${getProgressInfo()}] ${getCurrentChordName()}`);
}

// ─── Path resolution ──────────────────────────────────────────

function resolveChartPath(filePath: string): string {
  if (isAbsolute(filePath)) return filePath;
  return resolve(PROJECT_ROOT, filePath);
}

// ─── Message handlers ─────────────────────────────────────────

Max.addHandler("loadChart", (filePath: string) => {
  loadChartFromPath(filePath);
});

Max.addHandler("autocomp", (enabled: number) => {
  STATE.autoComp.enabled = enabled === 1;
  log(`Auto-comp: ${STATE.autoComp.enabled ? "ON" : "OFF"}`);
  if (STATE.autoComp.enabled && STATE.chart && STATE.chordIndex >= 0) {
    const entry = STATE.chart.chords[STATE.chordIndex];
    resetForNewChord(STATE.autoComp, entry.durationBeats);
  }
});

Max.addHandler("beat", () => {
  if (!STATE.autoComp.enabled || !STATE.chart) return;

  if (shouldTrigger(STATE.autoComp)) {
    sendNoteOffs();
    if (STATE.currentVoicing) {
      const ons = voicingToNoteEvents(STATE.currentVoicing, CONFIG.autoCompVelocity);
      sendNoteEvents([], ons);
    }
  }

  STATE.autoComp.beatCount++;

  if (STATE.autoComp.beatCount >= STATE.autoComp.chordDuration) {
    sendNoteOffs();
    const ons = advanceAndPlay(CONFIG.autoCompVelocity);
    sendNoteEvents([], ons);
    postChordInfo();
    const entry = STATE.chart.chords[STATE.chordIndex];
    resetForNewChord(STATE.autoComp, entry.durationBeats);
  }
});

Max.addHandler("tempo", (bpm: number) => {
  STATE.tempo = bpm;
});

Max.addHandler("reset", () => {
  sendNoteOffs();
  resetState();
  Max.outlet(["display", "—"]);
  Max.outlet(["keys"]);
  log("Reset to start of chart");
});

Max.addHandler("triggerNote", (note: number) => {
  CONFIG.triggerNote = note;
  log(`Trigger note set to MIDI ${note}`);
});

Max.addHandler("soloPadStart", (note: number) => {
  CONFIG.soloPadStart = note;
  log(`Solo pad range: MIDI ${note}–${note + CONFIG.soloPadCount - 1}`);
});

Max.addHandler("soloPadCount", (count: number) => {
  CONFIG.soloPadCount = count;
  log(`Solo pad count: ${count}`);
});

// ─── MIDI input handler ───────────────────────────────────────

Max.addHandlers({
  [Max.MESSAGE_TYPES.ALL]: (handled: boolean, ...args: number[]) => {
    const [, midiNote, midiVelocity, midiChannel] = args;

    if (STATE.autoComp.enabled) {
      const soloEnd = CONFIG.soloPadStart + CONFIG.soloPadCount;
      if (
        midiVelocity > 0 &&
        midiNote >= CONFIG.soloPadStart &&
        midiNote < soloEnd
      ) {
        const { noteOns } = handleMidi(midiNote, midiVelocity, midiChannel);
        sendNoteEvents([], noteOns);
      }
      handled = true;
      return;
    }

    const { noteOffs, noteOns } = handleMidi(midiNote, midiVelocity, midiChannel);

    if (noteOns.length > 0) {
      postChordInfo();
    }

    sendNoteEvents(noteOffs, noteOns);
    handled = true;
  },
});

// ─── Startup ──────────────────────────────────────────────────

const BUILD_ID = Date.now().toString(36);

function loadChartFromPath(filePath: string): void {
  try {
    const absPath = resolveChartPath(filePath);
    log(`Loading chart: ${absPath}`);
    const text = readFileSync(absPath, "utf-8");
    const chart = parseChart(text);
    resetState();
    STATE.chart = chart;
    log(
      `Loaded: ${chart.metadata.title ?? filePath} — ${chart.chords.length} chords`
    );
    log(`Chords: ${chart.chords.map((c) => c.chord).join(" | ")}`);
    log(`Trigger: MIDI ${CONFIG.triggerNote} | Solo pads: MIDI ${CONFIG.soloPadStart}-${CONFIG.soloPadStart + CONFIG.soloPadCount - 1}`);
  } catch (err) {
    log(`ERROR loading chart: ${err}`);
  }
}

log("═══════════════════════════════════════");
log(`voiceLeader [build ${BUILD_ID}]`);
log("═══════════════════════════════════════");

const DEFAULT_CHART = "charts/giant-steps.chart";
loadChartFromPath(DEFAULT_CHART);
